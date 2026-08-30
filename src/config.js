/**
 * Configurazione centralizzata dell'applicazione.
 * Supporta caricamento automatico da file .env e variabili d'ambiente di sistema.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Carica automaticamente .env se presente nell'ambiente Node
if (typeof process.loadEnvFile === 'function') {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignora se già caricato o non leggibile
    }
  }
}

const config = {
  // Spin engine & multi-threading
  spinDelayMs: parseInt(process.env.SPIN_DELAY_MS ?? '0', 10),
  cpuPercentage: parseInt(process.env.CPU_PERCENTAGE ?? '25', 10),
  statsLogIntervalSec: parseInt(process.env.STATS_LOG_INTERVAL_SEC ?? '30', 10),
  persistIntervalSec: parseInt(process.env.PERSIST_INTERVAL_SEC ?? '60', 10),
  searchMode: process.env.SEARCH_MODE ?? 'chunked', // 'chunked' con zero duplicati

  // Web dashboard
  webPort: parseInt(process.env.WEB_PORT ?? '3000', 10),

  // Percorsi dati
  dataDir: process.env.DATA_DIR ?? './generated-data',
  persistDir: process.env.PERSIST_DIR ?? './persistent',
  walletsCsv: process.env.WALLETS_CSV ?? './data/wallets.csv',

  // Pushover (notifiche istantanee e report periodico)
  pushoverUserKey: process.env.PUSHOVER_USER_KEY ?? '',
  pushoverApiToken: process.env.PUSHOVER_API_TOKEN ?? '',
  pushoverReportDays: parseFloat(process.env.PUSHOVER_REPORT_DAYS ?? '3'),

  // Test: forza un match fittizio al primo spin per verificare salvataggio
  testMatch: process.env.TEST_MATCH === '1',
};

export default config;
