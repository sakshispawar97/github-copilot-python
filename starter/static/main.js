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

function showMessage(text, isSuccess = false) {
  const messageEl = getElement('message');
  if (!messageEl) return;

  messageEl.classList.toggle('success', isSuccess);
  messageEl.classList.toggle('error', !isSuccess && text.length > 0);
  messageEl.innerText = text;
}

function validateBoard(board) {
  if (!Array.isArray(board) || board.length !== SIZE) {
    return false;
  }

  return board.every((row) => Array.isArray(row)
    && row.length === SIZE
    && row.every((cell) => Number.isInteger(cell) && cell >= 0 && cell <= 9));
}

function validateCellValue(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 9 ? parsed : 0;
}

function isCellConflict(row, col, value) {
  if (!Number.isInteger(value) || value === 0) {
    return false;
  }

  for (let i = 0; i < SIZE; i++) {
    if (i !== col && puzzle[row][i] === value) {
      return true;
    }
  }

  for (let i = 0; i < SIZE; i++) {
    if (i !== row && puzzle[i][col] === value) {
      return true;
    }
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = startRow; i < startRow + 3; i++) {
    for (let j = startCol; j < startCol + 3; j++) {
      if ((i !== row || j !== col) && puzzle[i][j] === value) {
        return true;
      }
    }
  }

  return false;
}

function updateLiveConflictState() {
  const boardDiv = getElement('sudoku-board');
  if (!boardDiv) return;

  const inputs = boardDiv.getElementsByTagName('input');
  for (let idx = 0; idx < inputs.length; idx++) {
    const input = inputs[idx];
    if (input.disabled) continue;

    const row = Number(input.dataset.row);
    const col = Number(input.dataset.col);
    const value = input.value ? Number.parseInt(input.value, 10) : 0;
    const hasConflict = isCellConflict(row, col, value);
    input.classList.toggle('incorrect', hasConflict);

    if (hasConflict) {
      input.title = 'This value conflicts with the puzzle';
    } else {
      input.title = '';
    }
  }
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
  try {
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
  } catch (error) {
    console.error('Unable to load the leaderboard:', error);
  }
}

function saveLeaderboard(entry) {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    entries.push(entry);
    entries.sort((a, b) => a.time - b.time);
    const topTen = entries.slice(0, 10);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(topTen));
    loadLeaderboard();
  } catch (error) {
    console.error('Unable to save leaderboard entry:', error);
    showMessage('Unable to save the leaderboard right now.', false);
  }
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

        const row = Number(e.target.dataset.row);
        const col = Number(e.target.dataset.col);
        if (val !== '') {
          const numericValue = Number.parseInt(val, 10);
          if (!Number.isNaN(numericValue)) {
            puzzle[row][col] = numericValue;
          }
        } else {
          puzzle[row][col] = 0;
        }

        updateLiveConflictState();
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

function isBlockAlt(row, col) {
  const blockRow = Math.floor(row / 3);
  const blockCol = Math.floor(col / 3);
  return (blockRow + blockCol) % 2 === 1;
}

function applyCellClasses(input, row, col, isPrefilled, isHint, isIncorrect) {
  input.className = 'sudoku-cell';
  if (isBlockAlt(row, col)) {
    input.classList.add('is-alt');
  }
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
      const altBlockCheck = (Math.floor(i / 3) + Math.floor(j / 3)) % 2 === 1;
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        applyCellClasses(inp, i, j, true, isHintCell, false);
      } else {
        inp.value = '';
        inp.disabled = false;
        applyCellClasses(inp, i, j, false, false, false);
      }
      if (altBlockCheck) {
        inp.classList.add('is-alt');
      }
    }
  }
  updateHintButtonState();
}

async function newGame() {
  try {
    const difficultySelect = getElement('difficulty');
    if (difficultySelect) {
      difficulty = difficultySelect.value;
    }
    resetGameState();

    const res = await fetch(`/new?difficulty=${difficulty}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    renderPuzzle(data.puzzle);
    showMessage('', false);
    startTimer();
  } catch (error) {
    console.error('Unable to start a new game:', error);
    showMessage('Unable to start a new game.', false);
  }
}

async function checkSolution() {
  const boardDiv = getElement('sudoku-board');
  if (!boardDiv) return;

  try {
    const inputs = boardDiv.getElementsByTagName('input');
    const board = [];
    for (let i = 0; i < SIZE; i++) {
      board[i] = [];
      for (let j = 0; j < SIZE; j++) {
        const idx = i * SIZE + j;
        const val = inputs[idx].value;
        board[i][j] = validateCellValue(val);
      }
    }

    if (!validateBoard(board)) {
      throw new Error('Invalid board values detected.');
    }

    const res = await fetch('/check', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({board})
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    const incorrect = new Set(data.incorrect.map(x => x[0] * SIZE + x[1]));
    for (let idx = 0; idx < inputs.length; idx++) {
      const inp = inputs[idx];
      const row = Math.floor(idx / SIZE);
      const col = idx % SIZE;
      const blockPattern = (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 1;
      if (inp.disabled) {
        const isHintCell = hintedCells.has(idx);
        if (incorrect.has(idx) && !isHintCell) {
          applyCellClasses(inp, row, col, true, false, true);
        } else if (isHintCell) {
          applyCellClasses(inp, row, col, false, true, false);
        } else {
          applyCellClasses(inp, row, col, true, false, false);
        }
        if (blockPattern) {
          inp.classList.add('is-alt');
        }
        continue;
      }
      inp.className = 'sudoku-cell';
      if (blockPattern) {
        inp.classList.add('is-alt');
      }
      if (incorrect.has(idx)) {
        inp.classList.add('incorrect');
      }
    }

    if (data.completed) {
      stopTimer();
      const elapsed = Math.floor((Date.now() - timerStart) / 1000);
      const name = window.prompt('Congratulations! Enter your name for the leaderboard:');
      if (name && name.trim()) {
        saveLeaderboard({name: name.trim(), time: elapsed, difficulty, hintsUsed});
      }
      showMessage('Congratulations! You solved it!', true);
    } else {
      showMessage('Some cells are incorrect.', false);
    }
  } catch (error) {
    console.error('Unexpected error while checking the solution:', error);
    showMessage(error.message || 'Unable to check the solution.', false);
  }
}

async function requestHint() {
  const hintButton = getElement('hint');
  if (hintButton && hintButton.disabled) return;

  try {
    const res = await fetch('/hint');
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
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
    applyCellClasses(input, data.row, data.col, false, true, false);
    hintsUsed += 1;
    showMessage(`Hint used at row ${data.row + 1}, column ${data.col + 1}`, false);
    updateHintButtonState();
  } catch (error) {
    console.error('Unable to request a hint:', error);
    showMessage(error.message || 'Unable to get a hint.', false);
    updateHintButtonState();
  }
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