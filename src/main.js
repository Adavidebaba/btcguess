/**
 * Entry point: avvia il motore di spin multi-thread headless + web dashboard.
 */
import config from './config.js';
import { loadBloom, loadStats } from './game/wallets.js';
import { StatsManager } from './managers/stats-manager.js';
import { PersistenceManager } from './managers/persistence-manager.js';
import { NotificationManager } from './managers/notification-manager.js';
import { SpinEngine } from './engine/spin-engine.js';
import { WebServer } from './web/server.js';

async function main() {
  console.log('=== BTC Guesser — Multi-Thread Headless Mode ===');
  console.log(`Spin delay: ${config.spinDelayMs}ms`);
  console.log(`CPU Percentage: ${config.cpuPercentage}%`);
  console.log(`Web port: ${config.webPort}`);
  console.log(`Data dir: ${config.dataDir}`);
  console.log(`Persist dir: ${config.persistDir}`);
  console.log('');

  // Carica dati wallet (bloom filter + stats)
  console.log('[init] Caricamento wallet data…');
  const walletStats = loadStats();
  console.log(`[init] ${walletStats.walletCount} wallet caricati`);
  console.log(`[init] Jackpot: ${walletStats.totalBtc} BTC`);

  // Pre-carica bloom filter in memoria
  loadBloom();
  console.log('[init] Bloom filter caricato');

  // Manager
  const statsManager = new StatsManager();
  const persistenceManager = new PersistenceManager();
  const notificationManager = new NotificationManager();

  // Inizializza motore spin
  const engine = new SpinEngine({
    statsManager,
    persistenceManager,
    notificationManager,
  });

  // Ripristina stato precedente (se presente)
  const savedState = persistenceManager.load();
  if (savedState) {
    statsManager.restore(savedState);
    engine.restoreState(savedState);
    console.log(`[init] Stato ripristinato — ${savedState.totalSpins} spin precedenti`);
  }

  // Avvia web dashboard
  const webServer = new WebServer({ statsManager, engine });
  await webServer.start();

  // Avvia motore spin
  engine.start();

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[shutdown] Arresto in corso…');
    engine.stop();
    console.log('[shutdown] Completato.');
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
