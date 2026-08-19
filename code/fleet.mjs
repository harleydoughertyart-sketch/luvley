#!/usr/bin/env node
/**
 * fleet.mjs - the whole crew system, ported from firstmate.
 *
 * Replaces ~30,500 lines of lane orchestration: scripts/lane.ps1, the lane
 * libraries, the slot allocator, the port formula, the three lock files, the
 * scope-claim registry, the merge train, and seven read-only status commands.
 * All of that existed to answer three questions, and this file answers them:
 * who is working, what is not landed, and what needs the captain.
 *
 * ARCHITECTURE (firstmate's, adapted only where Windows + Claude Code force it)
 *
 *   captain      the founder. Decides. Never operates.
 *   first mate   the lead agent. Reads, dispatches, reports. Writes no code.
 *   crewmate     one background Agent, isolation:"worktree", one task.
 *                kind=ship produces a branch; kind=scout produces a report and
 *                never a branch.
 *
 * DERIVE, DO NOT REMEMBER. Everything git or the harness already knows is read
 * fresh on every call - branch, commits ahead, dirt, liveness, the label the
 * lead gave the dispatch. Only what cannot be derived is written down: a task's
 * kind, its delivery mode, the mega-files it holds, and the captain's open
 * decisions. That split is why this has no reconciliation step and cannot drift
 * the way `lane list` and `work:ledger` drifted from each other.
 *
 * WHY NOT FIRSTMATE'S BASH. Four blockers were verified on this machine, three
 * of which fail silently: core.symlinks=false (his CLAUDE.md and .claude/skills
 * are tracked symlinks and arrive as 9- and 17-byte text files, so the contract
 * loads as nothing); no jq (his turn-end guard exits 0 forever without it -
 * installed-looking and inert); `ln -s` copies instead of linking, which kills
 * every lock; and `ps -o` is unsupported, so his auto-arm identity gate fails
 * closed. Node has JSON.parse built in and behaves identically on both
 * platforms, so the LOGIC is ported and the shell is not.
 *
 * Subcommands:
 *   on | off                     arm / disarm crew mode for a thread
 *   bearings [include PRs]       the four-section digest (also `npm run fleet`)
 *   snapshot [--json]            the machine-readable state every view projects from
 *   register <id> ...            record a dispatched crewmate's non-derivable facts
 *   hold "<question>"            open a captain decision
 *   resolve <n> "<answer>"       close one
 *   land <name>                  merge a crewmate branch into developer
 *   teardown <name>              remove a worktree, refusing unlanded work
 *   hook-session-start           SessionStart  - re-emit the contract
 *   hook-prompt                  UserPromptSubmit - contract + roster, every turn
 *   hook-stop                    Stop - refuse to end a turn blind
 *
 * Hook modes read the harness payload on stdin, are silent unless this session
 * owns crew mode, and never throw. A hook that can break a session is worse
 * than no hook.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FLEET = path.join(REPO, '_local', 'fleet');
const STATE = path.join(FLEET, 'state');
const ACTIVE = path.join(FLEET, 'active.json');
const DECISIONS = path.join(FLEET, 'decisions.jsonl');
const WORKTREES = path.join(REPO, '.claude', 'worktrees');

/** The integration branch. `main` is production and is never a crew target. */
const BASE = 'developer';

/**
 * Idle time before a crewmate stops counting as working. Five minutes is
 * deliberate: a crewmate goes quiet inside one long tool call, and calling a
 * working agent stranded is the error that makes a guard into noise. The
 * opposite error self-corrects on the next turn.
 */
const LIVE_WINDOW_MS = 5 * 60 * 1000;

/**
 * The mega-file rule, and the whole of it. These four files each hold one
 * writer at a time - not because two edits would conflict in git, but because
 * two that merge CLEANLY can still break the program: App.tsx is ONE component,
 * ~23,670 lines of body and ~1,030 hook calls under a single `return (`.
 *
 * This is the one place firstmate is wrong for this repo - he says same-file
 * serialisation is insufficient, which is true generally and false for a 29k-
 * line component. It cost 3,036 lines of lock machinery, a registry in the git
 * common dir and the LUVLEY_WORKER identity dance to enforce. It is now this
 * array plus one check at dispatch.
 *
 * App.css is deliberately NOT here: it is a ~60-line @import index over 44
 * partials, and two crewmates in different partials are fine. The measured churn
 * backs that: the busiest partial took 5 touches in 400 commits.
 *
 * AdComposerOverlay.tsx and FirstAdGuide.tsx joined on 2026-08-08. Omitting them
 * was worse than an oversight, because `register` does not stay silent about a
 * path it does not recognise — it answers `not mega-files (no lock needed, just
 * edit them)`. A 3,512-line single-component React file taking 18 of the last 400
 * commits was being declared safe to double-book, in the same breath that a file
 * with 0 commits in that window was locked. A wrong answer delivered confidently
 * is worse than no answer.
 *
 * LookBuilderPanel.tsx joined on 2026-08-08, the day it was cut out of App.tsx.
 * At ~1,690 lines it is a mega-file from birth, and that is the POINT: its claim
 * is now separate from App.tsx's, so a Look Builder crewmate and a mobile or
 * Create crewmate can finally run at the same time. Two Look Builder tasks still
 * serialise — on this file instead of on App.tsx.
 *
 * hub/HubPanel.tsx joined the same day, for the same reason: it is the Studio Hub
 * drawer's four panels, cut out of App.tsx at ~1,450 lines. Every settings task —
 * a provider toggle, a Director default, a restyle of the Advanced drawer — now
 * lands there instead of colliding with whatever else is in App.tsx.
 */
const MEGA_FILES = Object.freeze([
  'client/src/App.tsx',
  'client/src/LookBuilderPanel.tsx',
  'client/src/hub/HubPanel.tsx',
  'client/src/inpaintSession.ts',
  'client/src/InpaintCanvasOverlay.tsx',
  'client/src/AdComposerOverlay.tsx',
  'client/src/onboarding/FirstAdGuide.tsx',
  'server/index.js',
]);

/* ------------------------------------------------------------------ helpers */

function git(args, cwd = REPO) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function gitOk(args, cwd = REPO) {
  try {
    execFileSync('git', args, { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Atomic write: tmp + rename, firstmate's discipline for every state file. */
function writeAtomic(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, contents);
  fs.renameSync(tmp, file);
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function readJsonl(file) {
  try {
    return fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------- crew mode */

function readActive() {
  return readJson(ACTIVE);
}

/**
 * Crew mode is armed by `/crew` and CLAIMED by the next user turn in whichever
 * thread speaks first. Arming clears the binding, so `/crew` in a new thread
 * takes over without the captain having to disarm the old one.
 */
function ownedBy(state, sessionId) {
  if (!state || !state.on) return false;
  if (!state.sessionId) return true;
  return state.sessionId === sessionId;
}

/* ------------------------------------------------------------------- state */

/**
 * The non-derivable facts about a dispatched crewmate. Everything else - branch,
 * ahead-count, dirt, liveness, label - is read from git and the harness at
 * report time and is never stored, because stored state is state that can lie.
 */
function readMeta(id) {
  return readJson(path.join(STATE, `${id}.meta`), null);
}

function writeMeta(id, meta) {
  writeAtomic(path.join(STATE, `${id}.meta`), `${JSON.stringify(meta, null, 2)}\n`);
}

/** Append-only. firstmate's rule: a status log is a wake-event log, never a current-state field. */
function appendStatus(id, line) {
  fs.mkdirSync(STATE, { recursive: true });
  fs.appendFileSync(path.join(STATE, `${id}.status`), `${new Date().toISOString()} ${line}\n`);
}

function allMeta() {
  try {
    return fs
      .readdirSync(STATE)
      .filter((f) => f.endsWith('.meta'))
      .map((f) => ({ id: f.replace(/\.meta$/, ''), ...(readJson(path.join(STATE, f)) || {}) }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ briefs */

/**
 * The MISSION and the BRIEFS - what `bearings` alone cannot tell you.
 *
 * `bearings` reports fleet STATE: who is out, what landed, what is unlanded.
 * State says nothing about intent. Hand a fresh agent a snapshot and it learns
 * three branches are in motion, not what any of them is FOR.
 *
 * That gap is why the lane system carried `.lane/TASK.md` - "the brief, it
 * survives context loss, and it is the thing to re-read when you lose the
 * thread" - and why firstmate has fm-brief.sh. Both exist for one situation:
 * the agent changes mid-task and the conversation, which held all the intent,
 * is gone.
 *
 * Two levels, because two different things get lost:
 *   MISSION   what this stretch of work is FOR. Survives across threads.
 *   BRIEF     what one crewmate was asked to do, verbatim, per task.
 *
 * Both are plain markdown under `_local/fleet/`, gitignored - they are working
 * state, not repo contract. Anything that deserves to outlive the work belongs
 * in a commit message or AGENTS.md, not here.
 */
const MISSION = path.join(FLEET, 'MISSION.md');

function readMission() {
  try {
    return fs.readFileSync(MISSION, 'utf8').trim();
  } catch {
    return '';
  }
}

function briefPath(id) {
  return path.join(FLEET, 'data', id, 'brief.md');
}

function readBrief(id) {
  try {
    return fs.readFileSync(briefPath(id), 'utf8').trim();
  } catch {
    return '';
  }
}

/* --------------------------------------------------------------- decisions */

/**
 * An open decision is a first-class node with an id, not a paragraph in a chat
 * log. firstmate's sharpest observation about these: the ANSWERER writes the
 * closing record, at answer time - closure never depends on a busy worker
 * remembering to report it.
 */
function openDecisions() {
  const events = readJsonl(DECISIONS);
  const byId = new Map();
  for (const e of events) {
    if (e.type === 'hold') byId.set(e.id, { ...e, resolved: false });
    if (e.type === 'resolve' && byId.has(e.id)) byId.get(e.id).resolved = true;
  }
  return [...byId.values()].filter((d) => !d.resolved);
}

function appendDecision(event) {
  fs.mkdirSync(FLEET, { recursive: true });
  fs.appendFileSync(DECISIONS, `${JSON.stringify(event)}\n`);
}

/* ---------------------------------------------------------------- liveness */

/**
 * Two facts read out of the harness's own sidecars: the label the lead gave the
 * Agent call, and the mtime of the crewmate's transcript - which advances while
 * it works and is therefore a free alive/dead read needing no bookkeeping.
 *
 * An unknown activeAt counts as NOT live, so every guard fails toward warning
 * rather than toward silence.
 */
function agentFacts(transcriptPath) {
  const out = {};
  const roots = [];
  if (transcriptPath) roots.push(path.join(transcriptPath.replace(/\.jsonl$/i, ''), 'subagents'));
  const projectDir = path.join(os.homedir(), '.claude', 'projects', REPO.replace(/[:\\/]/g, '-'));
  try {
    for (const e of fs.readdirSync(projectDir, { withFileTypes: true })) {
      if (e.isDirectory()) roots.push(path.join(projectDir, e.name, 'subagents'));
    }
  } catch {
    /* no session history - labels stay blank, liveness unknown */
  }
  for (const root of roots) {
    let files = [];
    try {
      files = fs.readdirSync(root).filter((f) => f.endsWith('.meta.json'));
    } catch {
      continue;
    }
    for (const file of files) {
      const key = file.replace(/\.meta\.json$/, '');
      out[key] = out[key] || {};
      const meta = readJson(path.join(root, file));
      if (meta && meta.description && !out[key].description) out[key].description = meta.description;
      try {
        // The transcript, not the sidecar: .meta.json is written once at
        // dispatch so its mtime says when the crewmate STARTED; the .jsonl
        // grows every turn, so its mtime says when it last did something.
        const seen = fs.statSync(path.join(root, `${key}.jsonl`)).mtimeMs;
        if (!out[key].activeAt || seen > out[key].activeAt) out[key].activeAt = seen;
      } catch {
        /* no transcript - not live */
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------- landed work */

/**
 * firstmate's landed-work predicate, which is strictly stronger than an
 * ahead-count. Work has landed when it is reachable from the base OR its
 * content is already there - the squash-merge case, where a branch's commits
 * exist nowhere but its tree is identical to the base's.
 *
 * The naive version is what made `lane discard` refuse two already-merged lanes
 * on 2026-08-06: a squash rewrites the patch-id, so `ahead` stays non-zero
 * forever on work that shipped days ago.
 */
/**
 * Uncommitted files that would actually be LOST — the number `land` and `teardown`
 * refuse on.
 *
 * UNTRACKED `.data/` entries do not count. That directory is the app's runtime state,
 * so any crewmate that boots the app — which every crewmate under the before/after
 * screenshot rule now does — ends with `.data/owner-draft/` and
 * `.data/starter-catalog-backups/` written by the server. Those are regenerated on
 * next boot, they are never a deliverable, and counting them meant a finished branch
 * was refused for output nobody wanted. That happened four times in one session, and
 * the manual fix each time was `rm -rf` inside a worktree — the exact class of command
 * this file exists to keep people away from.
 *
 * The narrowing is deliberately as small as it can be. Only the `??` untracked marker
 * is ignored, and only under `.data/`: a TRACKED `.data/` file that a crewmate modified
 * still counts, because the founder has tracked files in there (`advanced-controls.json`,
 * `generation-preset.json`) and a change to one of those is real work. Everything the
 * guard was built for — a crewmate whose only deliverable is gitignored scratch, which
 * is swept with its worktree — still trips it.
 */
export function countDirty(porcelain) {
  return String(porcelain ?? '')
    .split('\n')
    .filter(Boolean)
    .filter((line) => !/^\?\?\s+\.data\//.test(line))
    .length;
}

function landedState(branch) {
  const ahead = Number(git(['rev-list', '--count', `${BASE}..${branch}`]) || '0');
  if (ahead === 0) return { landed: true, ahead: 0, how: 'ancestor' };
  // Squash check: merging it changes nothing, so the content is already in.
  const merged = git(['merge-tree', '--write-tree', BASE, branch]);
  const baseTree = git(['rev-parse', `${BASE}^{tree}`]);
  if (merged && baseTree && merged.split('\n')[0].trim() === baseTree) {
    return { landed: true, ahead, how: 'squashed' };
  }
  return { landed: false, ahead, how: 'unlanded' };
}

/* ------------------------------------------------------------------ roster */

function roster(transcriptPath) {
  if (!fs.existsSync(WORKTREES)) return [];
  const porcelain = git(['worktree', 'list', '--porcelain']);
  if (!porcelain) return [];

  const rows = [];
  let cur = null;
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('worktree ')) cur = { dir: line.slice(9).trim(), branch: '' };
    else if (line.startsWith('branch ') && cur) cur.branch = line.slice(7).replace('refs/heads/', '').trim();
    else if (line === '' && cur) {
      rows.push(cur);
      cur = null;
    }
  }
  if (cur) rows.push(cur);

  const facts = agentFacts(transcriptPath);
  const now = Date.now();

  return rows
    .filter((r) => path.resolve(r.dir).toLowerCase().startsWith(WORKTREES.toLowerCase()))
    .map((r) => {
      const name = path.basename(r.dir);
      const id = name.replace(/^agent-/, '');
      const meta = readMeta(id) || readMeta(name) || {};
      const fact = facts[name] || {};
      const idleMs = fact.activeAt ? now - fact.activeAt : Infinity;
      const state = landedState(r.branch);
      return {
        name,
        id,
        dir: r.dir,
        branch: r.branch,
        ...state,
        dirty: countDirty(git(['status', '--porcelain'], r.dir)),
        live: idleMs < LIVE_WINDOW_MS,
        idleMs,
        kind: meta.kind || 'ship',
        mode: meta.mode || 'local-only',
        megaFiles: meta.megaFiles || [],
        what: meta.brief || fact.description || '',
      };
    });
}

/* ---------------------------------------------------------------- snapshot */

/**
 * ONE read-only structured view that every human projection is rendered FROM.
 * The old system had `lane list`, `work:ledger`, `lanes:ready` and
 * `tickets:ready` each re-deriving state independently, which meant four
 * answers that could disagree. There is now one.
 */
function snapshot(transcriptPath) {
  const crew = roster(transcriptPath);
  const held = new Map();
  for (const c of crew) {
    if (!c.live) continue;
    for (const f of c.megaFiles) held.set(f, c.name);
  }
  return {
    version: 1,
    base: BASE,
    crewMode: Boolean((readActive() || {}).on),
    // Named `lastKnown` on purpose: firstmate's anti-footgun is that a field
    // whose value is an event must never be mistaken for current state.
    crew,
    underway: crew.filter((c) => c.live),
    unlanded: crew.filter((c) => !c.live && !c.landed),
    reapable: crew.filter((c) => !c.live && c.landed),
    sweepRisk: crew.filter((c) => !c.landed && c.ahead === 0 && c.dirty > 0),
    megaFilesHeld: Object.fromEntries(held),
    decisions: openDecisions(),
    baseAheadOfRemote: Number(git(['rev-list', '--count', `github/${BASE}..${BASE}`]) || '0'),
  };
}

/* ---------------------------------------------------------------- bearings */

/**
 * firstmate's four mandatory sections, always all four, always in this order.
 * An empty section prints "(none)" rather than being omitted - silence read as
 * success is this repo's documented recurring failure, and a section that
 * disappears when empty is indistinguishable from a section that was not
 * checked.
 */
function bearings(snap, includePrs) {
  const out = [];
  const section = (title, lines) => {
    out.push('', title);
    out.push(...(lines.length ? lines : ['  (none)']));
  };

  // The mission goes FIRST and is the only section that may be absent rather
  // than "(none)" - because an absent mission is a real answer ("this is
  // one-off work"), where an absent Captain's Call would be a claim.
  const mission = readMission();
  if (mission) {
    out.push('', 'MISSION', ...mission.split('\n').map((l) => `  ${l}`));
  }

  section(
    "CAPTAIN'S CALL",
    [
      ...snap.decisions.map((d, i) => `  ${i + 1}. ${d.question}${d.recommend ? `   (rec: ${d.recommend})` : ''}`),
      ...snap.unlanded.map((c) => `  land or discard: ${c.branch}  ${c.ahead} commit(s)  ${c.what}`),
      ...snap.sweepRisk.map((c) => `  ${c.name} holds ${c.dirty} uncommitted file(s) and WILL BE DELETED when it ends`),
    ],
  );

  section(
    'RECENTLY LANDED',
    git(['log', '--oneline', '-8', '--no-merges', BASE])
      .split('\n')
      .filter(Boolean)
      .map((l) => `  ${l}`),
  );

  section(
    'UNDERWAY',
    snap.underway.map(
      (c) =>
        `  ${c.name}  ${c.kind}  ${c.ahead ? `${c.ahead} commit(s) so far` : 'nothing committed yet'}` +
        `${c.megaFiles.length ? `  holds ${c.megaFiles.join(', ')}` : ''}  ${c.what}`,
    ),
  );

  const next = [];
  const briefed = snap.crew.filter((c) => readBrief(c.id));
  if (briefed.length) {
    next.push(`  ${briefed.length} crewmate brief(s) on disk: fleet brief <name>  (what it was actually asked to do)`);
  }
  if (snap.reapable.length) next.push(`  ${snap.reapable.length} worktree(s) reapable: fleet teardown <name>`);
  if (snap.baseAheadOfRemote > 0) {
    next.push(`  ${BASE} is ${snap.baseAheadOfRemote} commit(s) ahead of github/${BASE} - unpushed`);
  }
  if (includePrs) {
    const prs = runGh(['pr', 'list', '--state', 'open', '--limit', '10', '--json', 'number,title', '--jq', '.[]|"  #\\(.number) \\(.title)"']);
    if (prs) next.push(...prs.split('\n').filter(Boolean));
  }
  section('CHARTED NEXT', next);

  return out.join('\n');
}

function runGh(args) {
  try {
    return execFileSync('gh', args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/* ------------------------------------------------------- contract residency */

/**
 * ~70 words, paid on every user turn. Cheap enough to be unconditional, which
 * is the point: the contract used to live in a one-shot slash expansion that
 * fired successfully ZERO times in four sessions, and the two threads that
 * dispatched crewmates without it stranded work and ran three agents unisolated.
 */
function contract() {
  return [
    'CREW MODE is ON. You are the first mate: crewmates write, you read, dispatch and report.',
    'One background Agent per task, isolation "worktree", all in ONE message.',
    'A crewmate costs ~70k tokens and 8-15 min before its first line - below that, do it inline and say so.',
    'Never refuse to dispatch because a task looks small; pick the cheaper tool.',
    'kind=scout returns a report and no branch. Landing is the captain\'s verb and it is a LOCAL merge.',
    'Full contract: .claude/commands/crew.md',
  ].join(' ');
}

function rosterLines(snap) {
  if (!snap.crew.length) return ['  (no crewmates out)'];
  return snap.crew.map((c) => {
    const what = c.what ? `  ${c.what}` : '';
    if (c.live) return `  ${c.name}  WORKING (${c.ahead ? `${c.ahead} commit(s)` : 'nothing committed yet'}) - leave it alone${what}`;
    if (!c.landed) return `  ${c.name}  ${c.ahead} commit(s) NOT LANDED  ->  fleet land ${c.name}${what}`;
    if (c.dirty) return `  ${c.name}  ${c.dirty} uncommitted file(s) - WILL BE DELETED when it ends${what}`;
    return `  ${c.name}  landed (${c.how}) - fleet teardown ${c.name}${what}`;
  });
}

/* ------------------------------------------------------------------- verbs */

function cmdLand(name) {
  const snap = snapshot(null);
  const c = snap.crew.find((x) => x.name === name || x.name === `agent-${name}` || x.branch === name);
  if (!c) return fail(`no crewmate worktree named '${name}'. Try: fleet bearings`);
  if (c.live) return fail(`${c.name} is still working (idle ${Math.round(c.idleMs / 1000)}s). Landing now would merge a half-finished branch.`);
  if (c.dirty) return fail(`${c.name} has ${c.dirty} uncommitted file(s). It must commit them or they are lost.`);
  if (c.landed) return say(`${c.name} is already landed (${c.how}). Nothing to do - run: fleet teardown ${c.name}`);
  if (!gitOk(['merge', '--no-ff', '-m', `Land crewmate: ${c.what || c.name}`, c.branch])) {
    return fail(`merge of ${c.branch} failed. Merge ${BASE} INTO the branch and retry - never rebase shared history.`);
  }
  appendStatus(c.id, `landed ${c.branch}`);
  return say(`landed ${c.branch} into ${BASE}. Run npm run check:full before pushing.`);
}

/**
 * Fail-closed teardown. firstmate refuses to return a worktree whose work has
 * not landed; the old lane runner's discard carried the same scar in a comment
 * ("reading the second as zero is how a discard came to destroy commits").
 */
function cmdTeardown(name) {
  const snap = snapshot(null);
  const c = snap.crew.find((x) => x.name === name || x.name === `agent-${name}`);
  if (!c) return fail(`no crewmate worktree named '${name}'`);
  if (c.live) return fail(`${c.name} is still working. Refusing.`);
  if (c.dirty) return fail(`${c.name} has ${c.dirty} uncommitted file(s). Refusing - commit or lose them.`);
  if (!c.landed) return fail(`${c.name} holds ${c.ahead} unlanded commit(s). Refusing. Run: fleet land ${c.name}`);

  // Unlink junctions before removing. Never recurse: that walks THROUGH the
  // junctions into node_modules and hangs.
  for (const rel of ['node_modules', 'client/node_modules', 'server/node_modules', 'marketing/node_modules', '_local/tools']) {
    const p = path.join(c.dir, rel);
    try {
      if (fs.lstatSync(p).isSymbolicLink() || fs.lstatSync(p).isDirectory()) fs.unlinkSync(p);
    } catch {
      try {
        fs.rmdirSync(p);
      } catch {
        /* not a link, or already gone */
      }
    }
  }
  gitOk(['worktree', 'remove', '--force', c.dir]);
  gitOk(['worktree', 'prune']);
  gitOk(['branch', '-d', c.branch]);
  appendStatus(c.id, `torn down ${c.branch}`);
  return say(`removed ${c.name} and deleted ${c.branch}.`);
}

/**
 * Record what git cannot derive about a dispatch, and refuse a second crewmate
 * on a mega-file another live one already holds. This is the entire replacement
 * for the hot lock, the scope-claim registry and the LUVLEY_WORKER dance.
 */
function cmdRegister(args) {
  const id = args[0];
  if (!id) return fail('usage: fleet register <agent-id> [--kind ship|scout] [--mode local-only|direct-PR] [--mega <paths>] [--brief "<text>"]');
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? null : args[i + 1];
  };
  const mega = (get('--mega') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const unknown = mega.filter((m) => !MEGA_FILES.includes(m));
  if (unknown.length) return fail(`not mega-files (no lock needed, just edit them): ${unknown.join(', ')}`);

  const snap = snapshot(null);
  for (const f of mega) {
    const holder = snap.megaFilesHeld[f];
    if (holder && holder !== `agent-${id}`) return fail(`${holder} already holds ${f}. Hold this task until it lands.`);
  }
  writeMeta(id, {
    id,
    kind: get('--kind') || 'ship',
    mode: get('--mode') || 'local-only',
    megaFiles: mega,
    brief: get('--brief') || '',
    created: new Date().toISOString(),
  });
  appendStatus(id, `registered kind=${get('--kind') || 'ship'} mega=[${mega.join(' ')}]`);
  return say(`registered ${id}${mega.length ? ` holding ${mega.join(', ')}` : ''}`);
}

/* ------------------------------------------------------------------- hooks */

function readStdin() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : null;
  } catch {
    return null;
  }
}

function emitContext(event, text) {
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text } })}\n`);
}

/* --------------------------------------------------------------------- cli */

const say = (m) => {
  process.stdout.write(`${m}\n`);
  return 0;
};
const fail = (m) => {
  process.stderr.write(`fleet: ${m}\n`);
  return 1;
};

const [, , cmd = 'bearings', ...rest] = process.argv;

switch (cmd) {
  case 'on': {
    writeAtomic(ACTIVE, `${JSON.stringify({ on: true, since: new Date().toISOString(), sessionId: null }, null, 2)}\n`);
    process.exit(say('crew mode: ON (claimed by the next turn in this thread). Turn it off with /crew off.'));
    break;
  }
  case 'off': {
    try {
      fs.unlinkSync(ACTIVE);
    } catch {
      /* already off */
    }
    process.exit(say('crew mode: OFF'));
    break;
  }
  case 'snapshot': {
    process.stdout.write(`${JSON.stringify(snapshot(null), null, 2)}\n`);
    process.exit(0);
    break;
  }
  case 'bearings': {
    const snap = snapshot(null);
    process.stdout.write(`crew mode: ${snap.crewMode ? 'ON' : 'off'}${bearings(snap, rest.includes('PRs') || rest.includes('--prs'))}\n`);
    process.exit(0);
    break;
  }
  case 'mission': {
    const text = rest.join(' ').trim();
    if (!text) {
      const m = readMission();
      process.exit(m ? say(m) : say('(no mission set)  fleet mission "<what this stretch of work is for>"'));
    }
    writeAtomic(MISSION, `${text}\n`);
    process.exit(say('mission set'));
    break;
  }
  case 'brief': {
    const who = (rest[0] || '').replace(/^agent-/, '');
    if (!who) process.exit(fail('usage: fleet brief <name>            read a crewmate\'s brief\n       fleet brief <name> "<text>"  write one'));
    const text = rest.slice(1).join(' ').trim();
    if (!text) {
      const b = readBrief(who);
      process.exit(b ? say(b) : fail(`no brief on disk for ${who}`));
    }
    writeAtomic(briefPath(who), `${text}\n`);
    appendStatus(who, 'brief written');
    process.exit(say(`brief written: ${briefPath(who)}`));
    break;
  }
  case 'register':
    process.exit(cmdRegister(rest));
    break;
  case 'land':
    process.exit(cmdLand(rest[0]));
    break;
  case 'teardown':
    process.exit(cmdTeardown(rest[0]));
    break;
  case 'hold': {
    // Take everything before --rec as the question. Filtering on a leading `--`
    // is not enough: the VALUE of --rec is a bare string too, and it silently
    // ended up appended to the question.
    const cut = rest.indexOf('--rec');
    const question = (cut === -1 ? rest : rest.slice(0, cut)).join(' ').trim();
    if (!question) process.exit(fail('usage: fleet hold "<question>" [--rec "<recommendation>"]'));
    const id = `d${Date.now().toString(36)}`;
    appendDecision({
      type: 'hold',
      id,
      question,
      recommend: cut === -1 ? '' : rest.slice(cut + 1).join(' ').trim(),
      at: new Date().toISOString(),
    });
    process.exit(say(`held: ${id}`));
    break;
  }
  case 'resolve': {
    const open = openDecisions();
    const n = Number(rest[0]);
    const target = open[n - 1];
    if (!target) process.exit(fail(`no open decision #${rest[0]}. Run: fleet bearings`));
    appendDecision({ type: 'resolve', id: target.id, answer: rest.slice(1).join(' '), at: new Date().toISOString() });
    process.exit(say(`resolved ${target.id}`));
    break;
  }
  case 'hook-session-start':
  case 'hook-prompt': {
    const payload = readStdin();
    const state = readActive();
    if (payload && ownedBy(state, payload.session_id)) {
      if (!state.sessionId && payload.session_id) {
        writeAtomic(ACTIVE, `${JSON.stringify({ ...state, sessionId: payload.session_id }, null, 2)}\n`);
      }
      const snap = snapshot(payload.transcript_path);
      const decisions = snap.decisions.length
        ? `\n\nOPEN DECISIONS (the captain owes an answer):\n${snap.decisions.map((d, i) => `  ${i + 1}. ${d.question}`).join('\n')}`
        : '';
      emitContext(
        cmd === 'hook-prompt' ? 'UserPromptSubmit' : 'SessionStart',
        `${contract()}\n\nCREW ROSTER (derived from git, not from memory):\n${rosterLines(snap).join('\n')}${decisions}`,
      );
    }
    process.exit(0);
    break;
  }
  case 'hook-stop': {
    const payload = readStdin();
    // Unreadable payload -> allow. Every uncertainty resolves to ALLOW; that is
    // firstmate's fail-open ladder and the reason his guard never wedges a turn.
    if (!payload) process.exit(0);
    const state = readActive();
    if (!ownedBy(state, payload.session_id)) process.exit(0);
    // NOTE: stop_hook_active is deliberately NOT consulted. Claude Code sets it
    // on EVERY stop after ANY stop-hook continuation, so honouring it disarms
    // the guard permanently after one unrelated block - the exact bug that
    // re-opened firstmate's blind window on 2026-07-21. The loop is bounded by
    // the block budget below instead.
    const snap = snapshot(payload.transcript_path);
    const stranded = snap.unlanded;
    const undecided = snap.decisions;
    if (!stranded.length && !undecided.length) {
      try {
        fs.unlinkSync(path.join(FLEET, 'blocks'));
      } catch {
        /* nothing to reset */
      }
      process.exit(0);
    }

    // Block budget: 3, deliberately below Claude Code's hard 8-consecutive
    // override, so the guard always surrenders on its own terms rather than
    // being force-overridden. Persisted, keyed on session.
    const budgetFile = path.join(FLEET, 'blocks');
    const prev = readJson(budgetFile, { session: '', count: 0 });
    const count = prev.session === payload.session_id ? prev.count + 1 : 1;
    if (count > 3) {
      // Loud attended fail-open. Surrender must be impossible to miss: a guard
      // that goes quiet is read as "the work landed".
      process.stdout.write(
        `${JSON.stringify({
          systemMessage: `CREW BACKSTOP HAS GIVEN UP after 3 blocks. Still unlanded: ${stranded.map((s) => s.branch).join(', ') || 'none'}. Open decisions: ${undecided.length}. Nothing is watching this now.`,
        })}\n`,
      );
      process.exit(0);
    }
    writeAtomic(budgetFile, `${JSON.stringify({ session: payload.session_id, count })}\n`);

    const lines = [];
    if (stranded.length) {
      lines.push(`CREW BACKSTOP (${count}/3): ${stranded.length} crewmate branch(es) hold work that is not on ${BASE}:`);
      lines.push(...stranded.map((s) => `  ${s.branch}  ${s.ahead} commit(s)  ${s.what}`));
      lines.push('', 'Report these to the captain BY BRANCH NAME, or land them: fleet land <name>');
    }
    if (undecided.length) {
      lines.push(`${undecided.length} decision(s) are still open and the captain has not answered:`);
      lines.push(...undecided.map((d, i) => `  ${i + 1}. ${d.question}`));
      lines.push('', 'Surface them in one numbered list with a recommendation each.');
    }
    process.stderr.write(`${lines.join('\n')}\n`);
    process.exit(2);
    break;
  }
  default:
    process.exit(fail(`unknown command '${cmd}'. Try: bearings | snapshot | land | teardown | hold | resolve | register | on | off`));
}
