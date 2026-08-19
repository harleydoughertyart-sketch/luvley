# Luvley

**A studio that re-shoots your product photo, then writes the ad around it.**

Live at **[luvley.ai](https://luvley.ai)** — metered against a credit ledger, taking card
payments. Built and run by one person.

<p align="center">
  <img src="docs/video/reel-candle.gif" width="520" alt="A candle on a kitchen counter becomes a warm studio shot, then a finished ad">
</p>

<p align="center"><em>A candle on a kitchen counter. Four sentences, one at a time. Then the ad writes and lays itself out.</em></p>

---

## Why this exists

Plenty of products will generate you an image. That part is a model call, and the model
isn't mine.

The rare part is everything after it. **A copywriting system built on top of image-to-image,
that a non-technical person can actually steer.** A jeweller shooting a ring on the kitchen
table doesn't need another prompt box — they need to fix the one thing that came out wrong
without losing the rest of the picture, and then they need the words to run beside it.

Everything below is what I built around the model calls to make that possible.

![Who it is for](docs/02-who-its-for.png)

## What it makes

![What it makes](docs/03-what-it-makes.png)

Every one of these started as a phone photograph on a desk, a table or a carpet.

![A phone photo goes in](docs/04-a-phone-photo-goes-in.png)

The product has to survive the trip unchanged. That is the hard half — the cap knurl, the
glass thickness, the brushed channel down the ring. Identity survives while everything
around it is replaced.

---

## What happens between your sentence and the model

![The prompt architecture](docs/05-prompt-architecture.png)

Nothing you type is sent as you typed it. Four blocks compose around it, and each one is
conditional — a patch edit gets the seam laws, a poster gets the copy engine, nothing else
carries either.

![Avoiding the median](docs/06-avoiding-the-median.png)

## Quick Looks

![Quick Looks](docs/07-quick-looks.png)

Saved recipes. Pick your industry, pick a Look, drop in a photo. 249 of them, because a
fashion brief and a jewellery brief need genuinely different language — fashion 82,
jewellery 67, product 33, lighting 30, beauty 28, art 9.

Some are whole shots that run alone. Others are pieces that stack, so one Look's set can sit
under another Look's light.

<table>
<tr>
<td width="50%" align="center">
  <img src="docs/video/reel-interior.gif" width="100%" alt="An empty room staged as a warm living room, then the coffee table swapped twice"><br>
  <sub><em>Spaces — an empty listing, staged</em></sub>
</td>
<td width="50%" align="center">
  <img src="docs/video/reel-fashion.gif" width="100%" alt="A fitting-room sample photo becomes a sunlit coastal terrace shoot"><br>
  <sub><em>Fashion — a fitting-room photo, on location</em></sub>
</td>
</tr>
</table>

---

## Pieces, not presets

![Pieces, not presets](docs/08-quick-blocks.png)

A Look isn't a preset in a dropdown. Some are whole shots meant to run alone; the rest are
pieces, and pieces combine. Every piece belongs to a slot — Studio, Casting, Sets, Lighting,
Camera & FX — and that's what keeps a stack coherent: one Look's set can sit under another
Look's light because the two are answering different questions.

You can write your own too. Save a block of art direction under a name and it stacks like
everything else, or describe what you want in a sentence and let the app draft it.

## More than one good answer

![Variations](docs/09-variations.png)

One edit note becomes several genuinely different directions rather than five rerolls of the
same idea. The rule behind it, from the skill writer: **named angles beat "be diverse."** A
Look declares its own five angles instead of asking a model to be interesting.

## The studio

![The studio](docs/10-the-studio.png)

One canvas. The picture is the hero and the tools sit beside it. Every control is a thing a
designer would want to change — not a setting.

## Fixing one thing

![Refinement](docs/11-refinement.png)

Paint a mask over the part that's wrong and describe only that. Asking for a whole new image
instead gives you a different bottle, a different backdrop and a different light — you'd be
gambling the parts you liked to fix the one you didn't.

<p align="center">
  <img src="docs/video/reel-ring.gif" width="420" alt="A mask sweeps the ring finger and a referenced ring lands on it">
</p>

<p align="center"><em>Drop in a reference, mask the finger, and the ring lands on it — the rest of the photograph untouched.</em></p>

### Three laws a patch has to obey

![The image-to-image laws](docs/13-image-to-image-laws.png)

These go out with every refinement, and each one exists because of a specific way the edit
goes wrong. The one I'm proudest of: *mood words describe content, never pixels.* A sadder
expression means changed brows, eyes and mouth — not cooler or darker pixels.

## Two versions, no losing one

![Compare versions](docs/12-compare.png)

A generated result and the photo it came from, side by side, with three ways out: take the new
one, keep the old one, or put the new one on its own layer and decide later. Nothing is
overwritten while you are still deciding.

## Layers

![Layers](docs/14-layers.png)

Every refinement lands as its own layer above the original, which is never painted on. Turn
them off and on to see exactly what changed.

<p align="center">
  <img src="docs/video/reel-layers.gif" width="620" alt="Refinement layers toggling on one at a time, a sketch resolving into a finished render">
</p>

<p align="center"><em>Background, clean linework, staff design, head redesign, colour, polish — each its own layer, each switchable.</em></p>

## Finishing

The last mile is the part people give up on: the picture is right but it's flat. Clarity,
glow, punch-in and a compare wipe are all here, so nobody has to open another application to
warm up a render.

![Finish](docs/17-finish.png)

<p align="center">
  <img src="docs/video/finish-demo.gif" width="620" alt="Finish mode: clarity, punch-in, glow sliders and a compare wipe">
</p>

---

## Making the picture bigger than it was shot

![Expand](docs/15-expand.png)

A phone photo is the wrong shape for almost every placement. Cropping to fit throws away the
product; expanding invents the room around it instead.

![Crop](docs/16-crop.png)

And when cropping *is* the right answer, the aspect list is the one a designer expects —
square, 4:3 through 21:9, 3:4 through 9:21.

## Turn it into an ad

![Turn into ad](docs/18-turn-into-ad.png)

The photograph is also the brief. You type anything true about the product, pick where the ad
will run, and it writes the copy and lays it out over the picture. Seven placements, each
carrying a real aspect ratio.

### The design is its own control

![The design is its own control](docs/19-ad-design-control.png)

Eighty-three layouts in six families, and every tile is a render rather than a wireframe —
what you pick is what you get. The wording and the layout are decided by different things on
purpose, so once the copy is written you can change only how it looks.

**A layout is never allowed to write a word.** The planner writes the copy from your brief;
the layout only dresses it. Keeping those two apart is what stops a design choice leaking into
what the ad says.

![CopyEngine](docs/20-copy-engine.png)

![What it will not say](docs/21-what-it-will-not-say.png)

It never asks whether a sentence is true. It asks whether the seller supplied something that
licenses it, and it drops the line when nobody did.

---

## How it is put together

![Architecture](docs/22-architecture.png)

## The tests cannot spend money

![Test isolation](docs/23-under-it.png)

The end-to-end tests drive the real server, and that server holds real image-model keys in
production. So the test environment isn't a copy of a developer's with the dangerous keys
removed — it starts as an empty object, and only the variables Node needs to boot are copied
in. A list of keys to *delete* would have failed the first time somebody added a provider.

---

## Code

The product is commercial, so the application source stays private. These five modules are
self-contained and are the ones worth reading:

| File | What it is |
| --- | --- |
| [`inpaintBrushMath.ts`](code/inpaintBrushMath.ts) | Pressure, taper, hardness and spacing — the arithmetic behind the brush |
| [`inpaintRectMath.ts`](code/inpaintRectMath.ts) | The dirty-rectangle algebra that makes undo cheap |
| [`route-table-fingerprint.mjs`](code/route-table-fingerprint.mjs) | Boots the real server, walks the router in order and hashes every handler — how a 5,300-line file was split into fifteen pieces and *proved* unchanged |
| [`fleet.mjs`](code/fleet.mjs) | The orchestrator I built to run coding agents in parallel, one per isolated worktree |
| [`ui-evidence.mjs`](code/ui-evidence.mjs) | Renders before/after evidence sheets, and exits non-zero if a row proves nothing |

## Built with

React 18 · TypeScript · Vite · Canvas 2D and Pointer Events · Node · Express · sharp ·
Firestore · Cloud Run · Stripe · Google Gemini and OpenAI image models · Playwright

---

The screenshots are the real editor, driven by a browser against a credential-free local
backend. The pictures are real output from the live product.