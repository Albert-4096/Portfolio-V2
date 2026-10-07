---
name: Dosar
description: Trust-first system for professional practices (law, tax, accounting, clinics). Cool paper, ruled edges, registry numbers and stamp-ink blue-violet.
colors:
  bg: "#f5f6f7"
  surface: "#ffffff"
  surface-2: "#eceef1"
  border: "#d9dde3"
  border-strong: "#b4bbc6"
  control: "#848a94"
  text: "#141821"
  text-2: "#3b4250"
  muted: "#5a6271"
  accent: "#2f3aa3"
  accent-hover: "#232c85"
  accent-ink: "#ffffff"
  accent-soft: "rgba(47, 58, 163, 0.07)"
  success: "#1d7349"
  warning: "#965a00"
  danger: "#b42318"
typography:
  display:
    fontFamily: "Source Serif 4, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(2.5rem, 1.7rem + 3.2vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Source Serif 4, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(1.625rem, 1.35rem + 1vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Source Serif 4, Iowan Old Style, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.18
  body:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "2.5rem"
  "8": "3.5rem"
  "9": "4.5rem"
  "10": "6rem"
  gutter: "clamp(1.25rem, 0.75rem + 2vw, 2rem)"
  section: "clamp(3.5rem, 2.5rem + 4vw, 6rem)"
  container: "72rem"
  prose: "38rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    height: "2.875rem"
    padding: "0 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "2.875rem"
    padding: "0 1.25rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "1.75rem"
  dossier-tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "1.75rem"
    padding: "0 0.9rem"
  stamp:
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "0.35em 0.75em"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "2.875rem"
---

# Design System: Dosar

## Overview

**Creative North Star: "The Well-Kept Case File"**

A Romanian case file ("dosar"), done properly: cool white paper, a typed registry number and date in the corner, ruled edges, a folder tab with the matter written on it, and one rubber stamp in blue-violet ink that certifies the single fact that matters. The system is for practices whose visitors need to trust them before they pick up the phone: law offices, tax advisers, accountants, notaries, clinics.

It replaces the category default (navy, gold, Playfair Display, Montserrat, marble photos) with something quieter and more specific. A book serif for headings because these are document-heavy professions; a precise sans for everything people operate; tabular figures because fees, dates and registry numbers are the content.

**Mode:** Persuade (book a consultation) and Read (services, fees, FAQ).
**Dials (taste-skill):** DESIGN_VARIANCE 4 · MOTION_INTENSITY 3 · VISUAL_DENSITY 4.
**Source of truth:** `dosar/tokens.css`. Built from what the client sites have in common (example-law-1/2/3, global-taxexpert), keeping their structure and dropping their palette.

**Key characteristics**
- One accent: stamp ink `#2f3aa3`. No gold.
- Serif headings (Source Serif 4, optical sizes), sans body (Instrument Sans).
- Borders carry structure; a soft paper shadow appears only on hover.
- Real fees, real hours, real registry numbers on the page. Trust comes from specifics.
- Light-first, dark follows the OS. Romanian-first copy; every face covers ș ț ă â î.

## Logo and icons

The alberyt mark: a **peak** (the A of Albert, and the Retezat ridge), cut by a **contour** band where an A's crossbar would be, and ended by a **cursor** block. The peak takes `text`, the cursor takes `accent`, and nothing else about it changes between systems.

**Dosar dresses other people's brands.** On a practice's site the practice's name or logo leads the header; the alberyt mark never stands in for it. It appears in two places only:
- **The footer credit.** The small mark and "Site: alberyt.xyz" in Pencil (`muted`) at the end of the letterhead strip, linking to alberyt.xyz. The cursor takes Stamp Ink there; that is not a second stamp.
- **Your own projects built in Dosar**, as the tile and favicon: peak Graphite (`#141821`), cursor Stamp Ink (`#2f3aa3`); in dark, `#eef0f4` and `#a3abff`.

**Using the files**

- **Sizes.** From 32px up use `alberyt-mark-*`. Below 32px use `alberyt-mark-small-*`, which drops the contour band so it doesn't clog.
- **Files.** `brand/dist/systems/dosar/` holds this system's files: `-dark` files are for dark grounds, `-light` files for light ones; each is painted in this system's colours. In HTML, inline the SVG instead (`brand/dist/alberyt-mark.svg`, or the snippet in `core/components.css`): the peak is `fill: currentColor`, the cursor `fill: var(--mark-signal)`, which `core/components.css` sets to `accent`, so it follows the theme.
- **Clear space.** Leave at least one cursor width (about a quarter of the mark's height) on every side. Never outline, rotate, stretch or recolour the parts separately.
- **Tile and favicon.** `alberyt-tile-*` is the app icon (field `bg`, peak `text`, cursor `accent`, corners rounded as much as this system rounds its cards); `alberyt-favicon.svg` is the tile in this system's default theme with the small cut.

### Icons
17 interface icons drawn on the mark's 24-unit grid: a 2-unit stroke, square caps, mitred joins, and any solid part (a calendar's header band, a PDF label, the share nodes) drawn as the cursor's flat block. They are painted in `currentColor`, so in a page they take the colour of the text around them. Set them at 16, 20 or 24px; at 16px the stroke is 1.33px. Files: `brand/dist/icons/` (one SVG each, plus `sprite.svg`), and orar.alberyt.xyz uses it. In Dosar use them sparingly, mostly in the fee table and forms; the folder tab and stamp carry the character.

## Colors

Cool paper and graphite, with blue-violet ink.

### Primary
- **Stamp Ink** (`#2f3aa3`): primary buttons, links, the stamp, FAQ markers, focus rings. Hover deepens to `#232c85`. Selection uses a pale wash of it (`#d6d9f5`).

### Neutral
- **Paper** (`#f5f6f7`): page. **Sheet** (`#ffffff`): cards, inputs, the fee table. **Folder** (`#eceef1`): wells and table headers.
- **Rule** (`#d9dde3`): card borders, row dividers. **Rule Strong** (`#b4bbc6`): hover borders, secondary button outlines. **Control** (`#848a94`): input borders, dotted leaders.
- **Graphite** (`#141821`): text. **Graphite Soft** (`#3b4250`): paragraphs. **Pencil** (`#5a6271`): meta, labels, registry lines.

### Semantic
Success `#1d7349`, warning `#965a00`, danger `#b42318`: form validation and status only.

### Dark theme (follows the OS)
`--bg #0f1218`, `--surface #161a22`, `--text #eef0f4`, `--text-2 #c4c9d3`, `--muted #959dac`, `--accent #a3abff`, `--accent-ink #0f1218`.

### Named Rules
**The One Stamp Rule.** The double-ruled `.stamp` appears once per page, on the one verified fact (bar membership, registration, licence). Two stamps and it becomes decoration.
**The No-Gold Rule.** Gold, brass and navy-and-gold are the category default. If a client insists on gold, it goes in the logo, not in the system.

## Typography

**Headings:** Source Serif 4 (opsz 8 to 60, 400 to 700, with italics), fallback `Iowan Old Style, Georgia`.
**Body and UI:** Instrument Sans (400 to 700, width 75 to 100), fallback `ui-sans-serif, system-ui`.

**Character:** a sober book serif with optical sizes (sharp at display sizes, sturdy at text sizes) beside a modern grotesk with a slightly narrow, practical feel.

### Hierarchy
- **Display** (Serif 600, 40px to 64px, 1.08, -0.02em): the hero claim. Say what and where: "Drept civil și comercial, în Timișoara."
- **Headline** (Serif 600, 26px to 32px): section titles.
- **Title** (Serif 600, 1.25rem): card titles, FAQ questions (1.125rem).
- **Body** (Sans 400, 1.0625rem, 1.65): max 38rem.
- **Label** (Sans 600, 0.75rem to 0.8125rem, 0.06em, uppercase): folder tabs, registry keys, letterhead keys, table headers.

### Named Rules
**The Tabular Rule.** Fees, phone numbers, dates, case and registry numbers always use `font-variant-numeric: tabular-nums`.

## Layout

A 72rem container, an 8px rhythm and calm section spacing (3.5rem to 6rem).
- Hero: a split, claim and two buttons left (1.4fr), registry line bottom-right (1fr). The stamp sits above the claim.
- Services as dossiers stacked in one column beside the fee schedule, not as a 3-up grid of identical cards.
- FAQ as a ruled list of `details`; contact as a letterhead strip (address, phone, hours) above the footer.
- Everything stacks to one column under 900px; the letterhead under 700px.

## Elevation & Depth

Paper on a desk: flat. Borders do the work. Hoverable cards gain `0 1px 2px rgba(20,24,33,.05), 0 8px 24px -12px rgba(20,24,33,.16)` and a stronger border; nothing lifts.

## Shapes

Crisp. 2px on badges and the stamp, 4px on buttons and inputs, 6px on cards, 8px for the largest panels. The folder tab is the one shape with a story: a 6px-rounded top on a card whose top-left corner goes square to meet it.

## Components

- **Dossier** (`.card.dossier` + `.dossier__tab`): a card with a folder tab naming the matter ("Muncă", "Comercial"). The tab turns ink on hover.
- **Registry line** (`.registry`): `dt`/`dd` pairs, uppercase micro keys, tabular values.
- **Stamp** (`.stamp`): 1.5px border plus a 1px outline 2px out, uppercase ink label. Once per page.
- **Fee schedule** (`.leaders`): label, dotted leader, bold value. Add a line under it saying what is excluded (VAT, court fees).
- **FAQ** (`.faq`): serif questions, a drawn plus that rotates into a minus.
- **Letterhead** (`.letterhead`): the office's coordinates set like stationery, a 2px graphite rule on top.
- **Buttons**: stamp-ink primary ("Programează o consultație"), white secondary with a rule border.

## Do's and Don'ts

**Do**
- Publish real fees, hours and response times. Specific beats reassuring.
- Name the practice areas the way clients search for them ("Litigii de muncă"), not the way the law is organised.
- Keep one primary action per page, with the same label everywhere.
- Mark every form field with a visible label above it; errors say what is wrong and how to fix it.

**Don't**
- Don't use gold, marble, gavels, scales of justice or handshake stock photos.
- Don't stack more than one stamp, or rotate it for a "rubber stamp" effect.
- Don't use a 3-column grid of identical service cards; dossiers stack, or alternate with the fee table.
- Don't promise outcomes ("we win") in display type.
