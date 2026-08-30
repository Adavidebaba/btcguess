/**
 * Dashboard client — polling in tempo reale delle statistiche,
 * controllo dinamico della percentuale CPU e delay.
 */
const POLL_INTERVAL_MS = 1000;

let cpuDragging = false;
let speedDragging = false;
let cpuSendTimer = null;
let speedSendTimer = null;
let lastKnownTotalCores = 1;

function formatNumber(n) {
  if (n === undefined || n === null) return '—';
  try {
    return BigInt(n).toLocaleString('it-IT');
  } catch {
    return String(n);
  }
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
  if (!data || !data.engine) return;
  const { engine, wallets } = data;
  const pool = engine.pool || { totalCores: 1, activeWorkers: 1, cpuPercentage: 100 };
  lastKnownTotalCores = pool.totalCores || 1;

  // Stat cards
  const totalSpinsEl = document.getElementById('total-spins');
  if (totalSpinsEl) totalSpinsEl.textContent = formatNumber(engine.totalSpins);

  const spinsSubEl = document.getElementById('spins-sub');
  if (spinsSubEl) {
    spinsSubEl.textContent = engine.matchesCount > 0 ? `${engine.matchesCount} match!` : 'zero collisioni';
  }

  const spsEl = document.getElementById('spins-per-sec');
  if (spsEl) spsEl.textContent = (engine.spinsPerSecond || 0).toLocaleString('it-IT');

  const uptimeEl = document.getElementById('uptime');
  if (uptimeEl) uptimeEl.textContent = formatUptime(engine.uptimeSeconds);

  const startTimeEl = document.getElementById('start-time');
  if (startTimeEl) startTimeEl.textContent = `dal ${new Date(engine.startTime).toLocaleDateString('it-IT')}`;

  const matchesCountEl = document.getElementById('matches-count');
  if (matchesCountEl) matchesCountEl.textContent = engine.matchesCount ?? 0;

  // Wallet info
  if (wallets) {
    const totalBtcEl = document.getElementById('total-btc');
    if (totalBtcEl) totalBtcEl.textContent = `${Math.round(wallets.totalBtc || 0).toLocaleString('it-IT')} BTC`;

    const walletCountEl = document.getElementById('wallet-count');
    if (walletCountEl) walletCountEl.textContent = wallets.walletCount?.toLocaleString('it-IT') ?? '—';

    const oddsEl = document.getElementById('odds');
    if (oddsEl) oddsEl.textContent = wallets.walletCount ? formatOdds(wallets.walletCount) : '—';
  }

  // Pool & Scansione
  const poolInfoEl = document.getElementById('pool-threads-info');
  if (poolInfoEl) {
    poolInfoEl.textContent = `${pool.activeWorkers} / ${pool.totalCores} Thread (${pool.cpuPercentage}%)`;
  }

  const lastKeyEl = document.getElementById('last-key');
  if (lastKeyEl) lastKeyEl.textContent = engine.lastPrivKeyShort || '—';

  const lastSpinTimeEl = document.getElementById('last-spin-time');
  if (lastSpinTimeEl) lastSpinTimeEl.textContent = shortenTime(engine.lastSpinTime);

  // Sincronizza slider solo se l'utente non sta trascinando
  if (!cpuDragging && pool.cpuPercentage !== undefined) {
    syncCpuSlider(pool.cpuPercentage, pool.activeWorkers, pool.totalCores);
  }
  if (!speedDragging && engine.spinDelayMs !== undefined) {
    syncSpeedSlider(engine.spinDelayMs);
  }

  // Match section
  renderMatches(engine);

  // Status
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  if (statusDot) statusDot.classList.remove('error');
  if (statusText) {
    statusText.textContent = `Online — ${pool.activeWorkers} core attivi — aggiornato alle ${new Date().toLocaleTimeString('it-IT')}`;
  }
}

function renderMatches(engine) {
  const matchSection = document.getElementById('matches-section');
  const matchesList = document.getElementById('matches-list');
  if (!matchSection || !matchesList) return;

  if (engine.matchesCount > 0 && engine.matches && engine.matches.length > 0) {
    matchSection.style.display = 'block';
    matchesList.innerHTML = engine.matches.map((m) => `
      <div class="match-entry">
        <strong>${m.timestamp}</strong><br>
        Addr: ${m.address}<br>
        Key: ${m.privKeyHex}<br>
        BTC: ${m.balanceBtc}
      </div>
    `).join('');
  } else {
    matchSection.style.display = 'none';
  }
}

function showError() {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  if (statusDot) statusDot.classList.add('error');
  if (statusText) statusText.textContent = 'Connessione persa';
}

async function poll() {
  const data = await fetchStats();
  if (data) renderStats(data);
  else showError();
}

// === CPU Percentage Control ===
const cpuSlider = document.getElementById('cpu-slider');
const cpuLabel = document.getElementById('cpu-label');
const cpuPresetBtns = document.querySelectorAll('.cpu-preset-btn');

function syncCpuSlider(percent, activeWorkers, totalCores) {
  if (!cpuSlider || !cpuLabel) return;
  cpuSlider.value = percent;
  const cores = activeWorkers || Math.max(1, Math.round(totalCores * (percent / 100)));
  cpuLabel.textContent = `${percent}% (${cores}/${totalCores || lastKnownTotalCores} Core)`;
  updateCpuPresetHighlight(percent);
}

function updateCpuPresetHighlight(percent) {
  cpuPresetBtns.forEach((btn) => {
    const val = parseInt(btn.dataset.percent, 10);
    btn.classList.toggle('active', val === percent);
  });
}

async function sendCpuPercentage(percentage) {
  try {
    await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percentage }),
    });
  } catch (err) {
    console.error('Errore invio percentuale CPU:', err);
  }
}

if (cpuSlider) {
  cpuSlider.addEventListener('input', () => {
    const val = parseInt(cpuSlider.value, 10);
    const cores = Math.max(1, Math.round(lastKnownTotalCores * (val / 100)));
    if (cpuLabel) cpuLabel.textContent = `${val}% (${cores}/${lastKnownTotalCores} Core)`;
    updateCpuPresetHighlight(val);
    clearTimeout(cpuSendTimer);
    cpuSendTimer = setTimeout(() => sendCpuPercentage(val), 200);
  });

  cpuSlider.addEventListener('mousedown', () => { cpuDragging = true; });
  cpuSlider.addEventListener('touchstart', () => { cpuDragging = true; });
  cpuSlider.addEventListener('mouseup', () => { cpuDragging = false; });
  cpuSlider.addEventListener('touchend', () => { cpuDragging = false; });
}

cpuPresetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.dataset.percent, 10);
    syncCpuSlider(val, null, lastKnownTotalCores);
    sendCpuPercentage(val);
  });
});

// === Speed / Delay Control ===
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');
const speedPresetBtns = document.querySelectorAll('.speed-preset-btn');

function formatDelay(ms) {
  return ms === 0 ? '0ms (MAX)' : `${ms}ms`;
}

function syncSpeedSlider(delayMs) {
  if (!speedSlider || !speedLabel) return;
  speedSlider.value = delayMs;
  speedLabel.textContent = formatDelay(delayMs);
  speedPresetBtns.forEach((btn) => {
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

if (speedSlider) {
  speedSlider.addEventListener('input', () => {
    const val = parseInt(speedSlider.value, 10);
    if (speedLabel) speedLabel.textContent = formatDelay(val);
    clearTimeout(speedSendTimer);
    speedSendTimer = setTimeout(() => sendSpeed(val), 200);
  });

  speedSlider.addEventListener('mousedown', () => { speedDragging = true; });
  speedSlider.addEventListener('touchstart', () => { speedDragging = true; });
  speedSlider.addEventListener('mouseup', () => { speedDragging = false; });
  speedSlider.addEventListener('touchend', () => { speedDragging = false; });
}

speedPresetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.dataset.delay, 10);
    syncSpeedSlider(val);
    sendSpeed(val);
  });
});

// Avvio polling
poll();
setInterval(poll, POLL_INTERVAL_MS);
