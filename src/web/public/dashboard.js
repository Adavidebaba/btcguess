/**
 * Dashboard client — polling ogni 2 secondi delle statistiche.
 */
const POLL_INTERVAL_MS = 2000;

function formatNumber(n) {
  return BigInt(n).toLocaleString('it-IT');
}

function formatUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}g ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatOdds(walletCount) {
  const log10Keyspace = 256 * Math.log10(2);
  const log10Denom = log10Keyspace - Math.log10(walletCount);
  const exponent = Math.floor(log10Denom);
  const mantissa = Math.pow(10, log10Denom - exponent);
  return `1 su ${mantissa.toFixed(2)} × 10^${exponent}`;
}

function shortenTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleTimeString('it-IT');
}

async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Fetch errore:', err);
    return null;
  }
}

function renderStats(data) {
  const { engine, wallets } = data;

  // Stat cards
  document.getElementById('total-spins').textContent = formatNumber(engine.totalSpins);
  document.getElementById('spins-sub').textContent =
    engine.matchesCount > 0 ? `${engine.matchesCount} match!` : 'nessun match';
  document.getElementById('spins-per-sec').textContent =
    engine.spinsPerSecond.toLocaleString('it-IT');
  document.getElementById('uptime').textContent = formatUptime(engine.uptimeSeconds);
  document.getElementById('start-time').textContent =
    `dal ${new Date(engine.startTime).toLocaleDateString('it-IT')}`;
  document.getElementById('matches-count').textContent = engine.matchesCount;

  // Wallet info
  document.getElementById('total-btc').textContent =
    `${Math.round(wallets.totalBtc).toLocaleString('it-IT')} BTC`;
  document.getElementById('wallet-count').textContent =
    wallets.walletCount?.toLocaleString('it-IT') ?? '—';
  document.getElementById('odds').textContent =
    wallets.walletCount ? formatOdds(wallets.walletCount) : '—';

  // Ultimo spin
  document.getElementById('last-address').textContent =
    engine.lastAddress || '—';
  document.getElementById('last-key').textContent =
    engine.lastPrivKeyShort || '—';
  document.getElementById('last-spin-time').textContent =
    shortenTime(engine.lastSpinTime);

  // Sync speed slider dal server (solo se l'utente non sta trascinando)
  if (!sliderDragging && engine.spinDelayMs !== undefined) {
    syncSlider(engine.spinDelayMs);
  }

  // Match section
  const matchSection = document.getElementById('matches-section');
  const matchesList = document.getElementById('matches-list');
  if (engine.matchesCount > 0) {
    matchSection.style.display = 'block';
    matchesList.innerHTML = engine.matches.map(m =>
      `<div class="match-entry">
        <strong>${m.timestamp}</strong><br>
        Addr: ${m.address}<br>
        Key: ${m.privKeyHex}<br>
        BTC: ${m.balanceBtc}
      </div>`
    ).join('');
  } else {
    matchSection.style.display = 'none';
  }

  // Status
  document.getElementById('status-dot').classList.remove('error');
  document.getElementById('status-text').textContent =
    `Online — aggiornato alle ${new Date().toLocaleTimeString('it-IT')}`;
}

function showError() {
  document.getElementById('status-dot').classList.add('error');
  document.getElementById('status-text').textContent = 'Connessione persa';
}

async function poll() {
  const data = await fetchStats();
  if (data) {
    renderStats(data);
  } else {
    showError();
  }
}

// === Speed Control ===
const slider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');
const presetBtns = document.querySelectorAll('.preset-btn');
let sliderDragging = false;
let sendTimer = null;

function formatDelay(ms) {
  if (ms === 0) return 'MAX';
  return `${ms}ms`;
}

function syncSlider(delayMs) {
  slider.value = delayMs;
  speedLabel.textContent = formatDelay(delayMs);
  updatePresetHighlight(delayMs);
}

function updatePresetHighlight(delayMs) {
  presetBtns.forEach(btn => {
    const val = parseInt(btn.dataset.delay, 10);
    btn.classList.toggle('active', val === delayMs);
  });
}

async function sendSpeed(delayMs) {
  try {
    await fetch('/api/speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delayMs }),
    });
  } catch (err) {
    console.error('Errore invio velocità:', err);
  }
}

// Slider: aggiorna label in tempo reale, invia con debounce
slider.addEventListener('input', () => {
  const val = parseInt(slider.value, 10);
  speedLabel.textContent = formatDelay(val);
  updatePresetHighlight(val);
  clearTimeout(sendTimer);
  sendTimer = setTimeout(() => sendSpeed(val), 200);
});

slider.addEventListener('mousedown', () => { sliderDragging = true; });
slider.addEventListener('touchstart', () => { sliderDragging = true; });
slider.addEventListener('mouseup', () => { sliderDragging = false; });
slider.addEventListener('touchend', () => { sliderDragging = false; });

// Preset buttons
presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.dataset.delay, 10);
    syncSlider(val);
    sendSpeed(val);
  });
});

// Avvio
poll();
setInterval(poll, POLL_INTERVAL_MS);

