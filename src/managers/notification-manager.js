/**
 * Invia notifiche in caso di match trovato.
 * Supporta: log console + Pushover (opzionale).
 */
import config from '../config.js';

export class NotificationManager {
  constructor() {
    this._pushoverEnabled = !!(config.pushoverUserKey && config.pushoverApiToken);
    if (this._pushoverEnabled) {
      console.log('[notify] Pushover abilitato');
    } else {
      console.log('[notify] Pushover non configurato — solo log');
    }
  }

  /** Notifica un match trovato */
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

    // Pushover (se configurato)
    if (this._pushoverEnabled) {
      await this._sendPushover(message);
    }
  }

  async _sendPushover(message) {
    try {
      const response = await fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config.pushoverApiToken,
          user: config.pushoverUserKey,
          title: '🚀 BTC Guesser — MATCH!',
          message,
          priority: 2,
          retry: 30,
          expire: 3600,
          sound: 'cashregister',
        }),
      });
      if (!response.ok) {
        console.error(`[notify] Pushover errore: ${response.status}`);
      } else {
        console.log('[notify] Pushover inviato con successo');
      }
    } catch (err) {
      console.error(`[notify] Pushover errore: ${err.message}`);
    }
  }
}
