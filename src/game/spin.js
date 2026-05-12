/**
 * Un singolo spin: genera una chiave, deriva entrambe le forme di indirizzo,
 * controlla contro il set di Satoshi.
 * 
 * Puro calcolo, nessun DOM, nessuna animazione.
 * Adattato dalla repo originale per uso server-side (sincrono).
 */
import { deriveAll, randomPrivKey, bytesToHex, hash160ToAddress } from './crypto.js';
import { checkHash160s } from './wallets.js';

export function spin(forcePrivKey = null) {
  const privKey = forcePrivKey || randomPrivKey();
  const derived = deriveAll(privKey);
  const candidates = [derived.hash160Uncompressed, derived.hash160Compressed];
  const hit = checkHash160s(candidates);

  let match = hit;
  if (hit !== null) {
    match = {
      ...hit,
      address: hash160ToAddress(hit.hash160)
    };
  }

  return {
    win: hit !== null,
    privKey,
    privKeyHex: bytesToHex(privKey),
    derived,
    match,
  };
}
