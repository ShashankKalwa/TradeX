---
name: TradeX
description: "The Floor Blotter — an open-outcry trading desk: ink-black lamp-lit chrome framing warm paper data panels, ruled ledger rows, perforated order tickets and rubber-stamp fills."
colors:
  transparent: "transparent"
  current: "currentColor"
  inherit: "inherit"
  desk-950: "#14120e"
  desk-900: "#191713"
  desk-800: "#211e18"
  desk-line: "#3a352b"
  paper-50: "#f4eee1"
  paper-100: "#ece4d4"
  rule: "#c9bda2"
  rule-strong: "#a99a78"
  ink: "#241f1a"
  ink-secondary: "#5c5344"
  ink-muted: "#6f6552"
  buy-text: "#1e5c46"
  buy-mark: "#0a7d54"
  sell-text: "#a33327"
  sell-mark: "#b04a37"
  accent-text: "#2b5b84"
  accent-mark: "#1a5fa8"
  warn-text: "#7a581f"
  warn-mark: "#d96c1e"
  focus-ring-desk: "#4a86bf"
typography:
  hero-figure:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "clamp(2.6rem, 6vw, 4rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "font-variant-numeric: normal"
  heading:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.25rem"
    letterSpacing: "0.025em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: "1.5rem"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "normal"
  label:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: "1rem"
    letterSpacing: "0.02em"
  figure:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
    fontVariation: "font-variant-numeric: tabular-nums"
rounded:
  ink-line: "4px"
  ticket: "3px"
  lamp: "9999px"
spacing:
  cell-x: "12px"
  card-pad: "16px"
  stack: "20px"
  gutter: "16px"
  gutter-sm: "24px"
  rail: "340px"
  sidebar: "224px"
components:
  button-buy:
    backgroundColor: "{colors.buy-text}"
    textColor: "{colors.paper-50}"
    rounded: "{rounded.ticket}"
    padding: "10px 16px"
    typography: "{typography.heading}"
  button-sell:
    backgroundColor: "{colors.sell-text}"
    textColor: "{colors.paper-50}"
    rounded: "{rounded.ticket}"
    padding: "10px 16px"
    typography: "{typography.heading}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-50}"
    rounded: "{rounded.ticket}"
    padding: "10px 16px"
    typography: "{typography.heading}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.ticket}"
    typography: "{typography.label}"
  button-segment-active-paper:
    backgroundColor: "{colors.paper-50}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ticket}"
    padding: "4px 8px"
    typography: "{typography.label}"
  button-segment-active-desk:
    backgroundColor: "{colors.paper-100}"
    textColor: "{colors.desk-900}"
    rounded: "{rounded.ticket}"
    padding: "6px 12px"
    typography: "{typography.label}"
  field:
    backgroundColor: "{colors.paper-50}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ticket}"
    padding: "8px 12px"
    typography: "{typography.body}"
  paper-card:
    backgroundColor: "{colors.paper-100}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ticket}"
  paper-ticket:
    backgroundColor: "{colors.paper-50}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ticket}"
  tag:
    backgroundColor: "rgb(43 91 132 / 10%)"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.ticket}"
    padding: "1px 6px"
    typography: "{typography.label}"
---

# Design System: TradeX

## Overview

**Creative North Star: "The Floor Blotter"**

Every trade is a physical ticket on a lamp-lit desk. The terminal proves its ledger by making you touch the paper trail: a monstrous net-value figure inked on warm stock, rows ruled like a jobber's pad, an order form that is literally a perforated ticket you tear and file. The product's "trust is the product" principle is expressed materially rather than with badges — data lives on paper, and the paper is auditable.

The world refuses the dark neon-terminal default. Instead of one dark surface, there are two materials in permanent tension: **ink-black desk chrome** (near-black warm greys, `#191713` body with two lamp glows) that carries navigation, the ticker tape and instrument status; and **warm paper panels** (`#ece4d4`, brighter `#f4eee1` for fresh tickets) that carry every number a user might need to defend. Direction is the only saturated thing on the paper — oxblood for sell, ledger-green for buy, ink-blue for interaction — and it is never allowed to carry meaning alone.

Density is deliberately high (11px mono figures in ruled rows) but rhythmically broken: one monumental figure per workspace, then quiet 14px caps labels, then dense tabular rows. Interaction is designed as physical acts — press the stamp, tear the stub, watch the tape run — so motion exists only where something is *happening*: a price ticking, an order being filed, a scheduler still sweeping.

**Key Characteristics:**
- Two materials, one law: chrome is dark and non-data; anything numeric lives on paper.
- Paper is textured (turbulence flecks at 5% alpha), ruled (hairline `rgba(169,154,120,0.45)`), and occasionally punched or perforated.
- Rubber-stamp and ruled-ledger affordances are real CSS/SVG, not decoration: masks, `mix-blend-mode: multiply`, `clip-path`, radial-gradient punch holes and a tear-off perforation line.
- Direction is always doubled: colour + sign (+/−) or colour + arrow (▲/▼) or colour + column.
- Tabular figures everywhere data aligns; proportional figures only for the single hero value.
- Motion is authored per moment (stamp press, price flash, tape marquee, chase lamp, shimmer, rejection slide-in), never ambient.

## Colors

A warm, low-chroma paper palette interrupted by exactly four saturated semantic hues, each with a reserved job and two steps (a text-grade `text` and a mark-grade `mark`).

### Primary
- **Blotter Ink** (`#241f1a`): all body and heading text on paper. 12.92:1 on `paper-100`, 14.12:1 on `paper-50`. Also the fill of the tooltip surface, the login submit button, and chart text/tooltip ink. The only near-black; there is no separate `text-black`.
- **Ink Secondary** (`#5c5344`): secondary text on paper — dt labels, sub-captions, inactive segment controls, the neutral stamp. 5.99:1 on paper (6.54:1 on `paper-50`). This is the first ink step *down*, and it is the one used for text that is still required reading.
- **Ink Muted** (`#6f6552`): tertiary text — timestamps, table sub-lines, footnote copy, placeholders. 4.54:1 on paper (4.96:1 on `paper-50`) — the floor of the ink ramp, chosen to just clear 4.5:1. Deliberately degraded to 4.10:1 on the disabled-field background (`#e3d9c4`), which is permitted because disabled text is exempt.

### Secondary
- **Ledger Green** — text `#1e5c46` (6.21:1 on paper), mark `#0a7d54` (4.08:1). The buy / up / credit / market-open hue. `text` is for glyphs (labels, deltas, stamp outline); `mark` is for fills and graphic marks (candles, sparklines, lamps, bar fills, the `flash-up` keyframe).
- **Oxblood** — text `#a33327` (5.43:1), mark `#b04a37` (4.28:1). The sell / down / debit / market-closed hue. Same text-vs-mark split. Also the logo mark's stroke.
- **Ink Blue** — text `#2b5b84` (5.67:1), mark `#1a5fa8` (5.12:1). Interaction and single-series data. `text` = links, hover/active affordances, paper focus ring, paper selection background. `mark` = chart line/area, sector bars, the "you" row tint on the leaderboard.
- **Signal Amber** — text `#7a581f` (5.12:1), mark `#d96c1e` (2.72:1). Pending / resting / pre-open / starred. `text` is the only step that clears contrast on paper; `mark` is intended as a **chrome-only** colour (5.21:1 on `desk-900`) and never as a chart mark. It also owns the text caret. (It currently leaks onto paper in two non-chart places — see gaps.)

### Neutral
- **Desk body** (`#191713` `desk-900`): the page background, and the base the two lamp gradients sit on.
- **Desk deep** (`#14120e` `desk-950`): the ticker tape strip, the login desk panel, the search-palette scrim.
- **Desk raised** (`#211e18` `desk-800`): the Orders filter pill track — the single raised chrome surface.
- **Desk line** (`#3a352b`): every hairline on chrome (sidebar border, header border, tape border, kbd borders, and the Orders filter track's outline). 1.47:1 against `desk-900` — decorative separation only.
- **Paper** (`#ece4d4` `paper-100`): the default data surface (card background, chart plot background). Two paper steps only — `paper-50` and `paper-100`; the darker `paper-200`/`paper-300` steps were removed from the palette.
- **Fresh stock** (`#f4eee1` `paper-50`): brighter paper for anything you act on or read as *current* — the order ticket, form fields, active segment pills, the stamp card, tooltip text.
- **Rule** (`#c9bda2`): the default hairline on paper, 1.47:1 — visible as texture, never as information. **Rule Strong** (`#a99a78`, `rule-strong`): emphasis hairlines, dashed ticket divider, dashed section breaks inside cards, the logo mark's outline.
- **Transparent / current / inherit** (`transparent`, `currentColor`, `inherit`): three built-ins restored into `theme.colors` beside the palette. `bg-transparent` emits real CSS again, which is what the inactive BUY/SELL side button, the search-palette input and the neutralised sector/exchange/order-type tags depend on.

### Named Rules

**The Paper Owns The Numbers Rule.** Any figure a user could be asked to defend — price, quantity, P&L, balance, fee — is rendered on a paper surface (`#ece4d4` / `#f4eee1`) in ink. Desk chrome carries navigation, status and identifiers only. A financial number on `#191713` is a bug.

**The Two-Step Semantic Rule.** Every semantic hue ships as a pair: a `text` step that clears 4.5:1 on paper for glyphs, and a `mark` step for graphic fills. Never substitute one for the other. `warn-mark` `#d96c1e` is the only mark step that fails on paper (2.72:1) — it is therefore chrome-only.

**The Never-Colour-Alone Rule.** Direction is always doubled. `DeltaPct` prints `+`/`−`; `Delta` adds a `▲`/`▼` glyph marked `aria-hidden` and is now shipping in two places (the dashboard hero next to `dayChangePct`, the StockDetail quote head next to the day change); the Ledger splits Debit and Credit into separate columns; "Recent fills" prefixes the amount with `+`/`−`. A delta rendered as colour only does not ship.

## Typography

**Display Font:** Archivo (with `system-ui`, `sans-serif`) — weights 400/500/600/700 loaded from `@fontsource/archivo`.
**Body Font:** Archivo (same stack) — the UI text face.
**Figure/Mono Font:** Spline Sans Mono (with `ui-monospace`, `monospace`) — weights 400/500/600 loaded from `@fontsource/spline-sans-mono`.

**Character:** Archivo does the talking and Spline Sans Mono does the counting. Archivo is a taut grotesque used tight and uppercase for headings and labels; Spline Sans Mono is the desk's typewriter — every price, quantity, timestamp, identifier and tabular row is set in it so digits never jitter as the tape moves. Caps + wide tracking marks *classification* (panel titles, lifecycle states, nav); lowercase sentence case marks *human speech* (empty-state bodies, footnotes, the rejection slip's explanation).

### Hierarchy
- **Hero figure** (Spline Sans Mono, 600, `clamp(2.6rem, 6vw, 4rem)`, line-height 1, tracking -0.02em, `font-variant-numeric: normal`): one per workspace. Currently the dashboard portfolio value only. It is the single place the system opts *out* of tabular figures.
- **Title** (Archivo, 700, 1.125rem/1.5rem, tracking-tight): `DeskHeading` — the workspace name on chrome. Also the mobile wordmark.
- **Heading** (Archivo, 600, 0.875rem, tracking-wide, uppercase): panel titles inside `PaperHead` and the order ticket header. The workhorse classifier.
- **Body** (Archivo, 400, 0.75rem, line-height 1.5): table cells, descriptions, empty-state copy, footnotes. Long-form prose caps at `max-w-[38ch]`–`max-w-[42ch]`.
- **Label / Figure** (Spline Sans Mono, 400–600, 0.6875rem/1rem, tracking 0.02em, `tabular-nums`): the `text-2xs` step — the single most-used size in the app (13 of 15 files). Rendered by the `.num` class, which forces both the mono family and tabular figures.
- **Micro caps** (Spline Sans Mono, 500–600, 0.6875rem, tracking 0.1em–0.14em, uppercase): the loudest small text — `Portfolio value · NSE desk`, `APPEND-ONLY · 42 ENTRIES`, `AVAILABLE CASH`. Reserved for statements about the desk itself.

Sizes in use: 0.6875rem (`text-2xs`, custom step, line-height 1rem, letter-spacing 0.02em), 0.75rem (`text-xs`), 0.875rem (`text-sm`), 1.125rem (`text-lg`), 1.25rem (`text-xl`), 1.5rem (`text-2xl`), plus two one-off em-relative sizes in the stamp (0.6em, used by the rejection slip's `REJECTED`) and the `Delta` arrow (0.7em), one 17px literal on the sidebar wordmark, and the hero clamp.

Caps tracking in use: `tracking-wider` (0.05em, 23 uses — the default for uppercase labels), `tracking-[0.1em]`, `tracking-[0.12em]`, `tracking-[0.14em]` (the escalating scale for panel heads → ticket header → blotter eyebrow), `tracking-wide` (0.025em), `tracking-widest` (0.1em), and `.stamp`'s own 0.08em.

### Named Rules

**The Tabular Rule.** `.num` is mandatory on any figure that sits in a column or updates live, because tabular figures keep columns from shimmying on each tick. The hero figure is the *only* exemption (`.figure-hero` resets `font-variant-numeric: normal` + negative tracking to pack the monumental value tight). If a second giant figure ever ships, it needs the same class — not a `font-mono` alone.

**The Caps Are Classification Rule.** Uppercase + tracking is used to say *what kind of thing this text is* (panel, lifecycle state, axis label, desk status), never for emphasis. Emphasis is weight or ink step, not caps.

**The 11px Floor Rule.** `text-2xs` (0.6875rem) is the smallest step in the system and it always carries either a mono figure context or an uppercase/tracked label. It is never used for prose the user must read linearly — that is `text-xs` at minimum.

## Layout

The app is a two-material shell: a fixed-height ticker tape across the top, then a persistent chrome sidebar beside a scrolling paper stage.

- **Shell**: `min-h-screen flex flex-col` → `TickerTape` (`h-9`, `#14120e`) → row of `aside` (`w-56` = 224px, sticky, `h-screen`, `#14120e`/60) + stage. The stage holds a sticky header (`h-14`, `z-30`, `bg-desk-900/90` + `backdrop-blur`, bottom hairline), the scrolling `main`, and a mono disclaimer footer.
- **Stage container**: `px-4 sm:px-6 py-6`, capped at `max-w-[1400px]` and centered. There is no wider breakpoint because the cap does the work beyond 1400px.
- **Spacing rhythm**: `gap-5` / `space-y-5` (20px) between all cards at every level; `p-4` (16px) card interiors; card heads are `px-4 pt-3.5 pb-3` with a bottom hairline; table cells are `px-3 py-2.5` with `px-5 sm:px-6` on the first column; hairline-separated rows stack at `py-2.5`–`py-3.5`. The 4px scale (4/8/12/16/20/24/32/40) governs cards, stacks and page padding; the 2px half-steps (2/6/10/14px — `py-0.5`, `py-1.5`, `py-2.5`, `py-3.5`, `p-0.5`, `-mx-2`) are reserved for chips, badges, ruled rows and segment tracks.
- **Two-column workspaces** (all `items-start`, rail on the right): Dashboard `lg:grid-cols-[1fr_340px]`, StockDetail `lg:grid-cols-[1fr_340px]`, Portfolio `lg:grid-cols-[1.6fr_1fr]`, Leaderboard `lg:grid-cols-[1fr_300px]`. The order ticket rail is `lg:sticky lg:top-20` so it stays in reach while the chart scrolls.
- **Breakpoints** in use are Tailwind defaults only: `sm` 640px, `md` 768px, `lg` 1024px. No `xl`/`2xl` rules exist anywhere.
- **Sidebar collapse**: the `w-56` sidebar is `hidden md:flex`. Below `md` a horizontal, scrollable nav strip (`overflow-x-auto`, `shrink-0 whitespace-nowrap` items) is inserted under the header, and the wordmark moves into the header.
- **Tables**: every data table is inside an `overflow-x-auto` wrapper with a hard `min-w` — 680px (dashboard holdings), 720px (markets), 760px (portfolio positions), 780px (ledger). Columns are progressively hidden rather than wrapped: `hidden sm:table-cell` (value, sparkline), `hidden md:table-cell` (day range, P&L), `hidden lg:table-cell` (trend, 90d). The Ledger table never drops a column — it scrolls horizontally, because a ledger that hides a debit column is not auditable.
- **Login** is its own shell: `max-w-4xl`, `md:grid-cols-[1.1fr_1fr]`, chrome panel left (hidden below `md`, `rounded-l-ticket`), paper ticket right.
- **Pager**: 12 rows (Markets) or 15 rows (Ledger) per page, footer strip `px-4 py-3` with a mono range label left and 32px-or-smaller icon/text pager buttons right.

## Elevation & Depth

The system is layered but only *just* — depth comes overwhelmingly from the material contrast between chrome and paper, and from hairline rules; shadows are structural and warm, never ambient glow. Three surfaces exist, each with one authorised shadow: paper cards at rest (`shadow-paper`), anything you are about to act on or that is floating (`shadow-paper-lift`), and small stamped/pressed objects (`shadow-stamp`). Nothing else is allowed to cast.

The desk itself is lit, not shadowed: `body` carries two large radial warm gradients (`rgba(210,180,120,0.07)` at 70% / -10%, `rgba(190,160,100,0.05)` at 10% / 110%) so the chrome reads as a lamp on a surface rather than flat black. Bottom edges of chrome panels get `shadow-inset-line` — an inset hairline that makes a nav item read as recessed into the desk.

### Shadow Vocabulary
- **paper** (`0 1px 2px rgba(30,24,14,0.18), 0 3px 8px rgba(30,24,14,0.14)`): every resting paper card, tag-free content surface, tooltip, and the active segment pill. Warm-brown shadow, never neutral black.
- **paper-lift** (`0 2px 4px rgba(30,24,14,0.2), 0 8px 20px rgba(30,24,14,0.22)`): the order ticket form, the search palette, the login pair, and the hover state of any button that already carries `shadow-paper`.
- **stamp** (`0 0 0 1px rgba(36,31,26,0.08), 0 1px 3px rgba(30,24,14,0.3)`): pressed objects — the selected BUY/SELL side button, so it reads as a stamped key rather than a raised one.
- **inset-line** (`inset 0 -1px 0 rgba(36,31,26,0.06)`): the active sidebar nav tab, so it reads as sunk into the desk.

### Named Rules

**The Material-Not-Shadow Rule.** Hierarchy is asserted with material first (paper on chrome, `paper-50` on `paper-100`), hairline second (`border-rule/40`–`/60`), shadow third. A card that needs a stronger shadow to be noticed needs a material change instead.

**The One Lift Rule.** `shadow-paper-lift` means "you are about to commit or you are floating". Exactly three things carry it at rest: the order ticket form, the search palette, and the login pair. Everywhere else it is a hover response to `shadow-paper`. (`OrderTicket`'s stamp overlay card and rejection slip sit at `shadow-paper`, one step down — they are pressed documents, not floating surfaces.)

## Shapes

One radius, deliberately small: **3px (`ticket`)** at every corner of every rectangle — cards, buttons, inputs, tags, pills, segments. It reads as slightly clipped ticket stock rather than a rounded web card, and it is the single most consistent value in the system. `rounded` (4px) appears exactly once, on the live-price flash span (which uses negative margin and padding to bleed a highlight behind the figure). `rounded-full` is reserved for two things only: status lamps (2px dots) and count badges. SVG corners match: `rx="3"` on the logo mark, `rx="2"` on the chart's last-price badge.

Borders are the secondary form language: 1px hairlines on paper (`rule` at 40–60% for dividers, `rule-strong` at 60–70% dashed for the ticket's stub divider and for section breaks inside a card), 1px `desk-line` on chrome, and 2–2.5px `currentColor` on stamps only. The order ticket's stub header is separated by a *dashed* rule and then torn along a perforation; the rejection slip is `border-l-0` so it reads as an edge-torn slip rather than a box.

Physical geometry is part of the shape vocabulary:
- **Perforation** — `.tear-bottom` is the one tear affordance. It rides 4px below its element as a 7px-tall `::after` band inset 10px from each side, drawing `#191713` circles of radius 3px (`radial-gradient(circle at 3.5px 3.5px, #191713 3px, transparent 3.2px)`) repeating every 12px horizontally at `opacity: 0.5` — so the punched holes read as openings onto the desk beneath. It is applied to the order ticket's stub header, which is the only element in the app that tears.
- **Punch holes** — `.punch-holes` draws `#191713` circles of radius 3.5px every 28px down a left margin (`radial-gradient(circle 4px at 14px 50%, …)`), so the ledger page reads as bound. The Ledger card is its only host.
- **Stamp silhouette** — `.stamp` is `rotate(-3.5deg)`, `mix-blend-mode: multiply`, 2.5px `currentColor` border, 3px radius, with a turbulence-derived alpha mask so the ink bleeds unevenly.

## Components

### Buttons
- **Shape:** 3px corners everywhere (`rounded-ticket`); the only exceptions are circular icon buttons (`rounded-full` count badges) and the un-styled native `<select>`.
- **Primary (commit):** Order ticket submit is `bg-buy-text` or `bg-sell-text` on `text-paper-50`, `py-2.5`, uppercase, `font-bold`, `tracking-wider`, `shadow-paper` → `hover:shadow-paper-lift`, `active:translate-y-px`, `disabled:opacity-60`. Label changes to `FILING…` while submitting (verb-as-progress, never a spinner).
- **Primary (neutral commit):** the login/register submit is `bg-ink text-paper-50` with an identical geometry and state set. There is no single "brand button" — the commit colour is the direction of the action.
- **Ghost / secondary:** `bg-transparent text-ink-secondary border border-rule` → `hover:border-rule-strong`; disabled pager buttons add `disabled:opacity-35` plus explicit `disabled:hover:*` resets so the hover state cannot leak through.
- **Flush / unselected:** the inactive BUY/SELL side button is `bg-transparent text-ink-secondary border border-rule` with no shadow, so it sits flat on the ticket stock. `bg-transparent` emits real CSS in this build — the side pair reads as one stamped key on a bare form, not a filled/ghost pair.
- **Segment control:** a track of `bg-rule/20 p-1` (paper) or `bg-desk-800 border border-desk-line p-1` (chrome) holding equal-width children; the active child is `bg-paper-50 text-ink shadow-paper` (paper) or `bg-paper-100 text-desk-900` (chrome), the inactive child is `text-ink-secondary hover:text-ink`. Every group carries `role="group"` + `aria-label`, and every toggle carries `aria-pressed`. This is the system's answer to tabs, radio groups and filters alike.
- **Quick chips:** 11px mono, `border border-rule`, `hover:border-accent-text hover:text-accent-text`. The `ALL {qty}` variant swaps to sell semantics (`border-sell-text/50 text-sell-text hover:bg-sell-text/10`) because it is a destructive-default shortcut, not a neutral one.
- **Focus:** no per-component focus styling anywhere — every control inherits the global `:focus-visible` rule (see Accessibility).
- **Loading:** only two places have a submitting state (order ticket, login). Both reduce opacity and swap the label. No spinners exist in the system.

### Tags
- **Style:** `inline-block border rounded-ticket px-1.5 py-px font-mono text-2xs font-medium tracking-wide`, colour driven by a single `STATUS_STYLE` lookup.
- **Vocabulary and colour law:** `PENDING` amber (`warn-text` at /10 fill, /40 border), `TRIGGERED` ink-blue, `FILLED` green, `CANCELLED`/`EXPIRED` muted grey (`ink-muted/15` fill, `ink-secondary` text), `REJECTED`/`SELL` oxblood, `BUY` green. Every one of the eight lifecycle/side labels has an explicit entry. Any label *not* in the map falls through to the accent-blue fallback — which is what makes the tag double as a generic chip (`YOU` on the Leaderboard).
- **Neutralised tags:** the sector, exchange and order-type tags pass `!bg-transparent !text-ink-secondary !border-rule`. `bg-transparent` now emits real CSS, so these render with **no fill at all** — transparent stock, `ink-secondary` text, `rule` border — and read as quiet classification chips rather than state tags.
- **Rounded exception:** the sidebar's pending-order count badge is the only tag-like object using `rounded-full` and `bg-warn-mark/20`.

### Cards / Containers
- **`Paper`** is the only container. `rounded-ticket shadow-paper`, with `.paper` (`#ece4d4` + turbulence fleck layer + ink text) by default and `.paper-ticket` (`#f4eee1`) for fresh/actionable stock. `as` can retarget the element so a summary strip can be a `<div>`. Every `.paper` now also owns the paper-side browser surfaces: the ink-blue `:focus-visible` ring and the blue `::selection` wash both key off `.paper`, so a new panel gets them by carrying the class and nothing else. Two panels (the dashboard blotter, the StockDetail quote head) additionally pass a `paper-surface` marker class that no longer has any CSS behind it — it is inert.
- **`PaperHead`** is the standard card header: title in uppercase `text-sm font-semibold tracking-wide text-ink`, optional `sub` line in `text-2xs text-ink-muted`, optional right slot for links/segments, bottom hairline `border-rule/60`.
- **Internal padding:** `p-4` body, `px-4 pt-3.5 pb-3` head. Table-bearing cards drop body padding entirely so ruled rows run edge to edge.
- **Summary strips** are a single `Paper` divided by `divide-x divide-y md:divide-y-0 divide-rule/40` into `px-5 py-4` cells — the system's stat-tile pattern.

### Inputs / Fields
- **Style:** the `.field` class — `bg-paper-50 text-ink border border-rule rounded-ticket px-3 py-2 text-sm`, placeholder `#6f6552`. Used on text, number, password, email and native `<select>`. Width is always overridden at the call site (`!w-56`, `!w-40`, `!w-32`).
- **Hover / Focus:** `hover:border-rule-strong`; `:focus` clears the outline and substitutes `border-color: accent-text` + a 3px `rgba(43,91,132,0.18)` shadow ring.
- **Error:** `aria-invalid="true"` → `border-color: sell-text` + 3px `rgba(163,51,39,0.14)` ring. The order ticket's quantity and limit/stop price inputs are the only fields that set it, and they set it from client-side validation (`errorField`). There is still no error-*message* component for fields; the message text surfaces either on the rejection slip (order ticket) or as a bare `role="alert"` paragraph (login).
- **Disabled:** `background: #e3d9c4` (the value `paper-200` had before that step was deleted from the palette), `text-ink-muted`, `cursor: not-allowed`.
- **Labels:** always a wrapping `<label>` with a `text-xs text-ink-secondary` `<span>` above, `mt-1` on the control. Optional-field suffixes use `text-ink-muted`.

### Navigation
- **Sidebar:** `w-56`, logo lockup, then `NavLink` items at `px-3 py-2 text-sm font-medium` in the `.desk-tab` class (150ms background/colour transition). Inactive `text-paper-100/55` (5.07:1 on desk), active `bg-paper-100/10 text-paper-50 shadow-inset-line`. Hover `rgba(236,228,212,0.07)`. A pending-orders badge appears on the Orders item only when the count is non-zero.
- **Utility block:** a Search button with a `Ctrl K` `kbd` hint, then an "AVAILABLE CASH" readout above the user name/email with a sign-out icon button. The cash figure here is a deliberate exception to the Paper Rule — it is an at-a-glance balance on chrome, compact-formatted, and it appears in full on the blotter.
- **Mobile nav:** horizontal scroll strip under the header, `text-xs`, no icons, same active treatment minus the inset shadow.
- **Region toggle:** a two-cell segment (`IN`/`US`) rendering `NSE · ₹` / `US · $`, active cell `bg-paper-100 text-desk-900`.
- **Status lamp:** 2px dot + mono label. `OPEN` → `bg-buy-mark` + `animate-chase`; `PRE_OPEN` → `bg-warn-mark` + `animate-chase`; `CLOSED` → `bg-sell-mark` with the chase **off** (a still lamp means a still market). Feed health appends `· FEED LIVE / DEGRADED` in `paper-100/60` (5.79:1 on the desk), hidden below `sm`.

### Signature Component: The Order Ticket
The most authored object in the system and the world's thesis made literal.
- **Anatomy:** a `paper-ticket` form at `shadow-paper-lift` containing — a dashed-rule stub header (`Icon name="ticket"` + `ORDER TICKET` in 0.12em caps, right-aligned `SYMBOL · EXCHANGE`) carried on the system's only `.tear-bottom` perforation, so the header is literally punched off the body → side pair (two-up BUY/SELL; the selected one is `bg-buy-text`/`bg-sell-text` with `shadow-stamp`, the unselected is transparent with `border-rule`; SELL shows the held quantity as `/qty`) → order-type segment (MARKET/LIMIT/STOP) → price line (a read-only figure for MARKET, a `.field` for LIMIT/STOP) → quantity field → quick-quantity chips → optional 60-char ticket note → a cost preview `<dl>` behind a dashed rule (Est. value / Fee (0.05%) / **Total debit** or **Net credit**) that mounts only once quantity and price are valid → the commit button → a virtual-funds disclaimer in `text-2xs text-ink-muted`.
- **States:** default, `hover` (shadow lift), `active` (1px translate), `disabled/loading` (`FILING…` + 60% opacity), `field-invalid` (`aria-invalid` on the quantity and price inputs → oxblood border + ring), `error` (rejection slip), `stamped` (overlay). The ticket resets quantity/price/note and clears any prior result whenever the symbol changes.
- **The stamp overlay** (`absolute inset-0 z-20`, scrim `bg-paper-50/85`, `aria-live="polite"`, `pointer-events-none`): a `paper-50` card animating in with `animate-stamp-press`, carrying either `BUY · FILLED` / `SELL · FILLED` in `stamp-buy`/`stamp-sell` plus `N SHARES @ price` and `WRITTEN TO LEDGER · {id}`, or `{TYPE} · RESTING` in `stamp-neutral` plus `N SHARES UNTIL FEED CROSSES {price}` and `SCHEDULER WILL SWEEP THIS · {id}`. It auto-dismisses after 4200ms.
- **The rejection slip:** a `paper` block below the ticket with `border-l-0`, `border-sell-text/40`, entering via `animate-slide-in-right`, `role="alert"`, leading with a small `stamp-sell` reading `REJECTED`, the validation message in `text-xs font-semibold`, and the reassurance line "Nothing was written to the ledger. Adjust the ticket and re-file." — the product's atomicity claim stated as UI copy.
- **Validation** is client-side and sequential: quantity ≥ 1, then a limit price for LIMIT, then a stop price for STOP. The failure path never clears the user's other inputs.

### Empty and Skeleton States
- **`EmptyState`:** a 48px dashed `rounded-full` circle (`border-rule-strong/70`) holding a single authored icon, a `text-sm font-semibold text-ink` title, an optional `max-w-[42ch]` body, and an optional accent link action. `icon` takes an authored icon **name** (default `blotter`) and renders it through the `Icon` component at 20px in `text-ink-muted` — no caller-supplied glyphs anywhere. The shipping set is consistent: `blotter` (dashboard, portfolio, ledger), `search` (markets), `star` (watchlist), `ticket` (orders).
- **Skeleton:** `.skeleton-row` — a `linear-gradient` in `rgba(169,154,120,0.12→0.22)` at `800px` background-size running `animate-shimmer` at 1.6s linear infinite. `Skeleton` wraps it with `rounded-ticket`. Loading layouts mirror the loaded layout's grid exactly (dashboard and portfolio both ship a full skeleton grid with `aria-busy="true"`), so nothing reflows on arrival.

### The Ticker Tape
`h-9` on `#14120e`, `role="marquee"`, mask-faded at both edges by `.tape-mask` (transparent → opaque at 3% → opaque at 97% → transparent). Inside, two identical rows of symbol + price + `DeltaPct`, translated by `animate-marquee` 45s linear infinite; the duplicate row is `aria-hidden` and its links are `tabIndex={-1}` so keyboard users never tab through the tape twice. Ticker is the only place a price sits on chrome, and it earns it by being a quotation board, not a data panel. Empty quotes render as a bare 9px strip rather than an empty marquee.

### The Search Palette
`Ctrl/⌘K` opens a fixed overlay (`bg-desk-950/70 backdrop-blur-sm`, `pt-[12vh]`) holding a `paper` card at `shadow-paper-lift`, `w-[min(92vw,560px)]`. Header row is `Icon name="search"` + a borderless transparent input + an `ESC` `kbd`; results are `ruled-rows` buttons showing symbol, name, `LivePrice` and `DeltaPct`, capped at 8. Empty query results print "No matches for “{q}”." `role="dialog"` + `aria-modal`; Escape closes; the input is focused 30ms after mount; clicking the scrim closes but clicking the card does not. The search field carries `bg-transparent` and inherits Tailwind's zeroed border from preflight, so it reads as bare type on the paper rather than a boxed field.

### The Mark (logo)
One authored 32×32 SVG in `client/src/components/Mark.jsx`, imported by both `AppShell.jsx` (desk rail at 32px, mobile header at 26px) and `Login.jsx` (36px) — the two inline copies are gone. It is a `#ece4d4` tile with `rx="3"` corners and a `#a99a78` 1px outline, carrying a `#a33327` 2.2px rising stroke with a 2.2px dot at its head ringed in `#ece4d4`. It is the only place oxblood is used as a *drawing* colour rather than a semantic one, and it is `aria-hidden` — the wordmark beside it carries the name.

### The Icon System
Hand-authored SVG, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, **one stroke weight (1.6)**, `strokeLinecap="round"`, `strokeLinejoin="round"`, default 20px, `aria-hidden` + `focusable="false"` always (icons never carry meaning alone; labels do). Twelve glyphs exist: `blotter, markets, stock, ticket, ledger, star, trophy, search, logout, stamp, clock, arrowLeft`. Ten are live in shipping code; `stamp` and `clock` remain authored but unreferenced. Sizes in use: 20 (nav default and every `EmptyState`), 17 (ticket header, stock star), 16 (watch star), 15 (search field adornment), 14 (pager), 10 (lifecycle legend separators). `arrowLeft` is reused rotated 180° as a right chevron rather than shipping a second glyph.

## Charts

Charts are hand-authored SVG on the paper surface — no chart library, no canvas. Colours are local constants in `charts.jsx` mirroring the token values (`INK #241f1a`, `INK_MUTED #6f6552`, `GRID rgba(169,154,120,0.35)`, `BUY_MARK #0a7d54`, `SELL_MARK #b04a37`, `LINE #1a5fa8`, `PAPER #ece4d4`).

**The mark system (one grammar across all four charts):**
- **Plot background** is the card's paper (`#ece4d4`); there is no chart-specific surface and no chart border.
- **Lines:** 2px, `strokeLinecap="round"` + `strokeLinejoin="round"`. Area fills are the same hue at **`opacity="0.1"`** — a wash, never a block.
- **Gridlines:** 1px solid `rgba(169,154,120,0.35)`. `PriceChart` draws exactly 5 (a 4-interval split of the padded domain) with right-rail axis labels in 10px mono `#6f6552`. `ValueArea` draws 3 unlabelled rules at 25/50/75%.
- **Candles** (`PriceChart` `mode="candle"`): body width `clamp((iw / n) * 0.62, 1.6px, 10px)`, minimum 1px body height, 1px wick. **Up candles are hollow** (`fill: PAPER`, `stroke: buy-mark`), **down candles are solid** (`fill: sell-mark`). This is the one place the system relies on fill-vs-outline instead of colour to encode direction.
- **Markers:** end/last-point circles are `r="4"` (8px) with a **2px paper ring** (`stroke: PAPER strokeWidth="2"`) so they never sit directly on the line. The last price is additionally flagged by a filled ink badge (`rx="2"`, 16px tall) on the right rail with 10px mono paper-coloured text, plus a 35%-opacity horizontal rule across the plot.
- **Crosshair:** a 1px `#6f6552` vertical rule at the hovered index plus a 4px ink dot, both `pointer-events-none`. The tooltip is a `bg-ink text-paper-50 rounded-ticket shadow-paper` block in `text-2xs` mono, positioned `left: min(hover.x + 12, w - 150), top: 6` so it cannot overflow the right edge. It shows timestamp (en-IN, 24h) then `O/H` and `L/C` with the close in bold.
- **Reference line:** `refPrice` (previous close) is a 1px `#6f6552` dashed rule (`strokeDasharray="2 4"`, `opacity="0.7"`) labelled `prev close {value}` at the left edge.
- **Empty/loading:** a centered `text-xs text-ink-muted` line ("Loading price history…"), height-locked to the chart's own height. No axes, no skeleton.
- **Accessibility:** the plot `<svg>` is `role="img"` with a generated `aria-label` ("Price chart, N bars, last X"); the `Sparkline` is `aria-hidden` (it is a de-emphasised decoration and always appears beside the real figure).

**Chart inventory:**
- **`Sparkline`** (72–96 × 22–28): no axes, no grid, no markers. 1.5px stroke at `opacity="0.85"`, coloured by the holding's P&L direction. Note this is the one chart mark that is *not* 2px despite the file's own header comment claiming a uniform 2px.
- **`PriceChart`** (300px in StockDetail): candles or line, grid, prev-close reference, last-price rail badge, crosshair + tooltip. Y-domain pads 6% beyond the min/max and folds `refPrice` into the domain so the reference line is always on-canvas. Width comes from a `ResizeObserver`, floored at 320px.
- **`ValueArea`** (180–220px): single-series portfolio value. 2px line, 10% area, 4px end marker with paper ring, date labels at both ends in 10px mono. Direction colour is computed once (`last >= first`) and applied to both line and area, so a rising portfolio is entirely green and a falling one entirely oxblood.
- **`SectorBars`**: horizontal magnitude bars, one hue, `bg-rule/25` track, fill at `opacity="0.75"`, widths normalised to the largest sector. This is the system's answer to "more than three series": abandon categorical colour entirely.

**The three-slot cap.** Chart marks live on `#ece4d4`, where the non-text contrast floor (3:1) admits exactly three of the four semantic hues: `accent-mark #1a5fa8` (5.12:1), `sell-mark #b04a37` (4.28:1), `buy-mark #0a7d54` (4.08:1). `warn-mark #d96c1e` measures 2.72:1 on paper and therefore never appears as a chart mark — it is reserved for desk chrome (5.21:1) as a lamp and for the caret colour, though it does leak onto paper as a non-chart fill and as indicator dots (see gaps). Beyond three series, the system switches encoding: single-hue magnitude (`SectorBars`), sequential position (the Ledger's Debit/Credit columns), or fill-vs-hollow (candle bodies). Adding a fourth chart hue requires a new token that clears 3:1 on warm paper — do not reach for a lighter amber or a fifth hue.

## Motion

Motion is authored moment-by-moment, not tokenised into a global easing scale. Every animation in the system exists to narrate a specific event; nothing animates on entry, and no page has a transition.

**Keyframes and animation tokens (all in `tailwind.config.js`):**

| Token | Keyframes | Duration / easing | Purpose |
|---|---|---|---|
| `animate-marquee` | `translateX(0)` → `translateX(-50%)` | 45s linear infinite | Ticker tape. The -50% end state is what makes the duplicated row seamless. |
| `animate-stamp-press` | scale 2.2 rot -9° → 0.94/-3° @55% → 1.04/-3.5° @75% → 1/-3.5° | 380ms `cubic-bezier(0.16,1,0.3,1)` both | The stamp coming down: overshoot, squash, settle. Ends rotated -3.5° to match `.stamp`'s resting angle. |
| `animate-flash-up` | `rgba(10,125,84,0.28)` → transparent | 900ms ease-out | A live price ticking up. Uses `buy-mark` as a 28% wash behind the mono figure. |
| `animate-flash-down` | `rgba(163,51,39,0.24)` → transparent | 900ms ease-out | A live price ticking down (`sell-text` at 24%). |
| `animate-shimmer` | background-position -400px → 400px | 1.6s linear infinite | Skeleton rows. |
| `animate-chase` | opacity 1 → 0.25 → 1 | 1.4s ease-in-out infinite | The chase lamp: market open/pre-open status dot, pending-order dots, the scheduler-sweep indicator. A blinking lamp means something is *waiting*. |
| `animate-slide-in-right` | translateX(24px) + opacity 0 → 0/1 | 280ms `cubic-bezier(0.16,1,0.3,1)` both | The rejection slip arriving. |

**Transitions (state, not story):** `.desk-tab` 150ms ease-out on background/colour; `.field` 150ms ease-out on border-colour/box-shadow; Tailwind `transition-colors` (150ms `cubic-bezier(0.4,0,0.2,1)`) on rows, tags, links and segment buttons; `transition-all` on commit buttons (shadow lift + 1px active translate) and the BUY/SELL side pair.

**Authored moments:**
1. **Stamp press** — order ticket, on a resolved order; holds 4200ms then clears via a JS timer.
2. **Price flash** — `LivePrice` compares each incoming tick against the previous price and applies `flash-up`/`flash-down`, clearing the class after 950ms. (The CSS animation is 900ms — the 50ms tail is deliberate-looking but undocumented.)
3. **Tape marquee** — continuous, 45s for a full loop.
4. **Chase lamp** — status and pending indicators.
5. **Shimmer** — skeletons only.
6. **Slip arrival** — rejection slide-in.

**Reduced motion:** a single global `@media (prefers-reduced-motion: reduce)` block sets `animation-duration: 0.01ms !important`, `animation-iteration-count: 1 !important` and `transition-duration: 0.01ms !important` on every element and pseudo-element. With `both`/`forwards` fill modes this collapses each authored moment to its final resting state (stamp lands instantly, slips appear in place, the marquee lands on its -50% loop point where the two rows are visually identical). No reduced-motion variant removes an animation's *class*, so the JS timers still run and still clear state.

## Accessibility

- **Focus ring, desk:** global `:focus-visible { outline: 2px solid #4a86bf; outline-offset: 2px }`. `#4a86bf` is a one-off hex that exists in no palette; it is a lightened accent blue chosen for contrast against `#191713` (4.65:1). It is the ring for anything focusable sitting on chrome — sidebar nav, the header's region toggle, the tape links, the mobile nav.
- **Focus ring, paper:** `.paper :focus-visible` switches to `2px solid accent-text` with `outline-offset: 1px` — a darker blue at a tighter offset, because the ring sits on a light surface inside a tight panel. `#2b5b84` on paper is 5.67:1. The selector keys off `.paper`, so **every** paper panel's focusable controls get it automatically; there is no per-panel opt-in and no under-contrast fallback case left.
- **Fields opt out of the ring:** `.field:focus` sets `outline: none` and substitutes a border-colour change plus a 3px translucent halo. This fires on mouse focus too, so fields deliberately diverge from the `:focus-visible` doctrine.
- **Selection, desk:** `::selection` background `#2b5b84`, colour `#f4eee1` (6.19:1). **Selection, paper:** `rgba(43,91,132,0.28)` background with ink text, so text stays legible while the blue wash sits under it.
- **Caret:** `caret-color: #d96c1e` (`warn-mark`) on all `input`/`textarea` — the amber caret is a 1px instrument rather than a graphic, which is how it is allowed on paper at 2.72:1.
- **Scrollbars:** `scrollbar-width: thin`, `scrollbar-color: #3a352b #191713`; WebKit thumb `#38332a` with a 2px desk-900 border and 5px radius, hover `#4a4438`. `color-scheme: dark` on `:root` so OS-native controls (the Markets `<select>` popup) render dark.
- **Reduced motion:** see Motion. This is the system's only motion policy and it is global, not per-component.
- **Never colour alone:** see Colors — sign, arrow, or column always accompanies hue. The tag vocabulary is the one place colour *does* carry state alone, and it always prints the state word as its label.
- **Composition of accessible primitives:** `role="group"` + `aria-label` on every segment control; `aria-pressed` on every toggle; `aria-label` on every icon-only button; `sr-only` labels on the Markets search field and the watch column; `aria-invalid` on the order ticket's quantity and price inputs when validation fails; `role="marquee"` + `aria-label="Live quotes"` on the tape with the duplicate row's links removed from the tab order; `aria-live="polite"` on the stamp overlay; `role="alert"` on the rejection slip and the login error; `role="dialog"` + `aria-modal` + Escape handling on the search palette; `aria-hidden` on all decorative glyphs and the sparkline; `aria-busy="true"` on skeleton layouts; `role="img"` + `aria-label` on the price chart.
- **Hit areas:** the smallest interactive target in the system is the 16px star toggle; most controls are ≥28px tall. The 10px lifecycle-legend arrows are decorative.
- **Contrast outliers (measured):** the one sub-threshold value still shipping is `text-rule-strong` on the Orders lifecycle-legend separators (2.19:1) — both glyphs are `Icon`-rendered and therefore `aria-hidden` decorative dividers, so nothing is conveyed by them. The two previously-shipping failures are both fixed: the feed-health suffix moved from `paper-100/25` (2.03:1) to `paper-100/60` (5.79:1), and the un-starred watch icon moved from `text-rule-strong` (2.19:1) to `text-ink-muted` (4.54:1).

## Do's and Don'ts

### Do:
- **Do** put every defensible figure on paper (`paper-100` / `paper-50`) in ink, set in `.num` for tabular alignment. The Paper Owns The Numbers Rule is the system's spine.
- **Do** pair colour with sign, arrow or column, always — `+`/`−`, `▲`/`▼`, or a Debit/Credit split.
- **Do** use `rounded-ticket` (3px) on every rectangular corner, and reserve `rounded-full` for lamps and count badges.
- **Do** differentiate surfaces by material before shadow: `paper-50` sits on `paper-100`, `paper-100` sits on the desk.
- **Do** use `bg-transparent` for anything that must sit flush on its surface — the unselected BUY/SELL side button, the search-palette input, and the neutralised sector/exchange/order-type tags. It emits real CSS in this build.
- **Do** separate with 1px hairlines — `border-rule/40`–`/60` for dividers, dashed `rule-strong/60`–`/70` for stubs and in-card breaks.
- **Do** put every toggle in a `role="group"` segment with `aria-pressed`, and give every icon-only control an `aria-label`.
- **Do** express hierarchy in type as caps + tracking for classification and weight/ink-step for emphasis.
- **Do** use one authored SVG stroke weight (`1.6`, 24px grid, `currentColor`, `aria-hidden`) for any new icon, and import `Mark.jsx` for the logo rather than inlining a second copy.

### Don't:
- **Don't** render a financial number on desk chrome. The two exceptions that ship (the sidebar `AVAILABLE CASH` readout, the ticker tape) are at-a-glance and always restated on paper.
- **Don't** use `warn-mark #d96c1e` as a chart mark — it is 2.72:1 on paper. Amber on paper is always `warn-text #7a581f`.
- **Don't** import a chart library or draw a chart on canvas. Charts are hand-authored SVG following the shared mark grammar (2px lines, 10% area wash, hairline grid, 4px markers with a 2px paper ring, 5 gridlines max).
- **Don't** add ambient or entrance animation. Every animation narrates an event that is happening now; the seven keyframes are the complete inventory.
- **Don't** use tabular figures for a monumental hero value — that is what `.figure-hero` exists to opt out of.
- **Don't** use a `<select>`, dialog or popover where the segment pattern fits; the native select is a one-off on Markets.
- **Don't** put shadow on anything that is not one of: a resting paper card (`shadow-paper`), a commit/floating surface (`shadow-paper-lift`), a pressed key (`shadow-stamp`), or a recessed nav tab (`shadow-inset-line`).
- **Don't** reach for a default Tailwind colour. `theme.colors` is a full replacement (not `extend`) — the only non-brand colours that exist are the three built-ins restored on purpose (`transparent`, `current`, `inherit`). There is no `white`, `black`, `slate` or `red` in this build.
- **Don't** exceed three series with hue on the paper surface. Switch to single-hue magnitude, sequential position, or fill-vs-hollow instead.

## Known Inconsistencies & Gaps

Values below are read from the code as it ships. Nothing here is a suggestion — it is the delta between the direction contract and the implementation.

**Tokens that bypass the palette (hardcoded hex outside `tailwind.config.js`)**
- `styles.css` hardcodes every paper/ink/rule value rather than referencing the Tailwind tokens — `.paper`, `.paper-ticket`, `.ruled-rows`, `.tear-bottom`, `.punch-holes`, `.stamp-*`, `.field`, `.skeleton-row`, `.desk-tab:hover`, `::selection`, `:focus-visible`, `caret-color` and the scrollbar rules. The values agree with the config today; they will not follow a token change.
- Four hex values now exist in **no** palette entry at all: `#4a86bf` (desk focus ring), `#4a4438` (scrollbar thumb hover), `#38332a` (scrollbar thumb — the value `desk-600` used to hold) and `#e3d9c4` (`.field:disabled` background — the value `paper-200` used to hold). Deleting those two steps from the palette left their only consumers unreachable by any token.
- `#191713` is written literally inside `.tear-bottom` and `.punch-holes` instead of resolving to `desk-900`, so the punched holes will not follow a change to the desk body colour.
- `charts.jsx` re-declares `INK`, `INK_MUTED`, `BUY_MARK`, `SELL_MARK`, `LINE`, `PAPER` as local constants, and `GRID` as `rgba(169,154,120,0.35)` (a rule-strong alpha that has no token). Charts cannot be re-themed from the config.
- The lamp gradients (`rgba(210,180,120,0.07)`, `rgba(190,160,100,0.05)`), the skeleton gradient (`rgba(169,154,120,0.12→0.22)`), the field focus ring (`rgba(43,91,132,0.18)`), the field-invalid ring (`rgba(163,51,39,0.14)`) and the paper selection wash (`rgba(43,91,132,0.28)`) are all raw rgba derivations of palette colours with no token behind them.
- `Mark.jsx` hardcodes `#ece4d4`, `#a99a78` and `#a33327` (plus a second `#ece4d4` as the dot's ring). The duplication is gone — it is one file now — but the values still bypass the tokens.

**Palette entries defined but unused**
- None. The four unused steps (`desk-600`, `desk-700`, `paper-200`, `paper-300`) were deleted from `theme.colors`, and every remaining step is referenced by at least one utility. `desk-800` is the thinnest of them: a single use, the Orders filter pill track.

**Authored but unreferenced**
- Every class in `styles.css` is now referenced from JSX: `.perf-bottom` and `.tear-right` were deleted and replaced by the single `.tear-bottom`, which the order ticket's stub header uses; `.punch-holes` ships on the Ledger.
- Two authored icons are unreferenced: `stamp` and `clock`. The other ten are live. (`shield`, `wallet`, `plus` and `x` were removed from the file.)
- Two panels still pass a `paper-surface` class that no longer has any CSS behind it (`Dashboard.jsx`'s blotter, `StockDetail.jsx`'s quote head) — harmless, but it reads as if it does something.

**State-coverage gaps**
- `Tag`'s `STATUS_STYLE` map now carries an explicit `TRIGGERED` entry, but that entry is byte-identical to the unknown-label fallback (`accent-text` at /10 fill, /40 border). A triggered order is still styled exactly like an unrecognised label.
- `STATUS_STYLE` has no entry for `CASH` or `DIV`, both of which `Ledger.jsx` renders through `Tag label={t.type}`. Those rows fall through to the same accent-blue fallback, so a dividend and a cash movement read as "unknown" chips on the page that is supposed to be the most literal.
- The two "primary" commit buttons use different colours for the same job: the order ticket commits in `buy-text`/`sell-text`, login commits in `ink`. There is no single primary-button token.
- `active:translate-y-px` and the `shadow-paper` → `hover:shadow-paper-lift` lift exist on the order-ticket and login commit buttons but not on the ghost, segment, chip or pager buttons. `disabled:opacity` is 60 on commit buttons, 35 on pager buttons.
- Only two controls in the entire app have a submitting state (order ticket, login). Everything else that dispatches (cancel order, watch toggle, region switch) resolves without a pending affordance; the region switch relies on a toast.
- No field renders an inline error *message*. `aria-invalid` is now set, but only by the order ticket's quantity and price inputs, so the oxblood border and ring are reachable while the explanatory text still lives on the rejection slip below the form (or a bare `role="alert"` paragraph on login).

**Visual drifts from the system's own rules**
- Row-hover tint is now uniform: `bg-rule/12` on dashboard holdings, markets, portfolio, orders, ledger, watchlist, leaderboard and the search palette. The one other hover value is `hover:bg-paper-100/5` on the ticker tape — the correct exception, since the tape is chrome and so is tinted with paper rather than with rule.
- Two-column rail widths drift: 340px (dashboard, stock detail), 300px (leaderboard), and the portfolio uses a `1.6fr / 1fr` ratio instead of a fixed rail. Table `min-w` drifts across the same class of content: 680 (dashboard holdings) / 720 (markets) / 760 (portfolio positions) / 780 (ledger).
- `Sparkline` strokes at 1.5px while `charts.jsx`'s own header comment declares a uniform 2px mark system; it is also the only mark drawn at `opacity="0.85"`.
- `dir="rtl"`/logical properties: none used; spacing is physical (`pl-8`, `-mx-2`).
- Mobile nav has no icons and no `shadow-inset-line` on the active tab, so the active state is a lighter tint only (`bg-paper-100/10`) — the sidebar's inset recess has no mobile equivalent.
- `.field` is applied to a native `<select>` on Markets only; its popup styling depends on `color-scheme: dark`, so the dropdown list renders dark while the closed control is light paper.
- `LivePrice` clears its flash class at 950ms while the `flash-up`/`flash-down` keyframes run 900ms — a 50ms tail in which the class is applied but the animation has finished.
- `warn-mark #d96c1e` is documented as chrome-only, but it is drawn on paper inside paper cards in two places: the Portfolio Risk card's concentration bar uses it as a fill (`bg-warn-mark`, 2.72:1 on `paper-100`), and the pending-order chase dots in the dashboard "Working orders" card and the Orders list are `bg-warn-mark` lamps sitting on paper. Neither is a chart mark, so the three-slot cap is intact — but both break the Two-Step Semantic Rule.
- `text-rule-strong` on the Orders lifecycle-legend separators measures 2.19:1. Nothing is lost today because both glyphs are `aria-hidden` decoration, but any future *meaningful* use of `rule-strong` for text or icons on paper inherits the same failure.
