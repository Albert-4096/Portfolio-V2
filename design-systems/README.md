# Design systems

Five reusable design systems that share one token contract, so the same HTML takes on a different identity by swapping one stylesheet. Two are extracted from sites already live (alberyt.xyz, gallery.alberyt.xyz); three are new, for the kinds of projects that keep coming up (client sites for professional practices, dashboards and tools, events).

Open `specimen.html` (served over HTTP, e.g. `python3 -m http.server` in this folder) to flip between them in light and dark.

| System | Built from | Best for | Mode | Dials V·M·D | Type | Shape | Theme |
|---|---|---|---|---|---|---|---|
| **Retezat** | alberyt.xyz | Your own site, write-ups, project microsites, homelab pages | Experience, Read | 6·4·4 | IBM Plex Sans + Plex Mono | Square, 1px, glass | Dark-first, light opt-in |
| **Atelier** | gallery.alberyt.xyz | Portfolios, showcases, photo-led premium sites | Experience, Persuade | 8·7·3 | Fraunces + Plus Jakarta Sans | 28px plates, pills | Light-first, dark via OS |
| **Dosar** | New (law/tax client sites) | Law, tax, accounting, clinics, notaries | Persuade, Read | 4·3·4 | Source Serif 4 + Instrument Sans | 2 to 8px, ruled, folder tabs | Light-first, dark via OS |
| **Signal** | New (mail-platform, dashboards, TEDx desk) | Dashboards, admin, webmail, internal tools | Operate | 3·2·8 | Geist + Geist Mono | 6 to 12px, borders | Both via OS |
| **Marquee** | New (events, campaigns) | Hackathons, events, launches, sports promos | Persuade | 8·7·3 | Archivo, three widths | All sharp, 2px rules | Both via OS, field fixed |

*Mode* is impeccable's surface mode (what success looks like for the visitor). *Dials* are taste-skill's DESIGN_VARIANCE · MOTION_INTENSITY · VISUAL_DENSITY (1 to 10).

## What's in here

```
design-systems/
├── core/
│   ├── base.css          reset, type, browser surfaces, layout primitives (.container .stack .cluster .grid .split)
│   └── components.css    buttons, badges, tags, cards, callouts, forms, switch, segmented, table, rows, header, dialog
├── retezat/  atelier/  dosar/  signal/  marquee/
│   ├── tokens.css        every value, light and dark (the source of truth)
│   ├── signature.css     the components only this system has
│   └── DESIGN.md         the system in DESIGN.md format, for people and for agents
├── assets/               three gallery screenshots used by the specimen
├── scripts/contrast.py   WCAG check for every token pair, every theme, every field preset
└── specimen.html         the live reference page
```

## Use one in a project

### Plain HTML/CSS

Copy `core/` and one system folder into the project, then load four files in this order:

```html
<link rel="stylesheet" href="/design-systems/dosar/tokens.css">
<link rel="stylesheet" href="/design-systems/core/base.css">
<link rel="stylesheet" href="/design-systems/core/components.css">
<link rel="stylesheet" href="/design-systems/dosar/signature.css">
```

`tokens.css` imports its fonts from Google Fonts so it works anywhere. For production, self-host the woff2 files the way alberyt.xyz does (`/fonts`, `font-display: swap`, latin and latin-ext subsets, preload the two most used) and delete the `@import` line.

Theme switching: every system reads `data-theme="light" | "dark"` on `<html>`; with no attribute it follows the OS (except Retezat, which stays dark unless asked).

### Tailwind v4

Import the tokens unlayered, then map them to utilities under names that differ from the token names, so no theme variable refers to one of the same name.

```css
@import "tailwindcss";
@import "../design-systems/signal/tokens.css";

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-line: var(--border);
  --color-line-strong: var(--border-strong);
  --color-ink: var(--text);
  --color-ink-2: var(--text-2);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-on-accent: var(--accent-ink);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --font-sans: var(--font-body);
  --font-heading: var(--font-display);
  --font-code: var(--font-mono);
  --spacing-gutter: var(--gutter);
  --container-page: var(--maxw);
}
```

`--radius-sm/md/lg` and `--shadow-sm/md/lg` already share Tailwind's names, so the unlayered tokens override Tailwind's defaults: `rounded-md` and `shadow-md` follow the system with no mapping.

### With impeccable

Copy the system's `DESIGN.md` to the project root. `impeccable context` loads it on every run, so `/impeccable polish`, `critique`, `audit` and new-work stay inside the system. Run `/impeccable init` once to add the `PRODUCT.md` (audience, purpose, voice) that DESIGN.md deliberately leaves out. The frontmatter follows the [DESIGN.md spec](https://github.com/google-labs-code/design.md), so Google Stitch reads it too.

### With taste-skill

Same file, then say which system and dials in the brief: "Use DESIGN.md (Dosar). Dials 4/3/4. Redesign, preserve." taste-skill's own rules (no em dashes, eyebrow budget, one accent, one label per CTA intent) are already respected by these systems.

## The token contract

Every system defines every token below; components read nothing else. Change values, never names.

| Group | Tokens |
|---|---|
| Surfaces | `--bg` `--surface` `--surface-2` `--overlay` |
| Lines | `--border` (hairlines) `--border-strong` (rules, outlines) `--control` (input borders, ≥3:1) |
| Text | `--text` `--text-2` (paragraphs) `--muted` (meta, ≥4.5:1) |
| Action | `--accent` `--accent-hover` `--accent-ink` (text on accent) `--accent-soft` (wash) `--accent-line` `--focus` |
| Feedback | `--success` `--warning` `--danger` `--selection` `--selection-ink` |
| Fonts | `--font-display` `--font-body` `--font-mono` `--label-font` |
| Type scale | `--fs-display` `--fs-h1` `--fs-h2` `--fs-h3` `--fs-lede` `--fs-body` `--fs-small` `--fs-label` `--fs-micro` |
| Type detail | `--lh-tight` `--lh-heading` `--lh-body` `--weight-display` `--weight-heading` `--weight-strong` `--tracking-display` `--tracking-heading` `--tracking-label` `--label-weight` `--label-transform` |
| Space | `--space-1` … `--space-10` `--gutter` `--section-pad` `--maxw` `--prose` `--header-h` |
| Shape | `--radius-xs` `--radius-sm` `--radius-md` `--radius-lg` `--radius-pill` |
| Depth | `--shadow-sm` `--shadow-md` `--shadow-lg` |
| Motion | `--ease-out` `--ease-in-out` `--ease-snap` `--dur-fast` `--dur-ui` `--dur-slow` |
| Component hooks | `--btn-*` (font, weight, size, tracking, transform, height, pad-x, radius, ghost-bg) · `--card-*` (bg, border, radius, pad, shadow, shadow-hover, border-hover, lift, blur) · `--input-*` (bg, height, radius) · `--badge-*` (font, size, weight, transform, tracking, radius) · `--header-bg` `--header-blur` |

System-only extras: Retezat `--accent-dim` `--surface-glass(-strong)`; Atelier `--sage` `--grain-*`; Marquee `--field` `--field-ink` `--invert` `--invert-ink` `--rule` `--display-stretch` `--heading-stretch`.

## Make a sixth one

1. Copy the closest system's folder and rename it.
2. Change values in `tokens.css` (keep every name). Pick the light/dark pattern: light-first follows the OS; dark-first commits like Retezat.
3. Run `python3 scripts/contrast.py <name>` until it reports 0 failing pairs.
4. Put only what is unique to it in `signature.css`.
5. Add it to `SYSTEMS` and the picker in `specimen.html`, and write its `DESIGN.md` (copy a sibling's structure).

## What the research changed

These systems follow the craft floors of [impeccable](https://github.com/pbakaus/impeccable) and [taste-skill](https://github.com/Leonxlnx/taste-skill), applied to tokens and components instead of one page:

- Contrast is checked, not assumed: text 4.5:1, control borders and focus 3:1, in every theme (`scripts/contrast.py`).
- One accent per system; semantic colours are separate and always paired with words.
- Browser surfaces are themed: selection, caret, focus rings, scrollbars, native checkboxes (`accent-color`), tabular numerals.
- One elevation language per system (borders or shadows, not both stacked); one radius scale per system.
- Hover effects are gated to fine pointers; touch targets grow to 44px on coarse pointers, whatever the density.
- Motion starts from a visible resting state and collapses under `prefers-reduced-motion`.
- Fonts were chosen for Romanian coverage (comma-below ș ț) as well as character.

Two systems knowingly keep things those skills flag, because they are already your live identity: Retezat's numbered section heads, mono labels and single 3px rail; Atelier's cream canvas with Fraunces. Each `DESIGN.md` says where the line is and, for Atelier, how to swap out of the default look when reusing it.
