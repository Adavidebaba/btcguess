/**
 * Salva e carica le statistiche su disco per persistenza tra riavvii.
 * Scrive su un file JSON nel volume Docker montato.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '../config.js';

const STATS_FILE = resolve(config.persistDir, 'stats.json');

export class PersistenceManager {
  constructor() {
    mkdirSync(config.persistDir, { recursive: true });
  }

  /** Carica dati salvati, o null se non esistono */
  load() {
    if (!existsSync(STATS_FILE)) return null;
    try {
      const raw = readFileSync(STATS_FILE, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[persist] Errore lettura ${STATS_FILE}: ${err.message}`);
      return null;
    }
  }

  /** Salva i dati su disco */
  save(data) {
    try {
      writeFileSync(STATS_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`[persist] Errore scrittura ${STATS_FILE}: ${err.message}`);
    }
  }
}
