/**
 * Configurazione centralizzata.
 * Tutti i parametri sono sovrascrivibili via variabili d'ambiente.
 */
const config = {
  // Spin engine
  spinDelayMs: parseInt(process.env.SPIN_DELAY_MS ?? '0', 10),
  statsLogIntervalSec: parseInt(process.env.STATS_LOG_INTERVAL_SEC ?? '30', 10),
  persistIntervalSec: parseInt(process.env.PERSIST_INTERVAL_SEC ?? '60', 10),

  // Web dashboard
  webPort: parseInt(process.env.WEB_PORT ?? '3000', 10),

  // Percorsi dati
  dataDir: process.env.DATA_DIR ?? './generated-data',
  persistDir: process.env.PERSIST_DIR ?? './persistent',
  walletsCsv: process.env.WALLETS_CSV ?? './data/wallets.csv',

  // Pushover (opzionale)
  pushoverUserKey: process.env.PUSHOVER_USER_KEY ?? '',
  pushoverApiToken: process.env.PUSHOVER_API_TOKEN ?? '',

  // Test: forza un match fittizio al primo spin per verificare salvataggio
  testMatch: process.env.TEST_MATCH === '1',
};

export default config;
