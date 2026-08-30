#!/usr/bin/env node

/**
 * Benchmark ripetibile del motore di spin reale, senza modificare il suo hot path.
 *
 * Variabili opzionali:
 *   BENCH_DURATION_MS=5000   finestra misurata per configurazione
 *   BENCH_WARMUP_MS=1500     riscaldamento JIT prima della misura
 *   BENCH_WORKERS=1,max      configurazioni separate da virgola
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import os from 'node:os';

const WORKER_PATH = resolve('src/engine/spin-worker.js');
const DATA_FILES = [
  resolve('generated-data/satoshi-bloom.bin'),
  resolve('generated-data/satoshi-wallets.bin'),
];
const START_KEY_HEX = '0'.repeat(63) + '1';

const durationMs = readPositiveInt('BENCH_DURATION_MS', 5_000);
const warmupMs = readPositiveInt('BENCH_WARMUP_MS', 1_500, true);
const availableWorkers = typeof os.availableParallelism === 'function'
  ? os.availableParallelism()
  : os.cpus().length;
const workerCounts = parseWorkerCounts(process.env.BENCH_WORKERS ?? '1,max');

function readPositiveInt(name, fallback, allowZero = false) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number.parseInt(raw, 10);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`${name} deve essere un intero >= ${minimum}`);
  }
  return value;
}

function parseWorkerCounts(raw) {
  const counts = raw.split(',').map((entry) => {
    const normalized = entry.trim().toLowerCase();
    if (normalized === 'max') return availableWorkers;
    const value = Number.parseInt(normalized, 10);
    if (!Number.isFinite(value) || value < 1 || value > availableWorkers) {
      throw new Error(
        `BENCH_WORKERS contiene "${entry}": usare valori tra 1 e ${availableWorkers}, oppure max`
      );
    }
    return value;
  });
  return [...new Set(counts)];
}

function formatInteger(value) {
  return Math.round(value).toLocaleString('it-IT');
}

function formatMiB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

function wait(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function stopWorkers(workers) {
  for (const worker of workers) worker.postMessage({ type: 'stop' });
  await wait(650);
  await Promise.allSettled(workers.map((worker) => worker.terminate()));
}

async function benchmarkWorkers(count) {
  const workers = [];
  const states = Array.from({ length: count }, () => ({
    cumulative: 0,
    start: null,
    end: null,
  }));
  const launchTime = performance.now();
  const earliestStartTime = launchTime + warmupMs;
  let peakRss = process.memoryUsage().rss;
  let fatalError = null;

  const memoryTimer = setInterval(() => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }, 100);

  try {
    for (let workerId = 0; workerId < count; workerId++) {
      const worker = new Worker(WORKER_PATH, {
        workerData: {
          workerId,
          totalWorkers: count,
          startKeyHex: START_KEY_HEX,
        },
        execArgv: [],
      });

      worker.on('message', (message) => {
        if (message.type !== 'progress') return;
        const now = performance.now();
        const state = states[workerId];
        state.cumulative += Number(message.spinsCount) || 0;

        if (!state.start && now >= earliestStartTime) {
          state.start = { time: now, spins: state.cumulative };
        } else if (
          state.start &&
          !state.end &&
          now >= state.start.time + durationMs
        ) {
          state.end = { time: now, spins: state.cumulative };
        }
      });
      worker.on('error', (error) => {
        fatalError = error;
      });
      workers.push(worker);
    }

    const timeoutAt = performance.now() + warmupMs + durationMs + 10_000;
    while (states.some((state) => !state.end)) {
      if (fatalError) throw fatalError;
      if (performance.now() >= timeoutAt) {
        throw new Error('Timeout: uno o più worker non hanno prodotto campioni sufficienti');
      }
      await wait(50);
    }

    const workerRates = states.map((state) => {
      const elapsedSeconds = (state.end.time - state.start.time) / 1_000;
      return (state.end.spins - state.start.spins) / elapsedSeconds;
    });
    const spinsPerSecond = workerRates.reduce((sum, rate) => sum + rate, 0);

    return {
      workers: count,
      spinsPerSecond,
      spinsPerSecondPerWorker: spinsPerSecond / count,
      peakRssBytes: peakRss,
    };
  } finally {
    clearInterval(memoryTimer);
    await stopWorkers(workers);
  }
}

async function main() {
  for (const file of DATA_FILES) {
    if (!existsSync(file)) {
      throw new Error(`File richiesto non trovato: ${file}. Eseguire prima npm run build:wallets`);
    }
  }

  console.log('BTC Guesser — benchmark baseline');
  console.log(`Node: ${process.version} | ${process.platform}/${process.arch}`);
  console.log(`CPU logiche disponibili: ${availableWorkers}`);
  console.log(`Warm-up: ${warmupMs} ms | Misura: ${durationMs} ms`);
  console.log(`Configurazioni worker: ${workerCounts.join(', ')}\n`);

  const results = [];
  for (const count of workerCounts) {
    process.stdout.write(`Misuro ${count} worker... `);
    const result = await benchmarkWorkers(count);
    results.push(result);
    console.log(
      `${formatInteger(result.spinsPerSecond)} spin/s ` +
      `(${formatInteger(result.spinsPerSecondPerWorker)} per worker), ` +
      `RSS picco ${formatMiB(result.peakRssBytes)} MiB`
    );
  }

  if (results.length > 1) {
    const baseline = results[0];
    console.log('\nScalabilità rispetto alla prima configurazione:');
    for (const result of results.slice(1)) {
      const speedup = result.spinsPerSecond / baseline.spinsPerSecond;
      const ideal = result.workers / baseline.workers;
      const efficiency = (speedup / ideal) * 100;
      console.log(
        `${result.workers} worker: ${speedup.toFixed(2)}x, efficienza ${efficiency.toFixed(1)}%`
      );
    }
  }

  console.log('\nJSON_RESULT=' + JSON.stringify({
    timestamp: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    availableWorkers,
    warmupMs,
    durationMs,
    results,
  }));
}

main().catch((error) => {
  console.error(`Benchmark fallito: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
