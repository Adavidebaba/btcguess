import { getPublicKey, utils, Point } from '@noble/secp256k1';
import { createHash } from 'node:crypto';
import { base58check } from '@scure/base';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest();
const b58c = base58check(sha256);

const VERSION_P2PKH_MAINNET = 0x00;
const VERSION_WIF_MAINNET = 0x80;
const COMPRESSED_FLAG = 0x01;

export function hash160(bytes) {
  const sha = createHash('sha256').update(bytes).digest();
  return createHash('ripemd160').update(sha).digest();
}

export function hash160ToAddress(h160) {
  const payload = new Uint8Array(1 + h160.length);
  payload[0] = VERSION_P2PKH_MAINNET;
  payload.set(h160, 1);
  return b58c.encode(payload);
}

export function privKeyToWif(privKey, compressed) {
  const len = compressed ? 34 : 33;
  const payload = new Uint8Array(len);
  payload[0] = VERSION_WIF_MAINNET;
  payload.set(privKey, 1);
  if (compressed) payload[33] = COMPRESSED_FLAG;
  return b58c.encode(payload);
}

export function randomPrivKey() {
  return utils.randomPrivateKey();
}

export function deriveAll(privKey) {
  const p = Point.fromPrivateKey(privKey);
  const pubCompressed = p.toRawBytes(true);
  const pubUncompressed = p.toRawBytes(false);
  const h160c = hash160(pubCompressed);
  const h160u = hash160(pubUncompressed);
  return {
    privKey,
    pubCompressed,
    pubUncompressed,
    hash160Compressed: h160c,
    hash160Uncompressed: h160u,
  };
}

export function bytesToHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s;
}

export function hexToBytes(hex) {
  if (hex.length % 2) throw new Error('odd hex');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function wifToPrivKey(wif) {
  const payload = b58c.decode(wif);
  if (payload[0] !== VERSION_WIF_MAINNET) {
    throw new Error('not a mainnet WIF');
  }
  if (payload.length === 33) {
    return { privKey: payload.slice(1), compressed: false };
  }
  if (payload.length === 34 && payload[33] === COMPRESSED_FLAG) {
    return { privKey: payload.slice(1, 33), compressed: true };
  }
  throw new Error('invalid WIF length');
}

const HEX_RE = /^[0-9a-f]{64}$/i;
const WIF_RE = /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/;

export function parsePrivKey(input) {
  const s = input.trim().replace(/^0x/i, '');
  if (HEX_RE.test(s)) {
    return { privKey: hexToBytes(s.toLowerCase()), compressed: null, format: 'hex' };
  }
  if (WIF_RE.test(input.trim())) {
    const { privKey, compressed } = wifToPrivKey(input.trim());
    return { privKey, compressed, format: 'wif' };
  }
  throw new Error(
    'Unrecognised key format. Expected 64 hex characters or a Base58 WIF (starts with 5, K, or L).'
  );
}
