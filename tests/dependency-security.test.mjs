import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import forge from 'node-forge';
import {patchRsaSource} from '../scripts/patch-node-forge.mjs';

const require = createRequire(import.meta.url);
const fxRequire = createRequire(require.resolve('fx-runner'));
const {quote, parse} = fxRequire('shell-quote');
const {SourceMapConsumer} = require('source-map-js');

test('Firefox runner quoting rejects line terminators after a comment token', () => {
  for (const terminator of ['\n', '\r', '\u2028', '\u2029']) {
    assert.throws(() => quote(['echo', 'ok', {comment: 'x'}, `a${terminator}id;#`]), TypeError);
    assert.throws(() => quote(parse('echo http://example.com/#frag').concat(`a${terminator}id;#`)), TypeError);
  }
  assert.deepEqual(parse(quote(['firefox', '--profile', 'path with spaces'])),
    ['firefox', '--profile', 'path with spaces']);
});

test('indexed source maps reject excessive section offsets and preserve valid maps', () => {
  const map = {version: 3, sources: ['input.js'], names: [], mappings: 'AAAA'};
  const indexed = line => ({version: 3, sections: [{offset: {line, column: 0}, map}]});
  assert.throws(() => new SourceMapConsumer(indexed(1e12)), /Section offset line must not exceed/);
  const consumer = new SourceMapConsumer(indexed(1));
  assert.deepEqual(consumer.originalPositionFor({line: 2, column: 1}),
    {source: 'input.js', line: 1, column: 0, name: null});
});

const {privateKey: pem} = generateKeyPairSync('rsa', {
  modulusLength: 1024, publicExponent: 3,
  privateKeyEncoding: {type: 'pkcs1', format: 'pem'},
  publicKeyEncoding: {type: 'spki', format: 'pem'},
});
const privateKey = forge.pki.privateKeyFromPem(pem);
const publicKey = forge.pki.rsa.setPublicKey(privateKey.n, privateKey.e);
const digest = forge.md.sha256.create().update('dependency security regression').digest().getBytes();
const asn1 = forge.asn1;
const element = (type, value, constructed = false) => asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);

function signDigestInfo({withNull = true, extra = false} = {}) {
  const algorithm = [element(asn1.Type.OID, asn1.oidToDer(forge.pki.oids.sha256).getBytes())];
  if (withNull) algorithm.push(element(asn1.Type.NULL, ''));
  if (extra) algorithm.push(element(asn1.Type.OCTETSTRING, 'attacker-controlled nested garbage'));
  const info = element(asn1.Type.SEQUENCE, [
    element(asn1.Type.SEQUENCE, algorithm, true), element(asn1.Type.OCTETSTRING, digest),
  ], true);
  // Sign an intentionally malformed encoding to exercise the real RSA verifier,
  // rather than only testing the ASN.1 parser or the patch text.
  return privateKey.sign(asn1.toDer(info).getBytes(), 'NONE');
}

test('RSA verification rejects extra nested DigestAlgorithm elements', () => {
  for (const withNull of [true, false]) {
    assert.throws(() => publicKey.verify(digest, signDigestInfo({withNull, extra: true})), /DigestInfo/);
  }
});

test('RSA verification preserves valid encodings and rejects a different message', () => {
  for (const withNull of [true, false]) {
    const signature = signDigestInfo({withNull});
    assert.equal(publicKey.verify(digest, signature), true);
    assert.equal(publicKey.verify('different digest', signature), false);
  }
});

test('the installation backport is idempotent and rejects unexpected RSA source', async () => {
  const source = await readFile(require.resolve('node-forge/lib/rsa.js'), 'utf8');
  const original = source.replace(
    "obj.value.length !== 2 ||\n            obj.value[0].value.length !==\n            (('parameters' in capture) ? 2 : 1)) {",
    'obj.value.length !== 2) {',
  );
  assert.notEqual(original, source, 'The installed dependency must contain the backport');
  assert.equal(patchRsaSource(original), source);
  assert.equal(patchRsaSource(original.replace(/\n/g, '\r\n')), source);
  assert.equal(patchRsaSource(source), source);
  assert.throws(() => patchRsaSource(source + '\n// changed source'), /Unexpected node-forge RSA source/);
  assert.throws(() => patchRsaSource(''), /Unexpected node-forge RSA source/);
});
