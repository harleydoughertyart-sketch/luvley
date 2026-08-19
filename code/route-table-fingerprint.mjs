#!/usr/bin/env node
/**
 * The route table of a REAL booted server, hashed — the proof a server/index.js
 * slice moved nothing.
 *
 * WHY THIS EXISTS. `server/index.js` is being split into `server/routes/*.js`,
 * and the only semantic Express has is REGISTRATION ORDER. Two mounts of the
 * same path are resolved by `next('route')` falling DOWN the stack, so inverting
 * a pair changes who gets billed with nothing in the diff looking wrong. Reading
 * the diff cannot catch that; comparing the built router can.
 *
 * The first five slices each proved themselves this way with a throwaway script
 * that was never committed, so every slice re-invented it. This is that script,
 * written down.
 *
 *   node scripts/route-table-fingerprint.mjs --out _local/before.json
 *   ...move a route group...
 *   node scripts/route-table-fingerprint.mjs --out _local/after.json
 *   node scripts/route-table-fingerprint.mjs --diff _local/before.json _local/after.json
 *
 * An empty diff is the pass. Anything else is a behaviour change.
 *
 * WHAT IS HASHED, and why each part is needed:
 *   - the ORDER of `app._router.stack`, as an array index that is part of every row;
 *   - each layer's `name` and mount `regexp`, so a moved `app.use(prefix, …)` shows;
 *   - for a route layer, its path and the METHODS it answers;
 *   - `sha256(handler.toString())` for every handler in the layer's own stack, so
 *     a handler that was edited rather than moved also shows.
 * Handler source is hashed rather than stored: the point is equality, and the raw
 * text of ~250 handlers is not something anyone will read.
 *
 * HOW THE APP IS CAPTURED WITHOUT index.js EXPORTING IT. index.js boots on
 * import and ends in `app.listen(PORT)`; it exports nothing. Express's
 * `app.listen` is `http.createServer(this).listen(…)`, so patching
 * `http.createServer` before the import hands us the app object itself, fully
 * registered, at the exact moment the server would have started serving. No
 * change to index.js, and nothing that only works because a test asked for it.
 *
 * IT CANNOT SPEND MONEY OR TOUCH PRODUCTION. The child process gets exactly the
 * environment `scripts/e2e-backend.mjs` uses — built from `{}` by allow-list,
 * re-checked by `e2eRuntimeSafetyErrors`, Firestore pinned to the emulator, no
 * provider key present. Same guarantee, same code, one profile.
 */

import { spawn } from 'node:child_process';
import { createHash, generateKeyPairSync } from 'node:crypto';
import fs, { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(scriptPath), '..');

const sha256 = (text) => createHash('sha256').update(String(text)).digest('hex');

/**
 * Fences the JSON the capture child prints off from the server's own boot chatter.
 *
 * Written as `\x01` escapes rather than raw SOH bytes: `server/scripts/test-repo-invariants.mjs`
 * fails on any raw control character in tracked source, because four of them once
 * sat inside security filters that grep therefore refused to print.
 */
const FINGERPRINT_MARKER = '\x01FINGERPRINT\x01';

/**
 * One express Layer, reduced to the facts that decide behaviour.
 *
 * `regexp.source` rather than the compiled regexp because a RegExp does not
 * serialise, and `fast_slash` is carried separately because two mounts can share
 * a source and differ on it.
 */
function describeLayer(layer, index) {
  const row = {
    index,
    name: String(layer?.name ?? ''),
    regexp: String(layer?.regexp?.source ?? ''),
    fastSlash: Boolean(layer?.regexp?.fast_slash),
    keys: (layer?.keys ?? []).map((key) => String(key?.name ?? '')),
  };
  if (layer?.route) {
    row.path = String(layer.route.path ?? '');
    row.methods = Object.keys(layer.route.methods ?? {}).sort();
    row.handlers = (layer.route.stack ?? []).map((sub) => ({
      name: String(sub?.name ?? ''),
      sha: sha256(sub?.handle ?? ''),
    }));
  } else {
    row.path = null;
    row.methods = null;
    row.handlers = [{ name: String(layer?.name ?? ''), sha: sha256(layer?.handle ?? '') }];
  }
  return row;
}

/** The whole table, plus a single hash over it so a summary line can be compared by eye. */
export function fingerprintRouterStack(stack) {
  const layers = (stack ?? []).map(describeLayer);
  return { layerCount: layers.length, digest: sha256(JSON.stringify(layers)), layers };
}

/**
 * Boot the server in a child process and return its fingerprint.
 *
 * A child rather than an in-process import for two reasons: index.js mutates
 * `process.env` in its module body and installs signal handlers, and it can only
 * be imported once per process, so a parent that ran it could never run it again.
 */
async function captureFingerprint({ log = () => {} } = {}) {
  const [{ buildE2eServerEnv, e2eRuntimeSafetyErrors, formatE2eSafetyErrors, E2E_FIREBASE_PROJECT_ID },
    { PARITY_FIRESTORE_EMULATOR_HOST, startParityFirestoreEmulator }] = await Promise.all([
    import('./lib/e2e-runtime-core.mjs'),
    import('./parity-firestore-emulator.mjs'),
  ]);

  const host = PARITY_FIRESTORE_EMULATOR_HOST;
  /* Throwaway, same reason as the e2e backend's: booting the real server
   * bootstraps the starter catalog, so a fingerprint run used to write
   * `.data/starter-catalog.json` and rewrite the git-TRACKED `.data/skills.json`
   * in the developer's repo. A route-table hash must not have side effects. */
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'luvley-fingerprint-data-'));
  const env = buildE2eServerEnv(process.env, {
    // Port 0 lets the OS pick, so a fingerprint run never collides with a real
    // e2e backend or the parity launcher on 3001.
    port: 0,
    firestoreEmulatorHost: host,
    generateKeyPairSync,
    dataDir,
  });
  const unsafe = e2eRuntimeSafetyErrors(env);
  if (unsafe.length > 0) throw new Error(formatE2eSafetyErrors(unsafe));

  const emulator = await startParityFirestoreEmulator({
    repoRoot: REPO_ROOT,
    host,
    projectId: E2E_FIREBASE_PROJECT_ID,
    spawnImpl: spawn,
    log,
  });

  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [scriptPath, '--capture'], {
        cwd: REPO_ROOT,
        env,
        stdio: ['ignore', 'pipe', 'inherit'],
        shell: false,
      });
      let out = '';
      child.stdout.on('data', (chunk) => { out += chunk; });
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`route-table-fingerprint: capture child exited ${code}`));
          return;
        }
        const marker = out.indexOf(FINGERPRINT_MARKER);
        if (marker < 0) {
          reject(new Error('route-table-fingerprint: the child printed no fingerprint.'));
          return;
        }
        resolve(JSON.parse(out.slice(marker + FINGERPRINT_MARKER.length)));
      });
    });
  } finally {
    emulator.stop();
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
      /* the OS owns temp; a leaked directory cannot corrupt real data */
    }
  }
}

/** Rows that differ, as a human-readable list. Empty means inert. */
export function diffFingerprints(before, after) {
  const lines = [];
  if (before.layerCount !== after.layerCount) {
    lines.push(`layer count ${before.layerCount} -> ${after.layerCount}`);
  }
  const max = Math.max(before.layers.length, after.layers.length);
  for (let i = 0; i < max; i += 1) {
    const a = JSON.stringify(before.layers[i] ?? null);
    const b = JSON.stringify(after.layers[i] ?? null);
    if (a === b) continue;
    lines.push(`layer ${i}:\n  before ${a}\n  after  ${b}`);
  }
  return lines;
}

const argv = process.argv.slice(2);

if (argv[0] === '--capture') {
  // The child. Patch http.createServer, then let index.js boot normally.
  const http = await import('node:http');
  const realCreateServer = http.default.createServer;
  let captured = null;
  http.default.createServer = function patchedCreateServer(...args) {
    const candidate = args.find(
      (value) => typeof value === 'function' && typeof value.handle === 'function' && value._router,
    );
    if (candidate && !captured) captured = candidate;
    return realCreateServer.apply(this, args);
  };

  await import(pathToFileURL(path.join(REPO_ROOT, 'server', 'index.js')).href);

  if (!captured?._router?.stack) {
    process.stderr.write('route-table-fingerprint: the express app was never handed to http.createServer.\n');
    process.exit(2);
  }
  process.stdout.write(FINGERPRINT_MARKER + JSON.stringify(fingerprintRouterStack(captured._router.stack)));
  // The server is listening and the sweeps are armed; nothing here wants either.
  process.exit(0);
} else if (argv[0] === '--diff') {
  const before = JSON.parse(readFileSync(argv[1], 'utf8'));
  const after = JSON.parse(readFileSync(argv[2], 'utf8'));
  const lines = diffFingerprints(before, after);
  if (lines.length === 0) {
    process.stdout.write(
      `route table identical: ${after.layerCount} layers, digest ${after.digest}\n`,
    );
    process.exit(0);
  }
  process.stdout.write(`route table CHANGED (${lines.length} differing row(s)):\n${lines.join('\n')}\n`);
  process.exit(1);
} else {
  const outIndex = argv.indexOf('--out');
  const out = outIndex >= 0 ? argv[outIndex + 1] : null;
  const fingerprint = await captureFingerprint({
    log: (line) => process.stderr.write(String(line) + '\n'),
  });
  if (out) {
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    writeFileSync(path.resolve(out), JSON.stringify(fingerprint, null, 2));
  }
  process.stdout.write(`${fingerprint.layerCount} layers, digest ${fingerprint.digest}${out ? ` -> ${out}` : ''}\n`);
  // The emulator launcher leaves a handle behind when it reuses an already-running
  // emulator rather than owning one, so the event loop never drains. The work is
  // finished and written by here; exit rather than hang a CI step forever.
  process.exit(0);
}
