/**
 * Derivazione incrementale delle chiavi secp256k1.
 *
 * P(k + step) = P(k) + step·G
 * Una sola conversione affine per chiave, poi serializzazione compressed
 * e uncompressed dagli stessi (x, y).
 */
import { Point } from '@noble/secp256k1';
import { hash160 } from './crypto.js';

export const SECP256K1_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

export function bytesToBigInt(bytes) {
  let value = 0n;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return value;
}

export function bigIntToBytes(value, out) {
  let temp = value;
  for (let i = out.length - 1; i >= 0; i--) {
    out[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
  return out;
}

function write32BE(out, offset, value) {
  let temp = value;
  for (let i = offset + 31; i >= offset; i--) {
    out[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
}

function serializeCompressed(x, y) {
  const out = new Uint8Array(33);
  out[0] = (y & 1n) === 1n ? 0x03 : 0x02;
  write32BE(out, 1, x);
  return out;
}

function serializeUncompressed(x, y) {
  const out = new Uint8Array(65);
  out[0] = 0x04;
  write32BE(out, 1, x);
  write32BE(out, 33, y);
  return out;
}

function hashesFromPoint(point, privKey) {
  const { x, y } = point.toAffine();
  const pubCompressed = serializeCompressed(x, y);
  const pubUncompressed = serializeUncompressed(x, y);
  return {
    privKey,
    pubCompressed,
    pubUncompressed,
    hash160Compressed: hash160(pubCompressed),
    hash160Uncompressed: hash160(pubUncompressed),
  };
}

export class IncrementalDeriver {
  /**
   * @param {Uint8Array} keyBytes buffer da 32 byte, mutato in-place
   * @param {number} step passo di striding (>= 1)
   */
  constructor(keyBytes, step) {
    this._keyBytes = keyBytes;
    this._point = Point.fromPrivateKey(keyBytes);
    this.setStep(step);
  }

  setStep(step) {
    const nextStep = Math.max(1, Number(step) || 1);
    this._step = nextStep;
    this._delta = Point.BASE.multiply(BigInt(nextStep));
  }

  current() {
    return hashesFromPoint(this._point, this._keyBytes);
  }

  /** Avanza di `step` chiavi, con wrap modulo n. */
  next() {
    let key = bytesToBigInt(this._keyBytes) + BigInt(this._step);
    let wrapped = false;
    if (key >= SECP256K1_N) {
      key %= SECP256K1_N;
      wrapped = true;
    }
    if (key === 0n) {
      key = 1n;
      wrapped = true;
    }
    bigIntToBytes(key, this._keyBytes);

    if (wrapped) {
      this._point = Point.fromPrivateKey(this._keyBytes);
    } else {
      this._point = this._point.add(this._delta);
    }
  }
}
