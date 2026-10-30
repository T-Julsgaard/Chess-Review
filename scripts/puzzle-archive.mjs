import {constants, zstdDecompressSync} from 'node:zlib';

// Node 24 can stop after the first of several concatenated Zstd frames. Decode
// each frame explicitly using the consumed byte count; retain the download cap.
export async function readPuzzleArchive(body, maxBytes) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of body) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw Error('Archive exceeded download budget');
    chunks.push(chunk);
  }
  const archive = Buffer.concat(chunks);
  return {bytes, *frames() {
    let offset = 0;
    while (offset < archive.length) {
      const remaining = archive.subarray(offset);
      if (remaining.length < 8) return;
      if ((remaining.readUInt32LE(0) & 0xfffffff0) === 0x184d2a50) {
        const skip = 8 + remaining.readUInt32LE(4);
        if (skip > 1024 * 1024) throw Error('Unexpected archive metadata size');
        if (skip > remaining.length) return;
        offset += skip;
        continue;
      }
      let decoded;
      try {
        // This download is deliberately a bounded prefix. Allow an incomplete
        // last frame to flush decoded rows instead of discarding earlier frames
        // on Node 24. The importer admits only complete, validated CSV records.
        decoded = zstdDecompressSync(remaining, {info: true,
          finishFlush: constants.ZSTD_e_flush, maxOutputLength: 512 * 1024 * 1024});
      }
      catch (error) {
        // The bounded range can end in a partial final frame. Completed frames
        // remain usable; the importer still requires its full selection quota.
        if (error.code === 'Z_BUF_ERROR') return;
        throw error;
      }
      const consumed = decoded.engine.bytesWritten;
      if (!Number.isSafeInteger(consumed) || consumed <= 0 || consumed > remaining.length) throw Error('Invalid archive frame size');
      offset += consumed;
      yield decoded.buffer;
    }
  }};
}
