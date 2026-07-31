import pytest

from starter import app as flask_app


@pytest.fixture
def client():
    flask_app.app.config['TESTING'] = True
    flask_app.CURRENT['puzzle'] = None
    flask_app.CURRENT['solution'] = None
    with flask_app.app.test_client() as client:
        yield client


def test_index_page_loads(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b'Sudoku' in response.data.lower() or b'game' in response.data.lower()


def test_new_game_returns_puzzle(client):
    response = client.get('/new?clues=35')
    assert response.status_code == 200
    payload = response.get_json()
    assert 'puzzle' in payload
    assert len(payload['puzzle']) == 9


def test_new_game_accepts_difficulty(client):
    response = client.get('/new?difficulty=easy')
    assert response.status_code == 200
    payload = response.get_json()
    assert 'puzzle' in payload


def test_hint_returns_correct_value(client):
    client.get('/new?difficulty=easy')
    response = client.get('/hint')
    assert response.status_code == 200
    payload = response.get_json()
    assert 'row' in payload and 'col' in payload and 'value' in payload


def test_hint_repeatedly_fills_distinct_empty_cells(client):
    client.get('/new?difficulty=easy')

    first = client.get('/hint')
    assert first.status_code == 200
    first_payload = first.get_json()
    assert first_payload['row'] >= 0 and first_payload['col'] >= 0

    second = client.get('/hint')
    assert second.status_code == 200
    second_payload = second.get_json()
    assert (second_payload['row'], second_payload['col']) != (first_payload['row'], first_payload['col'])

    board = flask_app.CURRENT['puzzle']
    assert board[first_payload['row']][first_payload['col']] == first_payload['value']
    assert board[second_payload['row']][second_payload['col']] == second_payload['value']


def test_check_solution_requires_active_game(client):
    response = client.post('/check', json={'board': [[0] * 9 for _ in range(9)]})
    assert response.status_code == 400
    assert 'error' in response.get_json()
