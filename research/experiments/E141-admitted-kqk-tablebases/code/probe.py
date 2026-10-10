# SPDX-License-Identifier: GPL-3.0-or-later
# Separate research probe program, using unmodified python-chess. License: ../vendor/COPYING.
import hashlib, json, pathlib, platform, sys
request = json.load(sys.stdin)
vendor = pathlib.Path(__file__).resolve().parent.parent / 'vendor'
dependency = json.loads((vendor / 'dependency.json').read_text(encoding='utf8'))
for name, expected in dependency['files'].items():
    assert hashlib.sha256((vendor / name).read_bytes()).hexdigest() == expected
sys.path.insert(0, str(vendor))
import chess
import chess.syzygy
assert chess.__version__ == '1.11.2'
assert pathlib.Path(chess.__file__).resolve() == (vendor / 'chess/__init__.py').resolve()
directory = pathlib.Path(request['directory']).resolve()
table_hashes = {}
for name, expected in request['files'].items():
    raw = (directory / name).read_bytes()
    assert len(raw) == expected['bytes'] and hashlib.sha256(raw).hexdigest() == expected['sha256']
    table_hashes[name] = expected['sha256']
input_data = request['input']
history = input_data.get('history')
board = chess.Board(history['fen'] if history else input_data['fen'])
for uci in history['moves'] if history else []:
    assert not board.is_game_over(claim_draw=True)
    move = chess.Move.from_uci(uci)
    assert move in board.legal_moves
    board.push(move)
assert board.is_valid() and board.fen() == input_data['fen'] and not board.castling_rights and board.ep_square is None
assert len(board.piece_map()) in [2, 3] and chess.popcount(board.kings) == 2 and all(p.piece_type in [chess.KING, chess.QUEEN] for p in board.piece_map().values())
def flags():
    return {'checkmate': board.is_checkmate(), 'stalemate': board.is_stalemate(), 'insufficient': board.is_insufficient_material()}
with chess.syzygy.open_tablebase(str(directory)) as tables:
    def observe():
        return {'fen': board.fen(), 'wdl': tables.probe_wdl(board), 'dtz': tables.probe_dtz(board), 'flags': flags()}
    root = observe()
    rows = []
    for move in sorted(board.legal_moves, key=lambda m: m.uci()):
        san = board.san(move)
        zeroing = board.is_zeroing(move)
        board.push(move)
        try:
            rows.append({'move': move.uci(), 'san': san, 'zeroing': zeroing, **observe()})
        finally:
            board.pop()
executable = pathlib.Path(sys.executable)
print(json.dumps({'schema': 'local-syzygy-kqk-panel-v1', 'observationKind': 'local-syzygy', 'status': 'complete', 'root': root, 'rows': rows, 'positionProbes': 1 + len(rows), 'ruleModel': 'WDL50 zero-counter model; DTZ50 with possible one-ply rounding', 'metadata': {'package': 'chess', 'version': chess.__version__, 'modules': dependency['files'], 'tables': table_hashes, 'python': {'version': sys.version, 'implementation': platform.python_implementation(), 'executable': str(executable), 'sha256': hashlib.sha256(executable.read_bytes()).hexdigest()}}}))
