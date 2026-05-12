# Changelog

Tutte le modifiche importanti a questo progetto saranno documentate in questo file.

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
