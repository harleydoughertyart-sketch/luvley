# Luvley

**A studio that re-shoots your product photo, then writes the ad around it.**

Live at **[luvley.ai](https://luvley.ai)**. Metered against a credit ledger, taking card
payments. Built and run by one person.

<p align="center">
  <img src="docs/video/reel-candle.webp" width="520" alt="A candle on a kitchen counter becomes a warm studio shot, then a finished ad">
</p>

<p align="center"><em>A candle on a kitchen counter. Four sentences, one at a time. Then the ad writes and lays itself out.</em></p>

---

## Why this exists

Plenty of products will generate you an image. That part is a model call, and the model
isn't mine.

The rare part is everything after it. **A copywriting system built on top of image-to-image,
that a non-technical person can actually steer.** A jeweller shooting a ring on the kitchen
table doesn't need another prompt box. They need to fix the one thing that came out wrong
without losing the rest of the picture, and then they need the words to run beside it.

Everything below is what I built around the model calls to make that possible.

![Who it is for](docs/02-who-its-for.webp)

## What it makes

![What it makes](docs/03-what-it-makes.webp)

Every one of these started as a phone photograph on a desk, a table or a carpet.

![A phone photo goes in](docs/04-a-phone-photo-goes-in.webp)

The product has to survive the trip unchanged. That is the hard half: the cap knurl, the
glass thickness, the brushed channel down the ring. Identity survives while everything
around it is replaced.

---

## What happens between your sentence and the model

![The prompt architecture](docs/05-prompt-architecture.webp)

Nothing you type is sent as you typed it. Four blocks compose around it, and each one is
conditional. A patch edit gets the seam laws, a poster gets the copy engine, nothing else
carries either.

## Quick Looks

![Quick Looks](docs/06-quick-looks.webp)

Saved recipes. Pick your industry, pick a Look, drop in a photo. 249 of them, because a
fashion brief and a jewellery brief need genuinely different language. Fashion 82,
jewellery 67, product 33, lighting 30, beauty 28, art 9.

Some are whole shots that run alone. Others are pieces that stack, so one Look's set can sit
under another Look's light.

<table>
<tr>
<td width="50%" align="center">
  <img src="docs/video/reel-interior.webp" width="100%" alt="An empty room staged as a warm living room, then the coffee table swapped twice"><br>
  <sub><em>Spaces: an empty listing, staged</em></sub>
</td>
<td width="50%" align="center">
  <img src="docs/video/reel-fashion.webp" width="100%" alt="A fitting-room sample photo becomes a sunlit coastal terrace shoot"><br>
  <sub><em>Fashion: a fitting-room photo, on location</em></sub>
</td>
</tr>
</table>

---

## Pieces, not presets

![Pieces, not presets](docs/07-quick-blocks.webp)

A Look isn't a preset in a dropdown. Some are whole shots meant to run alone; the rest are
pieces, and pieces combine. Every piece belongs to a slot: Studio, Casting, Sets, Lighting,
Camera & FX. That is what keeps a stack coherent. one Look's set can sit under another
Look's light because the two are answering different questions.

You can write your own too. Save a block of art direction under a name and it stacks like
everything else, or describe what you want in a sentence and let the app draft it.

## More than one good answer

![Variations](docs/08-variations.webp)

One edit note becomes several genuinely different directions rather than five rerolls of the
same idea. The rule behind it, from the skill writer: **named angles beat "be diverse."** A
Look declares its own five angles instead of asking a model to be interesting.

## The studio

![The studio](docs/09-the-studio.webp)

One canvas. The picture is the hero and the tools sit beside it. Every control is a thing a
designer would want to change, not a setting.

## Fixing one thing

![Refinement](docs/10-refinement.webp)

Paint a mask over the part that's wrong and describe only that. Asking for a whole new image
instead gives you a different bottle, a different backdrop and a different light. You would be
gambling the parts you liked to fix the one you didn't.

<p align="center">
  <img src="docs/video/reel-ring.webp" width="420" alt="A mask sweeps the ring finger and a referenced ring lands on it">
</p>

<p align="center"><em>Drop in a reference, mask the finger, and the ring lands on it, the rest of the photograph untouched.</em></p>

### Three laws a patch has to obey

![The image-to-image laws](docs/12-image-to-image-laws.webp)

These go out with every refinement, and each one exists because of a specific way the edit
goes wrong. The one I'm proudest of: *mood words describe content, never pixels.* A sadder
expression means changed brows, eyes and mouth, not cooler or darker pixels.

## Two versions, no losing one

![Compare versions](docs/11-compare.webp)

A generated result and the photo it came from, side by side, with three ways out: take the new
one, keep the old one, or put the new one on its own layer and decide later. Nothing is
overwritten while you are still deciding.

## Layers

Every refinement lands as its own layer above the original, which is never painted on. Turn
them off and on to see exactly what changed.

<p align="center">
  <img src="docs/video/reel-layers.webp" width="620" alt="Refinement layers toggling on one at a time, a sketch resolving into a finished render">
</p>

<p align="center"><em>Background, clean linework, staff design, head redesign, colour, polish. Each its own layer, each switchable.</em></p>

## Finishing

The last mile is the part people give up on: the picture is right but it's flat. Clarity,
glow, punch-in and a compare wipe are all here, so nobody has to open another application to
warm up a render.

![Finish](docs/15-finish.webp)

<p align="center">
  <img src="docs/video/finish-demo.webp" width="620" alt="Finish mode: clarity, punch-in, glow sliders and a compare wipe">
</p>

---

## Making the picture bigger than it was shot

![Expand](docs/13-expand.webp)

A phone photo is the wrong shape for almost every placement. Cropping to fit throws away the
product; expanding invents the room around it instead.

![Crop](docs/14-crop.webp)

And when cropping *is* the right answer, the aspect list is the one a designer expects:
square, 4:3 through 21:9, 3:4 through 9:21.

## Turn it into an ad

![Turn into ad](docs/16-turn-into-ad.webp)

The photograph is also the brief. You type anything true about the product, pick where the ad
will run, and it writes the copy and lays it out over the picture. Seven placements, each
carrying a real aspect ratio.

### The design is its own control

![The design is its own control](docs/17-ad-design-control.webp)

Eighty-three layouts in six families, and every tile is a render rather than a wireframe.
what you pick is what you get. The wording and the layout are decided by different things on
purpose, so once the copy is written you can change only how it looks.

**A layout is never allowed to write a word.** The planner writes the copy from your brief;
the layout only dresses it. Keeping those two apart is what stops a design choice leaking into
what the ad says.

![CopyEngine](docs/18-copy-engine.webp)

![What it will not say](docs/19-what-it-will-not-say.webp)

It never asks whether a sentence is true. It asks whether the seller supplied something that
licenses it, and it drops the line when nobody did.

---

## How it is put together

![Architecture](docs/20-architecture.webp)

## The tests cannot spend money

![Test isolation](docs/21-under-it.webp)

The end-to-end tests drive the real server, and that server holds real image-model keys in
production. So the test environment isn't a copy of a developer's with the dangerous keys
removed. It starts as an empty object, and only the variables Node needs to boot are copied
in. A list of keys to *delete* would have failed the first time somebody added a provider.

---

## Where this started

![The command hub of the ComfyUI prototype](docs/prototype/00-command-hub.webp)

Before Luvley was software it was a ComfyUI graph — **467 nodes, 421 links, 56 groups** —
called Concept Art Studio 2.0. The screenshot above is its control panel.

Those columns are Fast Groups Muter panels. Each row mutes or unmutes a branch of the graph,
so a stack of yes/no toggles became a command surface: pick a model, pick a prompt operation,
pick an operation, pick an action. **The graph was already trying to be an application.** It
just made whoever used it hold four hundred nodes in their head to get one picture out.

Read those panels against the shipped product and the lineage is not subtle.

| Panel in the graph | What it became |
| --- | --- |
| **Model** — Nano Banana Pro, Nano Banana Cheap, Qwen Edit | The generation presets behind Create |
| **Prompts Ops** — Enhanced Prompt, Outpaint Caption, Variation Gen | Enhance, and the variation cards |
| **Operations** — InPaint, Mask Crop, Composite Masked, Bilateral Filter | Refinement: the working canvas, the draft mask, the stacked patch layers |
| **Actions** — Materializer, Stylerizer, Turn Around Extractor | Skills, and the Looks that run alone |
| **Art Styles · Lighting · Background** | Three separate stackable axes — which is the whole idea behind the Quick Looks slots |

Thirty more groups in there are single-node blocks of saved art direction. Those are Quick
Blocks now.

**A node graph is a wonderful place to find out what you are building and a poor place to
ship it from.** Every toggle above is global state with no owner. Nothing validates an input,
so a bad image fails somewhere deep and quietly. There is no per-user anything, no way to
meter a run, and no way to fail politely at somebody who is paying. Twenty-five of those
groups are typed server routes now — and those four muter panels are the reason the app has
presets, operations and stackable Looks at all, rather than one prompt box.

**[The full atlas — all 25 functional groups, one at a time →](docs/comfyui-prototype.md)**

The workflow ships with this repository:
[`Concept-Art-Studio-2.0.workflow.json`](workflow/Concept-Art-Studio-2.0.workflow.json),
627 KB, unmodified. It will not run out of the box — the API branches are hosted nodes from
the RunningHub era — so it is published as architecture, not as something to install.

---

## Code

The product is commercial, so the application source stays private. These five modules are
self-contained and are the ones worth reading:

| File | What it is |
| --- | --- |
| [`inpaintBrushMath.ts`](code/inpaintBrushMath.ts) | Pressure, taper, hardness and spacing. The arithmetic behind the brush |
| [`inpaintRectMath.ts`](code/inpaintRectMath.ts) | The dirty-rectangle algebra that makes undo cheap |
| [`route-table-fingerprint.mjs`](code/route-table-fingerprint.mjs) | Boots the real server, walks the router in order and hashes every handler. How a 5,300-line file was split into fifteen pieces and *proved* unchanged |
| [`fleet.mjs`](code/fleet.mjs) | The orchestrator I built to run coding agents in parallel, one per isolated worktree |
| [`ui-evidence.mjs`](code/ui-evidence.mjs) | Renders before/after evidence sheets, and exits non-zero if a row proves nothing |

## Built with

React 18 · TypeScript · Vite · Canvas 2D and Pointer Events · Node · Express · sharp ·
Firestore · Cloud Run · Stripe · Google Gemini and OpenAI image models · Playwright

---

The screenshots are the real editor, driven by a browser against a credential-free local
backend. The pictures are real output from the live product.

Luvley is a commercial product and this repository carries no licence: the code and images
here are published to be read, not reused. Ask me if you want to do something with any of it
— [harleydoughertyart@gmail.com](mailto:harleydoughertyart@gmail.com).