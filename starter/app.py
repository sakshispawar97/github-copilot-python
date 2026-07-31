from flask import Flask, render_template, jsonify, request

try:
    from . import sudoku_logic
except ImportError:  # pragma: no cover - allows running app.py directly
    import sudoku_logic

app = Flask(__name__, template_folder='templates', static_folder='static')

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None,
    'difficulty': 'medium',
    'hints_used': 0,
    'started_at': None
}


def get_clue_count(difficulty):
    difficulty_map = {
        'easy': 38,
        'medium': 32,
        'hard': 27,
    }
    return difficulty_map.get(difficulty.lower(), 32)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    difficulty = request.args.get('difficulty', 'medium')
    clues = int(request.args.get('clues', get_clue_count(difficulty)))
    puzzle, solution = sudoku_logic.generate_puzzle(clues)
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    CURRENT['difficulty'] = difficulty.lower()
    CURRENT['hints_used'] = 0
    CURRENT['started_at'] = None
    return jsonify({'puzzle': puzzle, 'difficulty': CURRENT['difficulty']})


@app.route('/hint')
def give_hint():
    puzzle = CURRENT.get('puzzle')
    solution = CURRENT.get('solution')
    if not puzzle or not solution:
        return jsonify({'error': 'No game in progress'}), 400

    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if puzzle[row][col] == 0:
                puzzle[row][col] = solution[row][col]
                CURRENT['hints_used'] += 1
                return jsonify({'row': row, 'col': col, 'value': solution[row][col]})

    return jsonify({'error': 'No empty cells remain'}), 400

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.json
    board = data.get('board')
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    if not incorrect:
        return jsonify({'incorrect': [], 'completed': True, 'difficulty': CURRENT['difficulty'], 'hints_used': CURRENT['hints_used']})
    return jsonify({'incorrect': incorrect, 'completed': False})

if __name__ == '__main__':
    app.run(debug=True)