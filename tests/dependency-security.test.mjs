import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import forge from 'node-forge';
import {patchRsaSource} from '../scripts/patch-node-forge.mjs';

const require = createRequire(import.meta.url);
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
