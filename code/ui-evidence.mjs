#!/usr/bin/env node
/**
 * Build the before/after evidence sheet the founder reads.
 *
 * WHY THIS EXISTS. A crewmate that changes something visible has to prove it changed,
 * and prove it changed the way it was asked to. Prose cannot do that — "the popover now
 * sits correctly on a phone" is a claim, two screenshots are a fact. This renders the
 * fact.
 *
 * WHERE THE IMAGES GO, and why it is outside the repo. Two rules collide here and this
 * is the only path that satisfies both:
 *
 *   - AGENTS.md media law: generated previews are never committed.
 *   - A crewmate whose ONLY deliverable is gitignored ends with no commit, and a
 *     worktree with no commit gets swept — the evidence dies with it.
 *
 * So evidence is written to an ABSOLUTE path outside every worktree, the same shape as
 * the Looks Library. Default: D:\Luvley UI Evidence\<task>\. Override with --out.
 *
 * The sheet is self-contained: images are inlined as data URIs, so it survives being
 * moved, and there is no server, no relative path, and nothing to 404.
 *
 * USAGE
 *   node scripts/ui-evidence.mjs --task <slug> [--title "..."] [--manifest <path>]
 *
 * Reads <out>/<task>/manifest.json, or the path given by --manifest:
 *
 *   {
 *     "title": "Mobile Quick Blocks popover",
 *     "branch": "worktree-agent-abc123",
 *     "shots": [
 *       {
 *         "name": "popover-open",
 *         "viewport": "phone 390x844",
 *         "finding": "The fixed panel is clipped by the blurred rail",
 *         "before": "popover-open-before.png",
 *         "after": "popover-open-after.png",
 *         "note": "Panel now escapes the tool cluster entirely.",
 *         "details": [
 *           { "label": "BEFORE — what the model was told", "tone": "before", "text": "…" }
 *         ]
 *       }
 *     ]
 *   }
 *
 * `before` may be omitted for something that did not exist before (a new page); `after`
 * may be omitted for a deletion. One of the two is required.
 *
 * `details` is OPTIONAL and collapsed by default. It exists because some defects are only
 * half visible: `scripts/block-prose-matrix.mjs` proves a prompt-composition bug, where the
 * pictures show the symptom and the prompt text shows the cause, and a sheet carrying only
 * the pictures would leave the reader to take the diagnosis on trust. Anything longer than a
 * sentence belongs here rather than in `note`, which stays one glanceable line. Each entry is
 * `{ label, text, tone? }`; `tone` is "before" | "after" and only tints the summary marker.
 */

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_ROOT = 'D:\\Luvley UI Evidence';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** Inline an image as a data URI, or return null with the reason it could not be. */
function inlineImage(dir, file) {
  if (!file) return { uri: null, reason: 'not captured' };
  const full = path.resolve(dir, file);
  if (!fs.existsSync(full)) return { uri: null, reason: `missing: ${file}` };
  const ext = path.extname(full).toLowerCase();
  const mime = MIME[ext];
  if (!mime) return { uri: null, reason: `unsupported format: ${ext}` };
  const bytes = fs.readFileSync(full);
  if (bytes.length === 0) return { uri: null, reason: `empty file: ${file}` };
  return { uri: `data:${mime};base64,${bytes.toString('base64')}`, reason: null, bytes: bytes.length };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPane(label, image, kind) {
  if (image.uri) {
    return `
        <figure class="pane pane--${kind}">
          <figcaption><span class="tag tag--${kind}">${escapeHtml(label)}</span></figcaption>
          <div class="shot"><img src="${image.uri}" alt="${escapeHtml(label)}" loading="lazy"></div>
        </figure>`;
  }
  return `
        <figure class="pane pane--${kind} pane--empty">
          <figcaption><span class="tag tag--${kind}">${escapeHtml(label)}</span></figcaption>
          <div class="shot shot--empty">${escapeHtml(image.reason)}</div>
        </figure>`;
}

/**
 * The optional evidence blocks under a pair, collapsed.
 *
 * COLLAPSED BY DEFAULT and that is the whole design: the founder reads these
 * sheets by scrolling pictures, and a wall of prompt text between every pair
 * would destroy the only thing the sheet is for. Open one and the full text is
 * there, verbatim, in a monospace block that never wraps its own scrollbar into
 * existence — `pre` with `white-space: pre-wrap`, so a long prompt makes the
 * page taller and never wider.
 */
function renderDetails(details) {
  if (!Array.isArray(details) || details.length === 0) return '';
  return `
        <div class="details">
${details.map((d) => `          <details>
            <summary><span class="dot dot--${escapeHtml(d.tone ?? 'neutral')}"></span>${escapeHtml(d.label ?? 'detail')}</summary>
            <pre>${escapeHtml(d.text)}</pre>
          </details>`).join('\n')}
        </div>`;
}

function renderSheet(manifest, dir, meta) {
  const rows = manifest.shots.map((shot, index) => {
    const before = inlineImage(dir, shot.before);
    const after = inlineImage(dir, shot.after);
    return { shot, before, after, index };
  });

  const missing = rows.filter((r) => !r.before.uri && !r.after.uri);

  const body = rows.map(({ shot, before, after, index }) => `
      <section class="row" id="shot-${index + 1}">
        <header class="row-head">
          <h2>${escapeHtml(shot.name ?? `Shot ${index + 1}`)}</h2>
          ${shot.viewport ? `<span class="viewport">${escapeHtml(shot.viewport)}</span>` : ''}
        </header>
        ${shot.finding ? `<p class="finding"><strong>Defect:</strong> ${escapeHtml(shot.finding)}</p>` : ''}
        <div class="pair">
${renderPane('Before', before, 'before')}
${renderPane('After', after, 'after')}
        </div>
        ${shot.note ? `<p class="note">${escapeHtml(shot.note)}</p>` : ''}
${renderDetails(shot.details)}
      </section>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(manifest.title ?? meta.task)} — before / after</title>
<style>
  :root {
    color-scheme: light dark;
    --paper: #14141a; --card: #1c1c25; --ink: #f2f2f5; --muted: #9a9aa8;
    --line: #2e2e3a; --before: #d8894a; --after: #4ea87b;
  }
  @media (prefers-color-scheme: light) {
    :root { --paper: #f6f6f8; --card: #fff; --ink: #17171d; --muted: #666675; --line: #e2e2ea; }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px 24px 96px; background: var(--paper); color: var(--ink);
    font: 15px/1.55 ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif;
  }
  .wrap { max-width: 1500px; margin: 0 auto; }
  h1 { font-size: 26px; margin: 0 0 6px; letter-spacing: -0.01em; }
  .meta { color: var(--muted); font-size: 13px; margin: 0 0 28px; }
  .meta code { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; }
  .warn {
    background: #4a2418; border: 1px solid #7a3d24; color: #ffcbb0;
    padding: 10px 14px; border-radius: 8px; margin: 0 0 24px; font-size: 13px;
  }
  .row {
    background: var(--card); border: 1px solid var(--line); border-radius: 12px;
    padding: 18px 18px 20px; margin: 0 0 22px;
  }
  .row-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .row-head h2 { font-size: 17px; margin: 0; }
  .viewport {
    font: 12px/1 ui-monospace, Consolas, monospace; color: var(--muted);
    border: 1px solid var(--line); padding: 4px 8px; border-radius: 999px;
  }
  .finding { color: var(--muted); font-size: 13.5px; margin: 8px 0 14px; }
  .finding strong { color: var(--ink); }
  .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  @media (max-width: 900px) { .pair { grid-template-columns: minmax(0, 1fr); } }
  .pane { margin: 0; min-width: 0; }
  .pane figcaption { margin: 0 0 8px; }
  .tag {
    font: 600 11px/1 ui-sans-serif, sans-serif; letter-spacing: 0.09em;
    text-transform: uppercase; padding: 5px 9px; border-radius: 5px; color: #12121a;
  }
  .tag--before { background: var(--before); }
  .tag--after { background: var(--after); }
  .shot {
    border: 1px solid var(--line); border-radius: 8px; overflow: hidden;
    background: repeating-conic-gradient(#0000 0% 25%, #ffffff0a 0% 50%) 50% / 18px 18px;
  }
  .shot img { display: block; width: 100%; height: auto; }
  .shot--empty {
    display: grid; place-items: center; min-height: 160px; color: var(--muted);
    font: 13px ui-monospace, Consolas, monospace; padding: 24px; text-align: center;
  }
  .note {
    margin: 14px 0 0; padding: 10px 12px; border-left: 3px solid var(--after);
    background: #ffffff08; color: var(--muted); font-size: 13.5px; border-radius: 0 6px 6px 0;
    white-space: pre-wrap;
  }
  /* Optional evidence blocks. Collapsed so they cost nothing to scroll past, and
     pre-wrap so a long prompt makes the page taller — never wider, which is what
     would put a second scrollbar on a sheet that must only ever have one. */
  .details { margin: 14px 0 0; display: grid; gap: 6px; }
  .details details {
    border: 1px solid var(--line); border-radius: 8px; background: #ffffff05;
  }
  .details summary {
    cursor: pointer; padding: 8px 12px; font-size: 12.5px; color: var(--muted);
    letter-spacing: 0.02em; list-style: none;
  }
  .details summary::-webkit-details-marker { display: none; }
  .details summary:hover { color: var(--ink); }
  .dot {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    margin-right: 8px; vertical-align: baseline; background: var(--muted);
  }
  .dot--before { background: var(--before); }
  .dot--after { background: var(--after); }
  .details pre {
    margin: 0; padding: 0 14px 14px; white-space: pre-wrap; word-break: break-word;
    font: 12.5px/1.6 ui-monospace, "Cascadia Code", Consolas, monospace; color: var(--ink);
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(manifest.title ?? meta.task)}</h1>
  <p class="meta">
    ${rows.length} comparison${rows.length === 1 ? '' : 's'}
    ${manifest.branch ? ` · branch <code>${escapeHtml(manifest.branch)}</code>` : ''}
    · generated ${escapeHtml(meta.stamp)}
  </p>
  ${missing.length ? `<p class="warn">${missing.length} row(s) have neither a before nor an after image. Nothing was proven for those.</p>` : ''}
${body}
</div>
</body>
</html>
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const task = typeof args.task === 'string' ? args.task : null;
  if (!task) {
    console.error('usage: node scripts/ui-evidence.mjs --task <slug> [--out <dir>] [--manifest <path>]');
    process.exit(2);
  }

  const root = typeof args.out === 'string' ? args.out : DEFAULT_ROOT;
  const dir = path.join(root, task);
  const manifestPath = typeof args.manifest === 'string'
    ? path.resolve(args.manifest)
    : path.join(dir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`No manifest at ${manifestPath}`);
    console.error('Write one first — see the header of this file for the shape.');
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    console.error(`Manifest is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(manifest.shots) || manifest.shots.length === 0) {
    console.error('Manifest has no `shots` array, so there is nothing to prove.');
    process.exit(1);
  }

  if (typeof args.title === 'string') manifest.title = args.title;

  const imageDir = path.dirname(manifestPath);
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const html = renderSheet(manifest, imageDir, { task, stamp });

  fs.mkdirSync(dir, { recursive: true });
  const outFile = path.join(dir, 'sheet.html');
  fs.writeFileSync(outFile, html, 'utf8');

  let proven = 0;
  let unproven = 0;
  for (const shot of manifest.shots) {
    const hasBefore = shot.before && fs.existsSync(path.resolve(imageDir, shot.before));
    const hasAfter = shot.after && fs.existsSync(path.resolve(imageDir, shot.after));
    if (hasBefore || hasAfter) proven += 1;
    else unproven += 1;
  }

  console.log(`sheet: ${outFile}`);
  console.log(`  ${proven} row(s) with imagery, ${unproven} without`);
  if (unproven > 0) {
    console.log('  WARNING: rows without imagery prove nothing. Capture them or drop them.');
    process.exitCode = 1;
  }
}

main();
