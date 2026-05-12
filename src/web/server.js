/**
 * Web server Express per la dashboard di monitoraggio.
 * Serve file statici + API REST per le statistiche.
 */
import express from 'express';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config.js';
import { loadStats } from '../game/wallets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = resolve(__dirname, 'public');

export class WebServer {
  constructor({ statsManager }) {
    this._stats = statsManager;
    this._walletStats = null;
    this._app = express();
    this._setupRoutes();
  }

  _setupRoutes() {
    this._app.use(express.json());
    this._app.use(express.static(STATIC_DIR));

    this._app.get('/api/stats', (_req, res) => {
      const engineStats = this._stats.toJSON();
      engineStats.spinDelayMs = config.spinDelayMs;
      const walletStats = this._getWalletStats();
      res.json({ engine: engineStats, wallets: walletStats });
    });

    this._app.post('/api/speed', (req, res) => {
      const delay = parseInt(req.body.delayMs, 10);
      if (isNaN(delay) || delay < 0 || delay > 10000) {
        return res.status(400).json({ error: 'delayMs deve essere 0-10000' });
      }
      config.spinDelayMs = delay;
      console.log(`[web] Velocità cambiata: delay=${delay}ms`);
      res.json({ ok: true, spinDelayMs: delay });
    });

    this._app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  _getWalletStats() {
    if (!this._walletStats) {
      try {
        this._walletStats = loadStats();
      } catch {
        this._walletStats = { walletCount: 0, totalBtc: 0 };
      }
    }
    return this._walletStats;
  }

  start() {
    return new Promise((resolve) => {
      this._app.listen(config.webPort, '0.0.0.0', () => {
        console.log(`[web] Dashboard su http://0.0.0.0:${config.webPort}`);
        resolve();
      });
    });
  }
}
