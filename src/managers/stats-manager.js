/**
 * Gestisce le statistiche degli spin in tempo reale.
 * Mantiene contatori, calcola spin/sec, traccia match.
 */
const SATS_PER_BTC = 100_000_000;

export class StatsManager {
  constructor() {
    this._totalSpins = 0n;
    this._startTime = Date.now();
    this._lastSpinTime = 0;
    this._lastPrivKeyHex = '';
    this._matches = [];
    
    // Contatori per gli Spin al Secondo (SPS)
    this._spsCounter = 0;
    this._spsLastCalcTime = Date.now();
    this._currentSps = 0;
  }

  /** Registra uno spin completato */
  recordSpin(result) {
    this._totalSpins++;
    this._spsCounter++;
    this._lastSpinTime = Date.now();
    this._lastPrivKeyHex = result.privKeyHex;

    // Calcola SPS ogni secondo
    const now = Date.now();
    if (now - this._spsLastCalcTime >= 1000) {
      this._currentSps = Math.round(this._spsCounter / ((now - this._spsLastCalcTime) / 1000));
      this._spsCounter = 0;
      this._spsLastCalcTime = now;
    }

    if (result.win) {
      this._matches.push({
        timestamp: new Date().toISOString(),
        address: result.match.address,
        privKeyHex: result.privKeyHex,
        balanceBtc: Number(result.match.balanceSats) / SATS_PER_BTC,
      });
    }
  }

  get spinsPerSecond() {
    // Se non avvengono spin da più di 2 secondi, resetta a 0
    if (Date.now() - this._lastSpinTime > 2000) return 0;
    return this._currentSps;
  }

  get uptimeSeconds() {
    return Math.floor((Date.now() - this._startTime) / 1000);
  }

  /** Snapshot per API / dashboard */
  toJSON() {
    return {
      totalSpins: this._totalSpins.toString(),
      spinsPerSecond: this.spinsPerSecond,
      uptimeSeconds: this.uptimeSeconds,
      startTime: new Date(this._startTime).toISOString(),
      lastSpinTime: this._lastSpinTime
        ? new Date(this._lastSpinTime).toISOString()
        : null,
      lastAddress: this._lastPrivKeyHex 
        ? `Scan...` // Mostriamo solo Scan invece di ricalcolare Base58 per risparmiare CPU
        : '',
      lastPrivKeyShort: this._lastPrivKeyHex
        ? `${this._lastPrivKeyHex.slice(0, 8)}…${this._lastPrivKeyHex.slice(-8)}`
        : '',
      matchesCount: this._matches.length,
      matches: this._matches,
    };
  }

  /** Per il persistence manager — salva lo stato completo */
  serialize() {
    return {
      totalSpins: this._totalSpins.toString(),
      startTime: this._startTime,
      matches: this._matches,
    };
  }

  /** Ripristina lo stato dal persistence manager */
  restore(data) {
    if (!data) return;
    this._totalSpins = BigInt(data.totalSpins ?? '0');
    // Mantieni lo startTime originale per tracciare uptime reale della sessione,
    // ma salva totalSpins cumulativo tra riavvii
    this._matches = data.matches ?? [];
  }
}
