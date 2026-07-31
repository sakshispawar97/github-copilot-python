import copy
import random

SIZE = 9
EMPTY = 0

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def fill_board(board):
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
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    remove_cells(board, clues)
    puzzle = deep_copy(board)
    return puzzle, solution
