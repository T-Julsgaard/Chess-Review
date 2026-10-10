"""Fetch pinned software, extracting only two modules and their license, never examples/games."""
import hashlib, io, json, pathlib, tarfile, urllib.request
url = 'https://files.pythonhosted.org/packages/93/09/7d04d7581ae3bb8b598017941781bceb7959dd1b13e3ebf7b6a2cd843bc9/chess-1.11.2.tar.gz'
expected = 'a8b43e5678fdb3000695bdaa573117ad683761e5ca38e591c4826eba6d25bb39'
out = pathlib.Path(__file__).resolve().parent.parent / 'vendor'
archive = pathlib.Path('research/runs/E141/dependencies/chess-1.11.2.tar.gz')
archive.parent.mkdir(parents=True, exist_ok=True)
data = archive.read_bytes() if archive.exists() else urllib.request.urlopen(url, timeout=15).read()
assert hashlib.sha256(data).hexdigest() == expected
archive.write_bytes(data)
files = {}
with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as tar:
    for source, destination in [('chess/__init__.py', 'chess/__init__.py'), ('chess/syzygy.py', 'chess/syzygy.py'), ('LICENSE.txt', 'COPYING')]:
        member = tar.getmember('chess-1.11.2/' + source)
        assert member.isfile()
        content = tar.extractfile(member).read()
        target = out / destination
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        files[destination] = hashlib.sha256(content).hexdigest()
(out / 'dependency.json').write_text(json.dumps({'package': 'chess', 'version': '1.11.2', 'license': 'GPL-3.0-or-later', 'url': url, 'archiveSha256': expected, 'files': files}, indent=2) + '\n', encoding='utf8')
print(json.dumps({'package': 'chess', 'version': '1.11.2', 'modules': 2, 'licenseRetained': True}))
