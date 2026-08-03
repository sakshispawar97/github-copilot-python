"""Core Sudoku generation and validation helpers.

The puzzle generator builds a solved board, removes cells while maintaining a
single valid solution, and exposes the result as a puzzle plus the final answer.
"""

import copy
import random

SIZE = 9
EMPTY = 0


def deep_copy(board):
    """Return a full copy of a Sudoku board.

    Args:
        board (list[list[int]]): A 9x9 Sudoku board.

    Returns:
        list[list[int]]: A deep-copied board.
    """
    return copy.deepcopy(board)


def create_empty_board():
    """Create a blank 9x9 Sudoku board.

    Returns:
        list[list[int]]: A 9x9 board filled with zero values.
    """
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def is_safe(board, row, col, num):
    """Check whether placing a value would violate Sudoku rules.

    A move is valid only when the value is absent from the target row, column,
    and the current 3x3 sub-grid.

    Args:
        board (list[list[int]]): Current board state.
        row (int): Target row index.
        col (int): Target column index.
        num (int): Candidate value to test.

    Returns:
        bool: True when the move is valid, otherwise False.
    """
    if board is None or not isinstance(row, int) or not isinstance(col, int):
        return False

    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False

    # Sudoku grids are split into 3x3 blocks. The top-left of each block is
    # calculated by rounding the row and column down to the nearest multiple of 3.
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True


def fill_board(board):
    """Recursively fill the board using backtracking.

    The algorithm attempts each candidate in a random order to reduce bias in the
    generated puzzle while solving the board. When a dead end is reached, it
    backtracks and tries another value.

    Args:
        board (list[list[int]]): Empty or partially-filled board.

    Returns:
        bool: True when the board has been solved.
    """
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def count_solutions(board, limit=2):
    """Count how many valid completions exist up to the provided limit.

    This is used to decide whether a clue can be removed while preserving a
    unique Sudoku solution. The search stops early once the limit is reached.

    Args:
        board (list[list[int]]): Puzzle board to evaluate.
        limit (int): Maximum number of solutions to count.

    Returns:
        int: Number of valid solutions found, capped by the limit.
    """
    board_copy = deep_copy(board)

    def search(remaining):
        if remaining >= limit:
            return remaining

        for row in range(SIZE):
            for col in range(SIZE):
                if board_copy[row][col] == EMPTY:
                    for candidate in range(1, SIZE + 1):
                        if is_safe(board_copy, row, col, candidate):
                            board_copy[row][col] = candidate
                            remaining = search(remaining)
                            board_copy[row][col] = EMPTY
                            if remaining >= limit:
                                return remaining
                    return remaining
        return remaining + 1

    return search(0)


def remove_cells(board, clues):
    """Remove numbers from a solved board until the clue count is reached.

    Each candidate removal is kept only if the puzzle still has exactly one valid
    solution; this ensures the final puzzle is solvable and unique.

    Args:
        board (list[list[int]]): A solved board.
        clues (int): Desired number of starting clues.
    """
    target_removed = SIZE * SIZE - clues
    cells = list(range(SIZE * SIZE))
    random.shuffle(cells)
    removed = 0

    for cell_index in cells:
        if removed >= target_removed:
            break

        row, col = divmod(cell_index, SIZE)
        if board[row][col] == EMPTY:
            continue

        original_value = board[row][col]
        board[row][col] = EMPTY
        if count_solutions(board, limit=2) != 1:
            board[row][col] = original_value
            continue

        removed += 1


def generate_puzzle(clues=35):
    """Generate a puzzle and its unique solution.

    Args:
        clues (int): Number of filled cells to leave in the final puzzle.

    Returns:
        tuple[list[list[int]], list[list[int]]]: A puzzle and the solved board.
    """
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    remove_cells(board, clues)
    puzzle = deep_copy(board)
    return puzzle, solution
