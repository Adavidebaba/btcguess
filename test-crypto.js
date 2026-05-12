import { deriveAll, hexToBytes, hash160ToAddress, bytesToHex } from './src/game/crypto.js';

// Test Vector (Chiave privata conosciuta)
const testPrivKeyHex = '0C28FCA386C7A227600B2FE50B7CAE11EC86D3BF1FBE471BE89827E19D72AA1D';
const expectedUncompressedAddress = '16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM';

const privKeyBytes = hexToBytes(testPrivKeyHex);
const derived = deriveAll(privKeyBytes);

const calculatedAddress = hash160ToAddress(derived.hash160Uncompressed);

console.log('--- TEST CRITTOGRAFICO ---');
console.log('Chiave Privata:  ', testPrivKeyHex);
console.log('Indirizzo Atteso: ', expectedUncompressedAddress);
console.log('Indirizzo Calcolato:', calculatedAddress);

if (calculatedAddress === expectedUncompressedAddress) {
  console.log('✅ TEST SUPERATO! Le ottimizzazioni crittografiche generano chiavi Bitcoin matematicamente perfette.');
} else {
  console.log('❌ ERRORE: Calcolo non corrispondente.');
}
