# Changelog

Tutte le modifiche importanti a questo progetto saranno documentate in questo file.

## [Supporto Mac Intel & Auto-bootstrap] - 2026-10-28
### Aggiunto
- `avvia_nativo_intel.command`: script nativo con auto-download di Node.js x86_64 per Mac mini Intel i5 dual core.

### Modificato
- `avvia_nativo.command`: rilevamento automatico architettura (`arm64` / `x86_64`) con setup trasparente di Node.js.

## [Fix Delay & Modalità Nativa Mac] - 2026-10-28
### Corretto
- `src/engine/spin-engine.js`: rimosso richiamo non supportato `this._pool.setDelay` prevenendo il crash da dashboard.

### Modificato
- `avvia_nativo.command` e `ferma_nativo.command`: ripristinati e configurati con supporto al percorso Node.js nativo locale per esecuzione bare-metal su macOS.

## [Configurazione .env & Report Pushover] - 2026-08-31
### Aggiunto
- File `.env` centralizzato con parametri `CPU_PERCENTAGE` (default 25%), `PUSHOVER_USER_KEY`, `PUSHOVER_API_TOKEN` e `PUSHOVER_REPORT_DAYS` (default 3 giorni).
- Modello `.env.example` per facilitare nuove installazioni.
- Notifica periodica di progresso e stato scansione via Pushover ogni N giorni con salvataggio persistente del timestamp `lastReportTime`.
- Test unitari dedicati a `NotificationManager`, `StatsManager` e caricamento `.env`.

### Modificato
- `src/config.js`: caricamento automatico di `.env` tramite `process.loadEnvFile`.
- `avvia_nativo.command` e `docker-compose.yml`: aggiornati per caricare la configurazione dal file `.env`.
- `.gitignore`: escluso il file `.env` per sicurezza.

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
