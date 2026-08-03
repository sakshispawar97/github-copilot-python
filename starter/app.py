from flask import Flask, render_template, jsonify, request

try:
    from . import sudoku_logic
except ImportError:  # pragma: no cover - allows running app.py directly
    import sudoku_logic

app = Flask(__name__, template_folder='templates', static_folder='static')

# Keep a simple in-memory store for the active puzzle and related metadata.
CURRENT = {
    'puzzle': None,
    'solution': None,
    'difficulty': 'medium',
    'hints_used': 0,
    'started_at': None
}


def normalize_difficulty(value):
    """Return a supported difficulty label or fall back to medium.

    Args:
        value (str | None): Difficulty requested by the client.

    Returns:
        str: The normalized difficulty name.
    """
    difficulty = str(value or 'medium').strip().lower()
    if difficulty in {'easy', 'medium', 'hard'}:
        return difficulty
    return 'medium'


def get_clue_count(difficulty):
    """Return the starting clue count used to generate a puzzle.

    Args:
        difficulty (str): Difficulty label such as easy, medium, or hard.

    Returns:
        int: Number of given clues for the requested difficulty.
    """
    difficulty_map = {
        'easy': 38,
        'medium': 32,
        'hard': 27,
    }
    normalized = normalize_difficulty(difficulty)
    return difficulty_map.get(normalized, 32)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/new')
def new_game():
    """Create a new puzzle for the selected difficulty.

    The route preserves the current Flask project structure while validating the
    incoming difficulty and clue values before generating a new board.
    """
    difficulty = normalize_difficulty(request.args.get('difficulty', 'medium'))

    try:
        clues_text = request.args.get('clues')
        clues = int(clues_text) if clues_text is not None else get_clue_count(difficulty)
    except (TypeError, ValueError):
        clues = get_clue_count(difficulty)

    if clues < 17 or clues > 81:
        clues = get_clue_count(difficulty)

    try:
        puzzle, solution = sudoku_logic.generate_puzzle(clues)
    except Exception:
        app.logger.exception('Puzzle generation failed for difficulty=%s with clues=%s', difficulty, clues)
        return jsonify({'error': 'Unable to generate a new puzzle.'}), 500

    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    CURRENT['difficulty'] = difficulty
    CURRENT['hints_used'] = 0
    CURRENT['started_at'] = None
    return jsonify({'puzzle': puzzle, 'difficulty': CURRENT['difficulty']})


@app.route('/hint')
def give_hint():
    """Return the next empty cell solved value for the active board."""
    puzzle = CURRENT.get('puzzle')
    solution = CURRENT.get('solution')
    if not puzzle or not solution:
        return jsonify({'error': 'No game in progress'}), 400

    try:
        for row in range(sudoku_logic.SIZE):
            for col in range(sudoku_logic.SIZE):
                if puzzle[row][col] == 0:
                    puzzle[row][col] = solution[row][col]
                    CURRENT['hints_used'] += 1
                    return jsonify({'row': row, 'col': col, 'value': solution[row][col]})
    except Exception:
        app.logger.exception('Hint generation failed while reading the active board')
        return jsonify({'error': 'Unable to provide a hint.'}), 500

    return jsonify({'error': 'No empty cells remain'}), 400


@app.route('/check', methods=['POST'])
def check_solution():
    """Validate a submitted board against the active solution.

    The endpoint keeps the original response contract so the front-end behavior
    remains unchanged, but it now validates malformed input before processing.
    """
    data = request.get_json(silent=True) or {}
    board = data.get('board')
    solution = CURRENT.get('solution')

    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400

    if not isinstance(board, list) or len(board) != sudoku_logic.SIZE:
        return jsonify({'error': 'Invalid board data'}), 400

    try:
        incorrect = []
        for i in range(sudoku_logic.SIZE):
            row = board[i]
            if not isinstance(row, list) or len(row) != sudoku_logic.SIZE:
                return jsonify({'error': 'Invalid board data'}), 400
            for j in range(sudoku_logic.SIZE):
                if row[j] != solution[i][j]:
                    incorrect.append([i, j])
    except (IndexError, TypeError):
        app.logger.exception('Invalid board payload submitted during solution check')
        return jsonify({'error': 'Invalid board data'}), 400
    except Exception:
        app.logger.exception('Unexpected error while checking the solution')
        return jsonify({'error': 'Unable to check the solution.'}), 500

    if not incorrect:
        return jsonify({'incorrect': [], 'completed': True, 'difficulty': CURRENT['difficulty'], 'hints_used': CURRENT['hints_used']})
    return jsonify({'incorrect': incorrect, 'completed': False})


if __name__ == '__main__':
    app.run(debug=True)