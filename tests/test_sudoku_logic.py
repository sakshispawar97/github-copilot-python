import pytest

from starter import sudoku_logic


def test_generate_puzzle_returns_board_and_solution():
    puzzle, solution = sudoku_logic.generate_puzzle(clues=35)

    assert isinstance(puzzle, list)
    assert isinstance(solution, list)
    assert len(puzzle) == sudoku_logic.SIZE
    assert len(solution) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert all(len(row) == sudoku_logic.SIZE for row in solution)
    assert all(value in range(0, sudoku_logic.SIZE + 1) for row in puzzle for value in row)
    assert all(value in range(1, sudoku_logic.SIZE + 1) for row in solution for row_values in solution for value in row_values)


def test_is_safe_rejects_conflicting_values():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 5

    assert sudoku_logic.is_safe(board, 0, 1, 5) is False
    assert sudoku_logic.is_safe(board, 1, 0, 5) is False
    assert sudoku_logic.is_safe(board, 0, 1, 4) is True


def test_generated_puzzle_has_a_single_unique_solution():
    puzzle, solution = sudoku_logic.generate_puzzle(clues=35)

    assert sudoku_logic.count_solutions(puzzle, limit=2) == 1
    assert puzzle != solution
