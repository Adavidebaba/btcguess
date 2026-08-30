/**
 * Gestisce le statistiche degli spin in tempo reale.
 * Mantiene contatori cumulativi ed esegue il calcolo aggregato di Spin al Secondo (SPS) su tutti i worker attivi.
 */
const SATS_PER_BTC = 100_000_000;

export class StatsManager {
  constructor() {
    this._totalSpins = 0n;
    this._sessionStartTime = Date.now();
    this._lastSpinTime = 0;
    this._lastPrivKeyHex = '';
    this._matches = [];
    this._lastReportTime = Date.now();

    // Contatori per calcolo reale SPS aggregato
    this._spsCounter = 0;
    this._spsLastCalcTime = Date.now();
    this._currentSps = 0;

    this._poolStatus = {
      totalCores: 1,
      activeWorkers: 1,
      cpuPercentage: 25,
      currentCursor: '',
    };
  }

  /** Registra un batch di spin completati da un worker */
  recordBatch({ spinsCount, lastKeyHex }) {
    const count = Number(spinsCount) || 0;
    const now = Date.now();

    this._totalSpins += BigInt(count);
    this._spsCounter += count;
    this._lastSpinTime = now;
    if (lastKeyHex) this._lastPrivKeyHex = lastKeyHex;

    const elapsed = (now - this._spsLastCalcTime) / 1000;
    if (elapsed >= 1) {
      this._currentSps = Math.round(this._spsCounter / elapsed);
      this._spsCounter = 0;
      this._spsLastCalcTime = now;
    }
  }

  /** Registra un match trovato */
  recordMatch(matchData) {
    this._matches.push({
      timestamp: matchData.timestamp || new Date().toISOString(),
      address: matchData.address,
      privKeyHex: matchData.privKeyHex,
      balanceBtc: Number(matchData.balanceSats) / SATS_PER_BTC,
    });
  }

  setPoolStatus(status) {
    this._poolStatus = { ...this._poolStatus, ...status };
  }

  get lastReportTime() {
    return this._lastReportTime;
  }

  setLastReportTime(time) {
    this._lastReportTime = time;
  }

  get spinsPerSecond() {
    if (Date.now() - this._lastSpinTime > 4000) {
      return 0;
    }
    return this._currentSps;
  }

  get uptimeSeconds() {
    return Math.floor((Date.now() - this._sessionStartTime) / 1000);
  }

  /** Snapshot per API / dashboard */
  toJSON() {
    return {
      totalSpins: this._totalSpins.toString(),
      spinsPerSecond: this.spinsPerSecond,
      uptimeSeconds: this.uptimeSeconds,
      startTime: new Date(this._sessionStartTime).toISOString(),
      lastSpinTime: this._lastSpinTime
        ? new Date(this._lastSpinTime).toISOString()
        : null,
      lastAddress: this._lastPrivKeyHex ? 'Scan multi-thread…' : '',
      lastPrivKeyShort: this._lastPrivKeyHex
        ? `${this._lastPrivKeyHex.slice(0, 8)}…${this._lastPrivKeyHex.slice(-8)}`
        : '',
      matchesCount: this._matches.length,
      matches: this._matches,
      pool: this._poolStatus,
    };
  }

  /** Salva lo stato completo */
  serialize() {
    return {
      totalSpins: this._totalSpins.toString(),
      startTime: this._sessionStartTime,
      matches: this._matches,
      cursorHex: this._poolStatus.currentCursor,
      cpuPercentage: this._poolStatus.cpuPercentage,
      lastReportTime: this._lastReportTime,
    };
  }

  /** Ripristina lo stato dal persistence manager */
  restore(data) {
    if (!data) return;
    this._totalSpins = BigInt(data.totalSpins ?? '0');
    this._sessionStartTime = Date.now();
    this._spsLastCalcTime = Date.now();
    this._spsCounter = 0;
    this._matches = data.matches ?? [];
    if (data.lastReportTime) {
      this._lastReportTime = data.lastReportTime;
    }
  }
}
