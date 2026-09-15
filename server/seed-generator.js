/**
 * One-off generator for a starter questions.json seed file.
 * Produces placeholder-but-usable sample questions for every grade 1-12,
 * across all 4 rounds, so the app is playable out of the box.
 * Admins can edit/replace everything afterwards through the Admin Panel.
 */
const fs = require('fs');
const path = require('path');

const SUBJECTS = ['Toán', 'Văn', 'Tiếng Anh', 'Khoa học', 'Lịch sử', 'Địa lý'];

function warmupSet(grade) {
  const items = [];
  for (let i = 1; i <= 8; i++) {
    items.push({
      id: `g${grade}-wu-${i}`,
      text: `[Lớp ${grade}] Câu hỏi khởi động số ${i} (${SUBJECTS[i % SUBJECTS.length]})`,
      answer: `Đáp án ${i}`
    });
  }
  return items;
}

function obstacleSet(grade) {
  return {
    id: `g${grade}-cnv`,
    secretPhrase: `TỪ KHÓA LỚP ${grade}`,
    imageHint: `Hình ảnh gợi ý cho lớp ${grade}`,
    rows: [1, 2, 3, 4, 5].map((r) => ({
      id: `g${grade}-cnv-row-${r}`,
      clue: `[Lớp ${grade}] Gợi ý hàng ngang số ${r}`,
      answer: `Đáp án hàng ${r}`
    }))
  };
}

function accelerationSet(grade) {
  const items = [];
  for (let i = 1; i <= 4; i++) {
    items.push({
      id: `g${grade}-tt-${i}`,
      text: `[Lớp ${grade}] Câu hỏi tăng tốc số ${i}`,
      image: null,
      options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
      answer: 'Phương án A',
      timeLimitSeconds: 30
    });
  }
  return items;
}

function finishSet(grade) {
  const packs = [10, 20, 30];
  const items = [];
  packs.forEach((pts, packIdx) => {
    for (let i = 1; i <= 3; i++) {
      items.push({
        id: `g${grade}-vd-${pts}-${i}`,
        points: pts,
        text: `[Lớp ${grade}] Câu hỏi ${pts} điểm số ${i}`,
        answer: `Đáp án ${pts}-${i}`
      });
    }
  });
  return items;
}

const levels = {
  primary: [1, 2, 3, 4, 5],
  secondary: [6, 7, 8, 9],
  highschool: [10, 11, 12]
};

const data = {};
for (const [level, grades] of Object.entries(levels)) {
  data[level] = {};
  for (const g of grades) {
    data[level][g] = {
      warmup: warmupSet(g),
      obstacle: obstacleSet(g),
      acceleration: accelerationSet(g),
      finish: finishSet(g)
    };
  }
}

fs.writeFileSync(
  path.join(__dirname, 'questions.json'),
  JSON.stringify(data, null, 2),
  'utf-8'
);

console.log('questions.json generated.');
