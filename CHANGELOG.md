# Changelog

Tutte le modifiche importanti a questo progetto saranno documentate in questo file.

## [Ottimizzazione calcolo] - 2026-08-31
### Modificato
- Lookup runtime: Bloom + tabella sostituiti da Map esatta `hash160 → saldo` (stessi match, niente falsi positivi).
- Worker: derivazione EC incrementale `P(k+step)=P(k)+step·G` al posto di `Point.fromPrivateKey` a ogni spin.
### Aggiunto
- `scripts/benchmark-baseline.js` (`npm run benchmark`).
- Test di equivalenza Map (tutti i wallet) e derivazione incrementale (striding, wrap modulo n).
### Performance (Mac ARM64, Node 20)
- ~6× su 1 worker (~3.100 → ~18.200 spin/s), ~5× su 8 worker (~13.500 → ~65.400 spin/s).

## [Iniziale] - 2026-05-12

### Aggiunto
- Inizializzazione repository
- Motore base di ricerca

## [Ottimizzazione Motore] - 2026-05-12
### Modificato
- `crypto.js`: rimosso calcolo Base58 ad ogni ciclo, sostituito `crypto.getRandomValues` con `utils.randomPrivateKey()` di secp256k1.
- `spin.js`: calcolo Base58 delegato solo per i match positivi.
- `stats-manager.js`: rimozione array `_spinWindow` a favore di contatori int per SPS e RAM.
- `spin-engine.js` / `config.js`: aggiunta searchMode `sequential` con incremento BigInt della private key per ricerca non puramente randomica.
- Progetto iniziale di btcguess containerizzato.
- Motore di ricerca headless basato su Node.js (`spin-engine.js`).
- Gestione persistenza e statistiche (`stats-manager.js`, `persistence-manager.js`).
- API web per l'interfaccia e la dashboard.
- Configurazione Docker (`docker-compose.yml`, `Dockerfile`).
