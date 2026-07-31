// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
const LEADERBOARD_KEY = 'sudoku-leaderboard';
const THEME_KEY = 'sudoku-theme';
let puzzle = [];
let difficulty = 'medium';
let hintsUsed = 0;
let hintedCells = new Set();
let timerStart = null;
let timerInterval = null;

function getElement(id) {
  return document.getElementById(id);
}

function setTheme(theme) {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('theme-dark', normalizedTheme === 'dark');
  document.body.classList.toggle('theme-light', normalizedTheme === 'light');
  const themeToggle = getElement('theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = normalizedTheme === 'dark' ? 'Light mode' : 'Dark mode';
    themeToggle.setAttribute('aria-label', normalizedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  localStorage.setItem(THEME_KEY, normalizedTheme);
}

function initializeTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  } catch (error) {
    setTheme('light');
  }
}

function loadLeaderboard() {
  const list = getElement('leaderboard-list');
  if (!list) return;

  const raw = localStorage.getItem(LEADERBOARD_KEY);
  const entries = raw ? JSON.parse(raw) : [];
  list.innerHTML = '';
  entries.slice(0, 10).forEach((entry, index) => {
    const item = document.createElement('li');
    item.innerText = `${index + 1}. ${entry.name} - ${entry.time}s - ${entry.difficulty} - hints: ${entry.hintsUsed}`;
    list.appendChild(item);
  });
}

function saveLeaderboard(entry) {
  const raw = localStorage.getItem(LEADERBOARD_KEY);
  const entries = raw ? JSON.parse(raw) : [];
  entries.push(entry);
  entries.sort((a, b) => a.time - b.time);
  const topTen = entries.slice(0, 10);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(topTen));
  loadLeaderboard();
}

function startTimer() {
  timerStart = Date.now();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - timerStart) / 1000);
    const timerEl = getElement('timer');
    if (timerEl) {
      timerEl.innerText = `Time: ${elapsed}s`;
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function resetGameState() {
  hintsUsed = 0;
  hintedCells.clear();
  stopTimer();
  const timerEl = getElement('timer');
  if (timerEl) {
    timerEl.innerText = 'Time: 0s';
  }
}

function createBoardElement() {
  const boardDiv = getElement('sudoku-board');
  if (!boardDiv) return;

  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function updateHintButtonState() {
  const hintButton = getElement('hint');
  if (!hintButton) return;

  const hasEmptyCell = puzzle.some(row => row.some(cell => cell === 0));
  hintButton.disabled = !hasEmptyCell;
}

function applyCellClasses(input, isPrefilled, isHint, isIncorrect) {
  input.className = 'sudoku-cell';
  if (isPrefilled) {
    input.classList.add('prefilled');
  }
  if (isHint) {
    input.classList.add('hint-cell');
  }
  if (isIncorrect) {
    input.classList.add('incorrect');
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const boardDiv = getElement('sudoku-board');
  if (!boardDiv) return;

  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      const isHintCell = hintedCells.has(idx);
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        applyCellClasses(inp, true, isHintCell, false);
      } else {
        inp.value = '';
        inp.disabled = false;
        applyCellClasses(inp, false, false, false);
      }
    }
  }
  updateHintButtonState();
}

async function newGame() {
  const difficultySelect = getElement('difficulty');
  if (difficultySelect) {
    difficulty = difficultySelect.value;
  }
  resetGameState();
  const res = await fetch(`/new?difficulty=${difficulty}`);
  const data = await res.json();
  renderPuzzle(data.puzzle);
  const messageEl = getElement('message');
  if (messageEl) {
    messageEl.innerText = '';
  }
  startTimer();
}

async function checkSolution() {
  const boardDiv = getElement('sudoku-board');
  if (!boardDiv) return;

  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = getElement('message');
  if (!msg) return;

  if (data.error) {
    msg.classList.remove('success');
    msg.classList.add('error');
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) {
      const isHintCell = hintedCells.has(idx);
      if (incorrect.has(idx) && !isHintCell) {
        applyCellClasses(inp, true, false, true);
      } else if (isHintCell) {
        applyCellClasses(inp, false, true, false);
      }
      continue;
    }
    inp.className = 'sudoku-cell';
    if (incorrect.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }
  if (data.completed) {
    stopTimer();
    const elapsed = Math.floor((Date.now() - timerStart) / 1000);
    const name = window.prompt('Congratulations! Enter your name for the leaderboard:');
    if (name && name.trim()) {
      saveLeaderboard({name: name.trim(), time: elapsed, difficulty, hintsUsed});
    }
    msg.classList.remove('error');
    msg.classList.add('success');
    msg.innerText = 'Congratulations! You solved it!';
  } else {
    msg.classList.remove('success');
    msg.classList.add('error');
    msg.innerText = 'Some cells are incorrect.';
  }
}

async function requestHint() {
  const hintButton = getElement('hint');
  if (hintButton && hintButton.disabled) return;

  const res = await fetch('/hint');
  const data = await res.json();
  const messageEl = getElement('message');
  if (!messageEl) return;

  if (data.error) {
    messageEl.innerText = data.error;
    updateHintButtonState();
    return;
  }
  const boardDiv = getElement('sudoku-board');
  if (!boardDiv) return;

  const idx = data.row * SIZE + data.col;
  const inputs = boardDiv.getElementsByTagName('input');
  const input = inputs[idx];
  if (!input) return;

  input.value = data.value;
  input.disabled = true;
  puzzle[data.row][data.col] = data.value;
  hintedCells.add(idx);
  applyCellClasses(input, false, true, false);
  hintsUsed += 1;
  messageEl.innerText = `Hint used at row ${data.row + 1}, column ${data.col + 1}`;
  updateHintButtonState();
}

function initApp() {
  const newGameButton = getElement('new-game');
  const checkButton = getElement('check-solution');
  const hintButton = getElement('hint');
  const themeToggle = getElement('theme-toggle');

  if (newGameButton) newGameButton.addEventListener('click', newGame);
  if (checkButton) checkButton.addEventListener('click', checkSolution);
  if (hintButton) hintButton.addEventListener('click', requestHint);
  updateHintButtonState();
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }

  loadLeaderboard();
  initializeTheme();
  newGame();
}

// Wire buttons after the DOM is ready.
document.addEventListener('DOMContentLoaded', initApp);