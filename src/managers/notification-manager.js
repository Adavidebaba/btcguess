/**
 * Gestione centralizzata delle notifiche (Log Console + Pushover).
 * Supporta notifiche istantanee per match e report periodici di progresso.
 */
import config from '../config.js';

export class NotificationManager {
  constructor() {
    this._pushoverEnabled = !!(config.pushoverUserKey && config.pushoverApiToken);
    if (this._pushoverEnabled) {
      console.log(`[notify] Pushover abilitato (Report ogni ${config.pushoverReportDays} giorni)`);
    } else {
      console.log('[notify] Pushover non configurato — solo log');
    }
  }

  /** Notifica un match trovato (Priorità Massima) */
  async notifyMatch(matchData) {
    const message = [
      '🎉🎉🎉 MATCH TROVATO! 🎉🎉🎉',
      `Indirizzo: ${matchData.address}`,
      `Chiave privata: ${matchData.privKeyHex}`,
      `Bilancio: ${matchData.balanceBtc} BTC`,
      `Timestamp: ${matchData.timestamp}`,
    ].join('\n');

    // Sempre su console
    console.log('\n' + '='.repeat(60));
    console.log(message);
    console.log('='.repeat(60) + '\n');

    if (this._pushoverEnabled) {
      await this._sendPushover({
        title: '🚀 BTC Guesser — MATCH!',
        message,
        priority: 2,
        retry: 30,
        expire: 3600,
        sound: 'cashregister',
      });
    }
  }

  /** Invia un report periodico sullo stato e sul progresso della scansione */
  async notifyProgressReport(stats) {
    const message = [
      '📊 Report periodico di scansione:',
      `• Totale chiavi testate: ${Number(stats.totalSpins).toLocaleString('it-IT')}`,
      `• Velocità attuale: ${Number(stats.spinsPerSecond).toLocaleString('it-IT')} spin/s`,
      `• Risorse CPU: ${stats.cpuPercentage}% (${stats.activeWorkers}/${stats.totalCores} core)`,
      `• Tempo di attività (uptime): ${stats.formattedUptime}`,
      `• Cursore attuale: ${stats.cursorShort || 'Inizio spazio'}`,
      `• Match totali: ${stats.matchesCount}`,
    ].join('\n');

    console.log('\n[notify] Invio report periodico di progresso...');
    console.log(message);

    if (this._pushoverEnabled) {
      await this._sendPushover({
        title: '📊 BTC Guesser — Report di Progresso',
        message,
        priority: 0,
        sound: 'pushover',
      });
    }
  }

  async _sendPushover({ title, message, priority = 0, sound = 'pushover', retry, expire }) {
    try {
      const payload = {
        token: config.pushoverApiToken,
        user: config.pushoverUserKey,
        title,
        message,
        priority,
        sound,
      };
      if (retry) payload.retry = retry;
      if (expire) payload.expire = expire;

      const response = await fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`[notify] Pushover errore risposta HTTP: ${response.status}`);
      } else {
        console.log('[notify] Notifica Pushover inviata con successo');
      }
    } catch (err) {
      console.error(`[notify] Pushover errore di connessione: ${err.message}`);
    }
  }
}
