import * as zlib from 'node:zlib';

// PZstandard uses a 12-byte skippable frame with the next frame's byte length.
// Node 24's decoder returns only the first frame (empty for a skippable header).
// Decode each explicitly sized frame, never silently return an empty archive.
// Format: https://github.com/facebook/zstd/blob/dev/contrib/pzstd/README.md
export function decompressArchive(bytes) {
  if (!zlib.zstdDecompressSync) throw Error('Offline archive importer needs Node 24 with built-in Zstandard');
  if (bytes.length < 4) throw Error('Truncated Zstandard archive');
  if (bytes.readUInt32LE(0) !== 0x184d2a50) {
    const result = zlib.zstdDecompressSync(bytes);
    if (!result.length) throw Error('Empty/unsupported Zstandard archive');
    return result;
  }
  let offset = 0;
  const parts = [];
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length || bytes.readUInt32LE(offset) !== 0x184d2a50 || bytes.readUInt32LE(offset + 4) !== 4)
      throw Error('Invalid PZstandard frame header');
    const size = bytes.readUInt32LE(offset + 8), end = offset + 12 + size;
    if (!size || end > bytes.length) throw Error('Truncated PZstandard frame');
    parts.push(zlib.zstdDecompressSync(bytes.subarray(offset + 12, end)));
    offset = end;
  }
  return Buffer.concat(parts);
}
