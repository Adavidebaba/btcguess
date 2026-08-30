import { deriveAll, hexToBytes, hash160ToAddress } from './src/game/crypto.js';

// Test Vector ufficiale Bitcoin (Chiave privata conosciuta: WIF 5J3mBbAH58CpQ3Y5RNJpUKPE62SQ5tfcvU2JpbnkeyhfsYB1Jcn)
const testPrivKeyHex = '18E14A7B6A307F426A94F8114701E7C8E774E7F9A47E2C2035DB29A206321725';
const expectedUncompressedAddress = '16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM';

const privKeyBytes = hexToBytes(testPrivKeyHex);
const derived = deriveAll(privKeyBytes);

const calculatedAddress = hash160ToAddress(derived.hash160Uncompressed);

console.log('--- TEST CRITTOGRAFICO ---');
console.log('Chiave Privata:     ', testPrivKeyHex);
console.log('Indirizzo Atteso:   ', expectedUncompressedAddress);
console.log('Indirizzo Calcolato:', calculatedAddress);

if (calculatedAddress === expectedUncompressedAddress) {
  console.log('✅ TEST SUPERATO! Le ottimizzazioni crittografiche generano chiavi Bitcoin matematicamente perfette.');
} else {
  console.log('❌ ERRORE: Calcolo non corrispondente.');
  process.exit(1);
}
