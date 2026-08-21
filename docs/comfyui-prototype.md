# Concept Art Studio 2.0

**The ComfyUI graph that became Luvley — every functional group, one at a time.**

This is the long version. The short one is the [*Where this started*](../README.md#where-this-started)
section of the main case study.

Screenshot first, short explanation second. The command hub is shown as the primitive control
surface, the final compare node as the review endpoint. The one-node prompt preset blocks are
listed but not expanded, because they are instruction snippets rather than functional routes.

## At a glance

| Item | Count |
| --- | ---: |
| Workflow nodes | 467 |
| Links | 421 |
| Groups | 56 |
| Unique node classes | 63 |
| Hub / review context cards | 2 |
| Functional groups shown | 25 |
| Prompt preset blocks skipped | 30 |
| Total presentation cards | 27 |

## The workflow itself

The original beta workflow ships with this repository:

| File | Size |
| --- | --- |
| [`Concept-Art-Studio-2.0.workflow.json`](../workflow/Concept-Art-Studio-2.0.workflow.json) | 627,583 bytes |
| [`Concept-Art-Studio-2.0.workflow.zip`](../workflow/Concept-Art-Studio-2.0.workflow.zip) | 96,943 bytes |

`SHA-256: 45022B06547C776ABDC7E47460FAEF58EAE11C3DE8E9513C1EC9B4BF9C2E5A66`

**It will not run out of the box, and that is expected.** The public packs it depends on
(`rgthree-comfy`, `comfyui-kjnodes`, `comfyui_layerstyle`, `ComfyUI-Crystools`,
`ComfyUI-Custom-Scripts`, `ComfyUI-Image-Filters`, `Comfyui-QwenEditUtils`,
`ComfyUI-qwenmultiangle`, `ComfyUI_RH_APICall`) install cleanly, but the remaining `RH_*`
and beta utility classes are hosted API nodes from the RunningHub era. They are published
here as historical workflow architecture, not as a one-click installer. The JSON is the
unmodified original — nothing was rewritten to make it look tidier than it was.

---

## Command hub and review endpoint

### 01. Command Hub

![Command Hub](prototype/00-command-hub.webp)

**Primitive app control surface.** Fast Groups Muter panels turned the graph into a usable
command layer: model choice, prompt ops, operations, actions, styles, lighting and
backgrounds could all be toggled from one hub.

### 02. Final RGB Compare

![Final RGB Compare](prototype/00-rgb-compare.webp)

**Review endpoint.** The rgthree comparer made output review visible inside the workflow,
before committing to a result.

---

## Functional groups

### 01. InPaint

![InPaint](prototype/01-inpaint.webp)

**Localized repair loop.** Crops a masked area, sends only the needed working region through
generation, then stitches it back into the full image.

### 02. Outpaint Caption

![Outpaint Caption](prototype/02-outpaint-caption.webp)

**Image-to-prompt bridge.** Reads the current image into a caption so outpaint work starts
from visual context, not a blank prompt.

### 03. Enhance Prompt

![Enhance Prompt](prototype/03-enhance-prompt.webp)

**Fast prompt rewrite.** Combines the base prompt and image context into a cleaner
instruction before generation.

### 04. Multi Camera View

![Multi Camera View](prototype/04-multi-camera-view.webp)

**Turnaround consistency.** Uses Qwen edit models and camera prompts to explore a subject
from multiple angles while preserving identity.

### 05. Use Color Pallet

![Use Color Pallet](prototype/05-use-color-pallet.webp)

**Palette control.** Injects a loaded color reference into the route so color direction can
stay intentional.

### 06. Bilateral Filter

![Bilateral Filter](prototype/06-bilateral-filter.webp)

**Readable polish pass.** Smooths noisy detail while keeping edges, giving rough generations
a cleaner concept-art read.

### 07. Simple Upscale

![Simple Upscale](prototype/07-simple-upscale.webp)

**Resolution handoff.** Scales the working image to a target megapixel size before later
detail, stitch or delivery steps.

### 08. Qwen Edit

![Qwen Edit](prototype/08-qwen-edit.webp)

**Reference-aware editing.** Routes the base image, final prompt and optional refs through a
Qwen edit branch for controlled image changes.

### 09. Prompt Variation

![Prompt Variation](prototype/09-prompt-variation.webp)

**Exploration engine.** Turns one prompt into multiple structured options so creative
direction can branch without starting over.

### 10. Nano Banana Pro

![Nano Banana Pro](prototype/10-nano-banana-pro.webp)

**High quality edit branch.** Sends the prompt, base image and refs to the stronger
image-edit API path for higher-fidelity results.

### 11. Bilateral Mask

![Bilateral Mask](prototype/11-bilateral-mask.webp)

**Filtered mask composite.** Applies edge-preserving filtering through a mask, then
composites the result back into the image.

### 12. Prompt Variation Gen Beta

![Prompt Variation Gen Beta](prototype/12-prompt-variation-gen-beta.webp)

**Early variation prototype.** An earlier LLM variation route that tested structured prompt
expansion before the workflow was refined.

### 13. Composite Masked

![Composite Masked](prototype/13-composite-masked.webp)

**Mask merge utility.** Expands a mask and composites a processed image back over the base,
creating a reusable merge point.

### 14. Enhanced Prompt

![Enhanced Prompt](prototype/14-enhanced-prompt.webp)

**LLM prompt upgrade.** Uses the base image, prompt and references to produce a stronger
generation prompt.

### 15. Prompt Variation Gen

![Prompt Variation Gen](prototype/15-prompt-variation-gen.webp)

**Automatic prompt set.** Builds a multi-prompt string from the base prompt, refs and
variation count for batch exploration.

### 16. Clean Up Painting

![Clean Up Painting](prototype/16-clean-up-painting.webp)

**Directed cleanup prompt.** Uses the current prompt and image context to generate
instructions for tightening a rough painting.

### 17. Adjust Silhouette V

![Adjust Silhouette V](prototype/17-adjust-silhouette-v.webp)

**Shape revision prompt.** Creates focused edit instructions for silhouette changes without
rewriting the whole image.

### 18. Nano Banana Cheap

![Nano Banana Cheap](prototype/18-nano-banana-cheap.webp)

**Fast edit branch.** Routes the same edit inputs through a cheaper image API path for
quicker iteration.

### 19. Nano Banana PRO Cheap

![Nano Banana PRO Cheap](prototype/19-nano-banana-pro-cheap.webp)

**Balanced pro edit branch.** Keeps the pro-style image edit route but uses the lower-cost
API variant.

### 20. Adjust Small Details V

![Adjust Small Details V](prototype/20-adjust-small-details-v.webp)

**Detail revision prompt.** Generates targeted instructions for small local changes while
keeping the larger composition intact.

### 21. Mask Crop

![Mask Crop](prototype/21-mask-crop.webp)

**Prep before inpaint.** Crops the base image and mask into a generation-ready patch so the
model receives the right local context.

### 22. Turn Around Extractor

![Turn Around Extractor](prototype/22-turn-around-extractor.webp)

**Subject isolation logic.** Builds instructions for extracting a subject into
turnaround-friendly views and cleaner production references.

### 23. Materializer

![Materializer](prototype/23-materializer.webp)

**Material change logic.** Creates material-focused edit instructions from the base prompt,
refs and selected operation context.

### 24. Stylerizer

![Stylerizer](prototype/24-stylerizer.webp)

**Style transfer logic.** Builds style-focused edit instructions while preserving the subject
and current image context.

### 25. Enhanced Prompt PRO

![Enhanced Prompt PRO](prototype/25-enhanced-prompt-pro.webp)

**Premium prompt rewrite.** A higher-control LLM route that rewrites prompts with image and
reference context for stronger art direction.

---

## Prompt preset blocks, not expanded

Thirty groups in the graph are single-node instruction blocks. They are the direct ancestors
of Quick Blocks in the shipped app — a saved piece of art direction under a name — but there
is nothing to see in a screenshot of one:

`Painterly Cinematic Key Art` &middot; `Loose Exploratory Concept Painting` &middot;
`Lineless Render Pass` &middot; `Clean Studio Key Light` &middot; `3/4 Cinematic with Rim Light` &middot;
`Backlit with Soft Fill (Hero Shot)` &middot; `Simple Studio with floor` &middot; `Black Studio` &middot;
`Turn Table Mid Tone` &middot; `Call Out Sheet` &middot; `Value Study to Illustration` &middot;
`Color Flat to Render` &middot; `Colorize Black and white` &middot; `Sketch to Flats` &middot;
`Clean Up Details` &middot; `To Sketch` &middot; `Isolate Subject to turn around` &middot;
`4th and 5th level Details` &middot; `2nd and 3rd Level Details` &middot; `Add Reference Details` &middot;
`Extremely Loose Painting` &middot; `Hyper Loose Paint` &middot; `HeadShots` &middot; `FloorPlain Extract` &middot;
`White Background` &middot; `Photorealism` &middot; `SVG` &middot; `Arcane Style` &middot; `Z-Brush Render` &middot;
`Sketch`

## A note on the screenshots

The capture pass clears Comfy's error state and neutralizes missing-model red outlines in
these derived images only, so the graph structure is legible. **The source workflow JSON is
not rewritten** — what you download is what ran.

Captured with Playwright against a real ComfyUI instance. The board these were laid out on is
[in Figma](https://www.figma.com/design/icRzeVW8oRKPyT2Y27y10p?node-id=132-2).
