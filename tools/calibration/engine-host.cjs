// Load the unmodified upstream CommonJS asset despite the repository's ESM type.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const filename = path.resolve(process.argv[2]);
const bundled = new Module(filename, module);
bundled.filename = filename;
bundled.paths = Module._nodeModulePaths(path.dirname(filename));
// Activate upstream's own CLI, including its asynchronous command queue.
process.argv = [process.execPath, filename];
process.mainModule = bundled;
bundled._compile(fs.readFileSync(filename, 'utf8'), filename);
