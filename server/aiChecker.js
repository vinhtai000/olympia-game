/**
 * aiChecker.js
 * Uses Google Gemini API to evaluate whether a student's answer is
 * approximately correct (ignoring minor spelling/case/punctuation differences).
 */

const https = require('https');

const API_URL_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

/**
 * Check if studentAnswer is approximately correct for the given question.
 * Uses smart heuristic matching first (instant), then consults Gemini AI for flexible evaluation.
 *
 * @param {string} questionText   The question text shown to the player
 * @param {string} studentAnswer  What the player typed
 * @param {string} correctAnswer  The expected correct answer
 * @returns {Promise<{correct: boolean, reason: string}>}
 */
async function check(questionText, studentAnswer, correctAnswer) {
  // 1. Fast heuristic check: if it obviously matches, return immediately (zero latency, rock solid)
  if (fallbackCheck(questionText, studentAnswer, correctAnswer)) {
    return { correct: true, reason: 'Chính xác' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { correct: false, reason: 'Sai (không khớp)' };
  }

  const prompt = `You are a judge for a Vietnamese academic quiz show.

Question: "${questionText}"
Original/Official Answer: "${correctAnswer}"
Contestant's Answer: "${studentAnswer}"

Your task is to evaluate whether the contestant's answer is CORRECT in terms of content and meaning.

CASES YOU MUST ACCEPT AS CORRECT:
1. Numbers written as words or vice versa (e.g., "bảy" = "7", "mười" = "10", "10" for "10 ngón").
2. Omission of grammatical categories, classifiers, or filler words (e.g., answering "hướng dương" for "hoa hướng dương", "bò" for "con bò", "Hà Nội" for "Thành phố Hà Nội").
3. Missing units of measurement (e.g., "7" instead of "7 ngày", "10" instead of "10 ngón", "3" instead of "3 nguyên tử").
4. Synonymous, equivalent expressions, or other recognized alternative names.

CASES THAT ARE INCORRECT:
- Factual errors, incorrect essence, incorrect data, incorrect proper nouns.
- Confusion with a completely different concept.
- Vague and unclear answers (e.g., answering "Màu xanh" is not accepted if the answer is "Xanh lá" or "Xanh dương").

Respond ONLY with a valid JSON result:
{"correct": true}
or
{"correct": false}`;

  const MAX_ATTEMPTS = 3;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await callGemini(apiKey, prompt);
      if (result?.error) {
        throw new Error(result.error.message || 'Gemini API returned error');
      }
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*?\}/);
      if (!match) {
        throw new Error('No JSON object found in Gemini response: ' + text.slice(0, 100));
      }
      const parsed = JSON.parse(match[0]);
      return { correct: !!parsed.correct, reason: parsed.reason || '', aiError: false };
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[aiChecker] Attempt ${attempt} failed, retrying in 800ms:`, err.message);
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }

  // If AI finally cannot check in time, check the input answer with the answer in questionbank
  console.warn('[aiChecker] AI could not respond in time after all retries, falling back to questionbank matching:', lastErr?.message);
  const matched = fallbackCheck(questionText, studentAnswer, correctAnswer);
  return {
    correct: matched,
    aiError: false,
    reason: matched ? 'Chính xác (đối chiếu ngân hàng câu hỏi)' : 'Chưa chính xác (đối chiếu ngân hàng câu hỏi)'
  };
}

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

const VN_NUMBER_WORDS = {
  'không': '0', 'khong': '0', '0': '0',
  'một': '1', 'mot': '1', '1': '1',
  'hai': '2', '2': '2',
  'ba': '3', '3': '3',
  'bốn': '4', 'bon': '4', 'tư': '4', '4': '4',
  'năm': '5', '5': '5',
  'sáu': '6', 'sau': '6', '6': '6',
  'bảy': '7', 'bẩy': '7', '7': '7',
  'tám': '8', 'tam': '8', '8': '8',
  'chín': '9', 'chin': '9', '9': '9',
  'mười': '10', 'muoi': '10', '10': '10'
};

function stripClassifiers(str) {
  return String(str || '')
    .trim()
    .replace(/^(bông hoa|hoa|cây|con|quả|trái|dòng sông|sông|dãy núi|núi|ngọn núi|đỉnh|hồ|vịnh|đảo|thành phố|tp\.?|tỉnh|nước|quốc gia|vua|bác|chủ tịch)\s+/i, '')
    .trim();
}

function stripUnits(str) {
  return String(str || '')
    .trim()
    .replace(/\s+(ngón tay|ngón|ngày|năm|tháng|mùa|cạnh|màu|tuổi|tỉnh thành|tỉnh|độ c|độ|lít|kg|km|m|cm|mm)$/i, '')
    .trim();
}

function getCandidateAnswers(rawCorrect) {
  const candidates = [rawCorrect];
  const match = String(rawCorrect || '').match(/^([^(]+)\(([^)]+)\)$/);
  if (match) {
    candidates.push(match[1].trim());
    candidates.push(match[2].trim());
  }
  return candidates;
}

function fallbackCheck(questionText, studentAnswer, correctAnswer) {
  const sRaw = String(studentAnswer || '').trim();
  if (!sRaw) return false;

  const sNorm = normalize(sRaw);
  if (!sNorm) return false;

  const sCleanNorm = normalize(stripClassifiers(sRaw));
  const sNum = VN_NUMBER_WORDS[stripUnits(sRaw).toLowerCase()] || null;

  const candidates = getCandidateAnswers(correctAnswer);

  for (const cRaw of candidates) {
    const cNorm = normalize(cRaw);
    if (!cNorm) continue;
    if (sNorm === cNorm) return true;

    // Classifier-stripped strict equality (e.g. "Hoa hướng dương" vs "Hướng dương")
    const cCleanNorm = normalize(stripClassifiers(cRaw));
    if (cCleanNorm && (sCleanNorm === cCleanNorm || sNorm === cCleanNorm || sCleanNorm === cNorm)) {
      return true;
    }

    // Number word / digit equality (e.g. "bảy" vs "7 ngày", "10" vs "10 ngón")
    const cNum = VN_NUMBER_WORDS[stripUnits(cRaw).toLowerCase()] || null;
    if (sNum && cNum && sNum === cNum) return true;
    if (sNum && sNum === cNorm) return true;
    if (cNum && cNum === sNorm) return true;
  }

  return false;
}

function callGemini(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json'
      }
    });

    const url = `${API_URL_BASE}?key=${apiKey}`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON from Gemini: ' + data.slice(0, 250)));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(4500, () => { req.destroy(); reject(new Error('Gemini request timed out')); });
    req.write(body);
    req.end();
  });
}

module.exports = { check, fallbackCheck, isDirectMatch: fallbackCheck, normalize };
