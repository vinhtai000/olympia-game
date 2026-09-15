const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'questions.json');

const LEVEL_FLOOR = {
  primary: 1,
  secondary: 6,
  highschool: 10
};

const LEVEL_GRADES = {
  primary: [1, 2, 3, 4, 5],
  secondary: [6, 7, 8, 9],
  highschool: [10, 11, 12]
};

function load() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function levelForGrade(grade) {
  for (const [level, grades] of Object.entries(LEVEL_GRADES)) {
    if (grades.includes(Number(grade))) return level;
  }
  return null;
}

// Per RPD 1: pool = [max(grade-2, levelFloor), grade]
function gradeRangeFor(grade) {
  const g = Number(grade);
  const level = levelForGrade(g);
  const floor = LEVEL_FLOOR[level] ?? g;
  const min = Math.max(g - 2, floor);
  const range = [];
  for (let i = min; i <= g; i++) range.push(i);
  return { level, range };
}

function getQuestionPool(grade, round) {
  const data = load();
  const { level, range } = gradeRangeFor(grade);
  const levelData = data[level] || {};

  if (round === 'obstacle') {
    // Obstacle course is one puzzle per game; prefer the selected grade's
    // puzzle, fall back to the closest lower grade in range that has one.
    for (let i = range.length - 1; i >= 0; i--) {
      const g = range[i];
      if (levelData[g] && levelData[g].obstacle) return levelData[g].obstacle;
    }
    return null;
  }

  let pool = [];
  range.forEach((g) => {
    const gradeData = levelData[g];
    if (gradeData && Array.isArray(gradeData[round])) {
      pool = pool.concat(gradeData[round]);
    }
  });
  return pool;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Admin CRUD ----

function listQuestions(level, grade, round) {
  const data = load();
  if (!level) return data;
  if (!grade) return data[level] || {};
  if (!round) return (data[level] && data[level][grade]) || {};
  return (data[level] && data[level][grade] && data[level][grade][round]) || null;
}

function addQuestion(level, grade, round, question) {
  const data = load();
  data[level] = data[level] || {};
  data[level][grade] = data[level][grade] || {
    warmup: [],
    obstacle: null,
    acceleration: [],
    finish: []
  };

  if (round === 'obstacle') {
    data[level][grade].obstacle = question;
  } else {
    data[level][grade][round] = data[level][grade][round] || [];
    data[level][grade][round].push(question);
  }
  save(data);
  return question;
}

function updateQuestion(level, grade, round, id, updates) {
  const data = load();
  const gradeData = data[level] && data[level][grade];
  if (!gradeData) return null;

  if (round === 'obstacle') {
    if (gradeData.obstacle && gradeData.obstacle.id === id) {
      gradeData.obstacle = { ...gradeData.obstacle, ...updates };
      save(data);
      return gradeData.obstacle;
    }
    return null;
  }

  const arr = gradeData[round] || [];
  const idx = arr.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...updates };
  save(data);
  return arr[idx];
}

function deleteQuestion(level, grade, round, id) {
  const data = load();
  const gradeData = data[level] && data[level][grade];
  if (!gradeData) return false;

  if (round === 'obstacle') {
    if (gradeData.obstacle && gradeData.obstacle.id === id) {
      gradeData.obstacle = null;
      save(data);
      return true;
    }
    return false;
  }

  const arr = gradeData[round] || [];
  const idx = arr.findIndex((q) => q.id === id);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  save(data);
  return true;
}

module.exports = {
  LEVEL_FLOOR,
  LEVEL_GRADES,
  levelForGrade,
  gradeRangeFor,
  getQuestionPool,
  shuffle,
  listQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion
};
