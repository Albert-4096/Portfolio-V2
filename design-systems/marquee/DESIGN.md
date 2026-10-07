---
name: Marquee
description: Event and campaign system. One saturated colour field, Archivo condensed at full volume, everything else in ink. Sharp edges, 2px rules.
colors:
  field: "#ff5a1f"
  field-ink: "#141414"
  bg: "#f3f2ef"
  surface: "#ffffff"
  surface-2: "#e7e5e0"
  border: "#d3d0c9"
  border-strong: "#141414"
  text: "#141414"
  text-2: "#3d3b38"
  muted: "#5f5c57"
  accent: "#141414"
  accent-ink: "#f3f2ef"
  invert: "#141414"
  invert-ink: "#f3f2ef"
  success: "#1d7a45"
  warning: "#8f5800"
  danger: "#c22a1d"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 1.5rem + 9vw, 8.5rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.01em"
    fontVariation: "\"wdth\" 68"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.4rem + 2.4vw, 3.25rem)"
    fontWeight: 750
    lineHeight: 0.98
    fontVariation: "\"wdth\" 82"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 750
    lineHeight: 1
    fontVariation: "\"wdth\" 90"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  none: "0"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
  "8": "4.5rem"
  "9": "7rem"
  "10": "10rem"
  gutter: "clamp(1rem, 0.5rem + 2.5vw, 2.5rem)"
  section: "clamp(4rem, 2rem + 8vw, 9rem)"
  container: "96rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "3.25rem"
    padding: "0 1.5rem"
  button-on-field:
    backgroundColor: "{colors.field-ink}"
    textColor: "{colors.field}"
    rounded: "{rounded.none}"
    height: "3.25rem"
  band:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
  band-ink:
    backgroundColor: "{colors.invert}"
    textColor: "{colors.invert-ink}"
  sticker:
    backgroundColor: "{colors.field-ink}"
    textColor: "{colors.field}"
    padding: "0.35em 0.7em"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    height: "3.25rem"
---

# Design System: Marquee

## Overview

**Creative North Star: "The Gig Poster"**

A gig poster you can scroll. One colour owns whole regions of the page (the "field"), the date is the biggest thing anyone sees, and condensed type does the shouting so nothing else has to. Everything that is not the field is ink on off-white: rules, agenda, buttons.

For hackathons (HackTM, the made-up "Hack the Bega" in the specimen), event microsites and check-in landing pages, launches, sports and karting promos: pages with a date, a place and one thing to do (register, buy, show up).

**Mode:** Persuade.
**Dials (taste-skill):** DESIGN_VARIANCE 8 · MOTION_INTENSITY 7 · VISUAL_DENSITY 3.
**Colour strategy (impeccable):** Committed. The field covers 30 to 60% of the first screens.
**Source of truth:** `marquee/tokens.css`.

**Key characteristics**
- One field colour per event, set with two tokens: `--field` and `--field-ink`. Presets: orange (default), cobalt, lime, red.
- One family, Archivo, at three widths: 62 to 68% for display and the date, 82 to 90% for headings, 100% for text.
- All sharp. Rules are 2px ink. No shadows at rest.
- The ticker is the one moving thing, and it stops for reduced motion.

## Logo and icons

The alberyt mark: a **peak** (the A of Albert, and the Retezat ridge), cut by a **contour** band where an A's crossbar would be, and ended by a **cursor** block. The peak takes `text`, the cursor takes `accent`, and nothing else about it changes between systems.

**Marquee dresses events.** The event's name leads the header and the field; the alberyt mark never stands in for it. It appears in two places only:
- **The footer credit.** The small mark and "Site: alberyt.xyz" in the closing invert band, in that band's ink, linking to alberyt.xyz.
- **Your own events and projects built in Marquee**, as the tile and favicon. Here `accent` is ink, so the mark is one colour: `#141414` on off-white, `#f3f2ef` on dark. Inside a field band it takes `--field-ink`, both parts.

**Using the files**

- **Sizes.** From 32px up use `alberyt-mark-*`. Below 32px use `alberyt-mark-small-*`, which drops the contour band so it doesn't clog.
- **Files.** `brand/dist/systems/marquee/` holds this system's files: `-dark` files are for dark grounds, `-light` files for light ones; each is painted in this system's colours. In HTML, inline the SVG instead (`brand/dist/alberyt-mark.svg`, or the snippet in `core/components.css`): the peak is `fill: currentColor`, the cursor `fill: var(--mark-signal)`, which `core/components.css` sets to `accent`, so it follows the theme.
- **Clear space.** Leave at least one cursor width (about a quarter of the mark's height) on every side. Never outline, rotate, stretch or recolour the parts separately.
- **Tile and favicon.** `alberyt-tile-*` is the app icon (field `bg`, peak `text`, cursor `accent`, corners rounded as much as this system rounds its cards); `alberyt-favicon.svg` is the tile in this system's default theme with the small cut.

### Icons
17 interface icons drawn on the mark's 24-unit grid: a 2-unit stroke, square caps, mitred joins, and any solid part (a calendar's header band, a PDF label, the share nodes) drawn as the cursor's flat block. They are painted in `currentColor`, so in a page they take the colour of the text around them. Set them at 16, 20 or 24px; at 16px the stroke is 1.33px. Files: `brand/dist/icons/` (one SVG each, plus `sprite.svg`), and orar.alberyt.xyz uses it. Square caps match Marquee's hard 2px rules; in buttons, set them at 20px beside the uppercase label.

## Colors

### Primary
- **Field** (`#ff5a1f`, signal orange): full-bleed bands, the ticker's squares, the "now" marker in the agenda, selection. Never text on the page background.
- **Field Ink** (`#141414`): everything inside a band.

### Field presets
- `data-field="cobalt"`: `#2440e6` with white ink.
- `data-field="lime"`: `#c6f03a` with ink `#141414`.
- `data-field="red"`: `#d92a1d` with white ink.
Put the attribute on `:root` for the whole page or on a section for one band. Check any new field with `scripts/contrast.py` (field-ink on field must reach 4.5:1).

### Neutral
- **Off-white** (`#f3f2ef`) page, **White** surfaces, **Stone** (`#e7e5e0`) wells.
- **Ink** (`#141414`): text, rules, primary buttons. **Ink 2** (`#3d3b38`), **Ink 3** (`#5f5c57`).
- **Invert band**: the page colours swapped (ink band on light pages, light band on dark pages).

### Dark theme (follows the OS)
`--bg #131312`, `--surface #1c1c1a`, `--text #f3f2ef`, `--border-strong #f3f2ef` (rules turn light), `--accent #f3f2ef`. The field stays exactly the same.

### Named Rules
**The One-Field Rule.** One field colour per page. A second saturated colour is a different event.
**The Field-Is-A-Surface Rule.** The field is a background for whole regions, not a link colour and not a text colour on the page background.

## Typography

**Everything:** Archivo (wght 100 to 900, wdth 62 to 125, with italics), fallback `ui-sans-serif, system-ui`.

**Character:** a grotesk with real width range, so one family covers poster headlines and readable body text.

### Hierarchy
- **Date** (800, wdth 62, up to 11rem, 0.8 line height): the day number, with month, year and city stacked beside it.
- **Display** (800, wdth 68, 56px to 136px, 0.88, uppercase): one line of promise.
- **Headline** (750, wdth 82, 32px to 52px, uppercase): section titles ("Saturday", "Prizes").
- **Title** (700, wdth 90, 1.25rem to 1.5rem): agenda sessions, card titles.
- **Body** (400, 1.0625rem, 1.55). **Label** (600, 0.8125rem, 0.08em, uppercase): nav, rooms, buttons.

### Named Rules
**The Width-Not-Weight Rule.** Hierarchy comes from width and size. Body never goes condensed; display never goes normal width.

## Layout

A wide 96rem stage with big jumps between bands (up to 9rem) and tight spacing inside them.
- Page rhythm: header, field band (date, display line, primary button, one sticker), ticker, agenda on the page background, an invert band to close.
- The agenda is a printed programme: time (tabular), session and speaker, room. A 2px rule on top, 1px between rows.
- Under 760px the room moves under the session; the date block and display scale down with `clamp()`.

## Elevation & Depth

None at rest. Separation comes from colour fields and rules. One large soft shadow (`--shadow-lg`) is allowed for a modal.

## Shapes

All radii 0. Rules: 2px ink for structure (header bottom, ticker, agenda top, secondary buttons, cards), 1px for rows. The ticker separators are filled squares in the field colour.

## Components

- **Band** (`.band`, `.band--ink`): full-bleed region that re-maps text, accent, borders and focus to the band's ink. Everything inside just works.
- **Ticker** (`.ticker`): a looping strip of real facts (prize money, team size, venue). Pauses on hover; under reduced motion the duplicate track hides and the strip stands still.
- **Date block** (`.datebox`): day number plus stacked month, year, city.
- **Agenda** (`.agenda`): `data-now` marks the current session's time with the field colour.
- **Sticker** (`.sticker`): one per band, for one fact ("Free entry", "Sold out", "Day 2").
- **Buttons**: uppercase, 3.25rem tall, ink on light, ink-on-field inside bands; pressed buttons drop 2px.

## Do's and Don'ts

**Do**
- Lead with the date and the place. Then the one action.
- Fill the ticker with facts people need (money, size, place), not slogans.
- Swap the field per event; keep everything else.
- Keep body copy short; posters are read in seconds.

**Don't**
- Don't use hard offset "brutalist" shadows or black boxes around everything; the field and the rules already carry the energy.
- Don't put field-coloured text on the off-white page.
- Don't run more than one moving element (the ticker).
- Don't set paragraphs in condensed widths or uppercase.
