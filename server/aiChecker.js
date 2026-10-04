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

  const MAX_RETRIES = 2;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
      if (attempt < MAX_RETRIES) {
        console.warn(`[aiChecker] Attempt ${attempt} failed, retrying in 1s:`, err.message);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  console.error('[aiChecker] All retries failed, using fallback matching:', lastErr?.message);
  const correct = fallbackCheck(questionText, studentAnswer, correctAnswer);
  // If fallback also cannot confirm correct, flag aiError so callers can offer a retry
  return { correct, aiError: !correct, reason: correct ? 'Chính xác (fallback)' : 'Sai (AI lỗi - fallback)' };
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

function fallbackCheck(questionText, studentAnswer, correctAnswer) {
  const normStudent = normalize(studentAnswer);
  const normCorrect = normalize(correctAnswer);

  if (!normStudent) return false;
  if (normStudent === normCorrect) return true;

  // Extract pure digits
  const studentDigits = (studentAnswer.match(/\d+/g) || []).join('');
  const correctDigits = (correctAnswer.match(/\d+/g) || []).join('');
  if (studentDigits && correctDigits && studentDigits === correctDigits) {
    return true;
  }

  // Vietnamese number words: "mười" = "10", "bảy" = "7", etc.
  const VN_NUMBERS = {
    'khong': '0', 'mot': '1', 'hai': '2', 'ba': '3', 'bon': '4',
    'nam': '5', 'sau': '6', 'bay': '7', 'tam': '8', 'chin': '9', 'muoi': '10'
  };
  const convertedStudent = VN_NUMBERS[normStudent] || normStudent;
  const convertedCorrect = VN_NUMBERS[normCorrect] || normCorrect;
  if (convertedStudent === convertedCorrect) return true;
  if (correctDigits && convertedStudent === correctDigits) return true;
  if (studentDigits && convertedCorrect === studentDigits) return true;

  // Substring match prefix/suffix
  if (normStudent.length >= 2 && normCorrect.startsWith(normStudent)) {
    return true;
  }
  if (normCorrect.length >= 2 && normStudent.startsWith(normCorrect)) {
    return true;
  }

  // Strip common Vietnamese noun classifiers and unit suffixes
  const strippedCorrect = normCorrect
    .replace(/^(con|cay|hoa|qua|trai|dong|thanhpho|tinh|nuoc|nguoi)/, '')
    .replace(/(ngon|ngontay|ngay|nam|thang|tuoi|diem|kg|km|m|cm|lit)$/, '')
    .trim();
  const strippedStudent = normStudent
    .replace(/^(con|cay|hoa|qua|trai|dong|thanhpho|tinh|nuoc|nguoi)/, '')
    .replace(/(ngon|ngontay|ngay|nam|thang|tuoi|diem|kg|km|m|cm|lit)$/, '')
    .trim();

  if (strippedStudent && (strippedStudent === strippedCorrect || strippedCorrect.includes(strippedStudent))) {
    return true;
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
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Gemini request timed out')); });
    req.write(body);
    req.end();
  });
}

module.exports = { check, fallbackCheck, normalize };
