# FLAME IN FREEFALL — Product Design System

**Status:** Visual direction approved; implementation includes live NASA NTRS search, paper details, Supabase authentication, private research persistence, and a source-grounded Gemini research assistant.  
**Scope:** Public landing page and authenticated research overview, with reusable rules for the wider research product.  
**Product name:** FLAME IN FREEFALL.

This file is the design source of truth for the first implementation. “Orbital Research” and “Combustion Lab” name visual directions in the concept review; they are not product names, sub-brands, or labels to show in the product. Use **FLAME IN FREEFALL** consistently.

## Project baseline

The project includes the approved public landing page and research dashboard, this design system, and the approved visual references. Implemented capabilities include live NASA NTRS research search and traceable paper details, Supabase authentication and private research persistence, and a source-grounded AI research assistant. The approved visual system remains the source of truth for implementation.

## Approved visual references

Preserve the approved dark aerospace identity and the composition, hierarchy, and imagery treatment of these concepts:

- [Approved public landing page — Orbital Research concept](design/references/approved-public-landing-page.png)
- [Approved authenticated dashboard — Orbital Research concept](design/references/approved-authenticated-dashboard.png)
- [Secondary table-readability reference — Combustion Lab dashboard](design/references/secondary-table-readability-reference.png)

The Combustion Lab image is approved only as a reference for row density, column hierarchy, clear headings, and evidence/interpretation separation. Do not bring its white theme, flame logo, brand label, or light navigation into the product. The generated flames are concept illustrations, not authenticated NASA imagery. Replace them before launch with traceable, permission-cleared research imagery or explicitly identified illustrative art.

## Product identity and design principles

### Identity

- Product and wordmark text: **FLAME IN FREEFALL**.
- Product purpose: help scientists, engineers, and researchers find, compare, and understand traceable research on microgravity combustion.
- Brand character: aerospace research laboratory, premium scientific intelligence product, precise and exploratory.
- Use the wordmark and restrained orbital geometry from the approved visual language. An orbital mark may support the wordmark, but it must not read as a second product identity.
- Do not use NASA’s logo, imply NASA endorsement, or present generated concept imagery as NASA photography.

### Principles

1. **Make the research legible.** Search, source metadata, units, and comparison context take priority over decoration.
2. **Keep evidence distinct from interpretation.** A reader must be able to tell what a source reports and what the AI inferred.
3. **Make claims traceable.** Scientific statements and values connect to a resolvable research record and location within that record.
4. **Use atmosphere with restraint.** Large cinematic imagery belongs in the public story and in selected research visualizations. It must not reduce text or control contrast.
5. **Prefer open structure to card grids.** Use aligned sections, ruled tables, lists, and one purposeful contained figure. Reserve cards for meaningful, selectable shortcuts.
6. **Do not fabricate proof.** No fake metrics, publications, citations, NASA claims, dates, endorsements, or experimental values. Label every sample dataset and record.

## Color tokens

The values below are implementation targets sampled and harmonized from the approved dark references. Check every text and control pairing for required contrast during implementation; adjust a token where necessary without changing the dark identity.

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#050B11` | Deep page background and full-bleed dark regions |
| `navy-900` | `#07131D` | Main application background |
| `navy-850` | `#0A1722` | Sidebar and inset workspace areas |
| `surface-1` | `#0D1B27` | Search fields, table hover, compact controls |
| `surface-2` | `#122330` | Selected rows, menus, elevated panels |
| `surface-3` | `#182B39` | Strong selected/pressed surfaces where needed |
| `border-subtle` | `#203342` | Dividers and low-emphasis borders |
| `border-strong` | `#3B5263` | Input outlines and table/header separation |
| `text-primary` | `#F3F7FA` | Main headings and body copy |
| `text-secondary` | `#B8C6D2` | Supporting copy, row metadata |
| `text-muted` | `#93A5B5` | Secondary labels; use only after contrast validation |
| `accent-ember` | `#FF783F` | Primary CTA, active navigation rail, evidence marker |
| `accent-ember-hover` | `#FF9160` | Hover state for orange controls |
| `accent-ember-pressed` | `#E8652E` | Pressed state |
| `accent-ember-ink` | `#101820` | Text and icons on the orange primary button |
| `accent-cyan` | `#83CFF2` | AI-interpretation marker, focus ring, selected data accents |
| `accent-cyan-soft` | `#B6E5F8` | Supporting cyan text on dark surfaces |
| `status-success` | `#6DD4A1` | Successful saves or completed operations only |
| `status-warning` | `#F0C36D` | Warnings requiring attention |
| `status-error` | `#FF8585` | Errors and invalid form fields |
| `status-info` | `#83CFF2` | Informational notices |

Semantic color is never the only status cue. Pair it with a text label and, where useful, an icon or line style. Orange identifies primary action/selection and published-evidence regions; cyan identifies AI interpretation and keyboard focus. Neither hue alone denotes scientific confidence or result quality.

## Typography

Use **Space Grotesk** for display and interface headings, with **Inter** for body text and dense controls. Use bundled/local font files when the project has them; otherwise use a properly licensed web font with these fallbacks: `Space Grotesk, Arial, sans-serif` and `Inter, Arial, sans-serif`. A monospace face may be used sparingly for identifiers, units, and code-like metadata; never for body copy.

| Style | Desktop target | Weight | Line height | Use |
| --- | ---: | ---: | ---: | --- |
| Display / landing H1 | 64–76 px | 700 | 0.98–1.04 | Hero headline; preserve the approved uppercase lockup |
| Page H1 | 36–44 px | 600–700 | 1.08–1.16 | Dashboard and screen title |
| H2 | 28–36 px | 600–700 | 1.12–1.2 | Major page sections |
| H3 | 20–24 px | 600 | 1.2–1.3 | Panels, table groups, dialogs |
| Body large | 18 px | 400–500 | 1.45–1.6 | Landing explanation and lead copy |
| Body | 16 px | 400–500 | 1.45–1.6 | Main interface copy and form labels |
| UI small | 14 px | 400–600 | 1.35–1.5 | Filters, secondary controls, row metadata |
| Data label | 12–13 px | 500–600 | 1.3–1.45 | Axes, units, timestamps, dense metadata |

Use slightly negative tracking on large headings (about `-0.02em` to `-0.04em`) and modestly expanded tracking for small uppercase section labels. Keep body text at 16 px where space allows. Avoid long all-caps paragraphs, thin text over imagery, and any control relying on browser-default typography. At narrow widths, scale the landing H1 to 40–48 px and preserve the approved line breaks where they fit.

## Spacing, grid, and geometry

Use a 4 px base spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128 px`. Keep repeated controls, table rows, and section gutters on these values. Prefer spacing changes over nested borders to separate content.

- Desktop app grid: 12 columns, 24 px gutters, content centered within a maximum 1440 px workspace.
- Landing grid: 12 columns, 24–32 px gutters, maximum content width 1440 px. Hero copy is constrained to roughly 6 columns; image and copy may share the viewport as in the approved reference.
- Outer page padding: 32–64 px desktop, 24–32 px tablet, 16–20 px mobile, respecting device safe areas.
- Section spacing: 64–96 px desktop and 40–64 px mobile. Use full-width divider rules to establish the landing page’s science-story transitions.
- Control radius: 6–10 px. Use one shared radius family; no oversized rounded wrappers around whole screens.
- Panel radius: 8–12 px only for meaningful focused areas such as a selected comparison or dialog. Most dashboard content uses open layout and hairline dividers.
- Shadows: restrained and limited to overlays. Separate normal content primarily with background value, spacing, and borders.

## Responsive breakpoints and layout rules

Use content-driven breakpoints, with these initial targets:

| Name | Width | Layout rule |
| --- | ---: | --- |
| Mobile | `< 640 px` | Single column; app navigation becomes a drawer; tables become readable stacked rows or horizontally scroll only when column relationships require it |
| Tablet | `640–1023 px` | Two-column landing sections where content allows; app sidebar collapses to an icon rail or drawer; charts and tables may occupy full width |
| Desktop | `1024–1439 px` | Full sidebar and primary multi-column research workspace |
| Wide desktop | `≥ 1440 px` | Center within the maximum content width; retain readable line lengths and avoid stretching tables/paragraphs |

### Public landing page

- Preserve the first-screen hierarchy: quiet wordmark/navigation; exact headline **“FIRE BEHAVES DIFFERENTLY BEYOND EARTH.”**; concise problem/platform explanation; orange **Explore Research** action; outlined **Ask the Research Assistant** action; dramatic microgravity-flame image.
- Keep the hero open and spacious. No added eyebrow, invented metrics, badges, or product chrome over the hero image.
- Continue from science explanation to Earth/microgravity comparison imagery, then into a restrained preview of research discovery and the evidence/AI distinction, then a final invitation and quiet footer.
- On mobile, stack headline/copy/actions and image without clipping. Keep primary action first. Stack comparison media and captions; never shrink captions into unreadable overlays.
- Preserve the cinematic image and deep navy field. Do not tint/wash the image if the reference has no overlay. Blend edges with a matching crop, mask, or edge fade instead.

### Authenticated application

- Use a persistent left sidebar on desktop, with the main workspace filling remaining width.
- At tablet widths use a compact rail or a drawer, based on available content width. At mobile use a labeled navigation drawer with an obvious open/close control and correct focus handling.
- Keep the search, current page title, selected navigation item, and primary content discoverable at every size.
- In constrained layouts, move the recent-research list below shortcuts and comparison content rather than compressing text or forcing horizontal page overflow.
- Make chart controls and evidence/interpretation sections wrap to a vertical reading order on mobile.

## Navigation and application shell

### Authenticated sidebar

Use a fixed-width desktop sidebar approximately **264 px** wide, with a **72 px** compact rail. The wordmark block occupies about 96 px at the top. Main navigation items have at least 44 px height, 16 px horizontal inset, a consistent 20 px outline icon, and 12–16 px gaps between icon and label. Settings sits at the bottom when the viewport permits; otherwise it follows the primary list.

Keep this order and spelling:

1. Overview
2. Research Explorer
3. Paper Library
4. AI Research Assistant
5. Experiment Comparison
6. Scenario Explorer
7. Evidence Gaps
8. Scientific Analytics
9. Collections
10. Reports
11. Settings

The active item uses a 3–4 px ember-orange edge, a subtle navy surface, and readable text/icon emphasis. Hover uses a restrained surface shift. Focus uses the cyan focus ring. In compact mode provide accessible names/tooltips; do not make icon-only navigation the mobile default.

### Public header

Use the FLAME IN FREEFALL wordmark on the left; keep **About the Science**, **Research Sources**, and **Sign In** on the right at desktop. On mobile, retain the wordmark and provide a single menu button. Do not add search, status indicators, unrelated links, or a second brand.

## Reusable controls and components

### Buttons

- **Primary:** ember-orange fill, dark ink text, 44–48 px height, 16 px semibold text, 8 px radius, clear hover/pressed/disabled states. Use for the main action only.
- **Secondary:** transparent or navy surface, 1 px border, white text, same geometry and height as the primary button.
- **Quiet/link:** no filled container; use clear text contrast and an underline or visible hover/focus treatment.
- **Icon button:** minimum 44 × 44 px hit area; visible tooltip where the icon action is not self-evident.
- Use a consistent arrow, search, or chat icon style matching the approved line icon language. Do not use emoji or text-glyph arrows.

### Search and inputs

- Primary research search is a full-width, high-priority control with a 56 px desktop target height, search icon, legible placeholder, and a distinct submit action. Preserve a 48 px minimum at smaller widths.
- Use dark surface, 1 px strong border, 8 px radius, 16 px text, and a cyan focus outline. Placeholder text is secondary, never the only label.
- Filter selects, checkboxes, toggles, and comboboxes share the same border, radius, focus, and typography rules.
- Forms always have persistent labels, helper text where needed, inline validation, and a clear submission status. Required/optional state is expressed in text, not color alone.

### Tables and research lists

Borrow the Combustion Lab reference’s readable column hierarchy, generous row spacing, and precise dividers while keeping all surfaces dark.

- Prefer real tables for comparable records and open lists for recent/research activity. Do not turn a table into repetitive cards on desktop.
- Use a clear header row with 12–13 px medium labels, 48–64 px body rows, 16 px primary record text, and 14 px metadata.
- Use subtle horizontal dividers instead of a border around every cell. Align numbers and units consistently; right-align numeric columns only when comparison benefits.
- A row includes a focusable/selectable record target and a separate, labeled overflow menu if present. Keep the entire row target comfortably usable without causing nested controls.
- At mobile, convert each record into a semantic stacked row: source title first, then essential metadata, then actions. Preserve relationships between values and headers.
- Distinguish illustrative records visibly with **Illustrative data** or **Illustrative interface concept**. Do not show plausible fake titles, dates, authors, DOIs, or measurements.

### Tabs, dialogs, menus, and form states

- Tabs use a consistent bottom rule or surface emphasis; the selected tab also has an accessible selected state. Use tabs only for peer views such as published evidence versus AI interpretation, not as decorative navigation.
- Dialogs use a near-black elevated surface, strong title, concise body, clear primary/secondary actions, and a restrained border/shadow. Desktop dialogs are 480–640 px wide; mobile dialogs use a full-width sheet or full-screen surface where necessary. Trap and restore focus correctly.
- Menus use surface-2, 8 px radius, clear item spacing, keyboard navigation, and visible hover/focus/disabled states. Do not place critical controls only behind hover.
- Form states: pristine, focused, filled, invalid, submitting, disabled, and success. Errors appear next to the field and are announced to assistive technology; keep entered values after recoverable failures.

### Research result and shortcut components

- A research result is a reusable row with source title, source type, authors/date only when present in a verified record, a concise traceable excerpt or description, research metadata, and an explicit source action.
- Include DOI, URL, repository identifier, experiment identifier, and page/section/figure location when available. Missing metadata is labeled as unavailable rather than guessed.
- Search shortcuts are a small set of meaningful actions (for example, continue a source, compare selected experiments, or open a saved collection). Use a row or a few restrained selectable panels; never make a grid of generic feature cards.
- Search results expose sort/filter state and the number of returned records only when computed from the actual source set. Clearly identify the active filters and provide a one-step way to clear them.

## Scientific data visualization

- Every plotted value must come from a traceable research record or from a documented transformation of traceable records. Include units, axis labels, conditions, method/context, and the source identifier or citation link needed to inspect it.
- Show uncertainty, sample size, normalization, and derivation when these exist in the source or analysis. Do not invent missing values, uncertainty bands, experimental dates, or quantitative comparisons.
- Distinguish measured/source values from derived values and AI-generated interpretation through labels, line styles, symbol shapes, and panel separation, not color alone.
- Use ember and cyan as restrained series/semantic accents against navy. Use white/gray for axes and supporting series. Ensure series remain distinguishable in grayscale and common color-vision deficiencies.
- Keep axes, units, tick labels, and legends readable; target at least 12 px for dense data labels and 14 px for interactive chart controls. Prefer direct labels over remote legends when they aid comparison.
- Provide hover and keyboard-accessible data inspection, a text summary or data table alternative, and a concise accessible chart name/description.
- A conceptual flame image comparison without a cited source is **illustrative artwork**, not a measured plot. Mark it **Illustrative data** or **Illustrative visualization** in the figure itself and in adjacent explanatory text.
- Avoid decorative charts, unscaled flame silhouettes that imply measured values, and false precision. Never imply that visual similarity equals experimental equivalence.

## Published evidence and AI interpretation

Use two clearly separated, consistently styled presentation families in search results, paper readers, assistant answers, and comparisons.

### Published evidence

- Label the region **Published evidence** and use an ember marker/edge.
- Present source wording or a faithful summary with citation and source location. Keep quotations distinct from paraphrase and preserve relevant experimental conditions.
- Provide direct access to the paper/repository record and exact page, section, table, or figure when available.
- Do not silently repair, generalize, or merge conflicting source reports. Surface context or disagreement and let users inspect the records.

### AI interpretation

- Label the region **AI interpretation** and use a cyan marker/edge.
- State that this is generated analysis, not source text or a scientific finding. Connect each material claim to the evidence records that support it.
- Keep unsupported hypotheses explicitly identified as hypotheses or omit them. Do not present model confidence as experimental certainty.
- Keep generated synthesis visually separate from source excerpts and preserve a path back to the cited records.
- When no verified source supports an answer, say so clearly instead of inventing a citation or result.

## Landing page and dashboard composition

### Landing page sections

1. Header with the wordmark, minimal public links, and sign-in action.
2. Hero with the approved exact headline, concise science problem/platform copy, orange **Explore Research** CTA, outlined **Ask the Research Assistant** CTA, and dramatic microgravity flame image.
3. Science explanation that introduces the gravity/buoyancy context with carefully sourced copy and image-led Earth/microgravity comparison.
4. Transition into a research discovery preview showing search, research records, and a visible separation between published evidence and AI interpretation.
5. Closing research invitation and restrained footer.

No invented proof strip, testimonial, NASA endorsement, metric block, pricing, or unrelated marketing section.

### Research overview dashboard

1. Persistent sidebar with the 11-item navigation above and orange active state.
2. Main header titled **Research overview** with the primary search control and source/content scope.
3. Research filters aligned with search and responsive to available width.
4. **Continue your research** shortcuts in a compact purposeful row/list.
5. **Recent research** as a readable list or table with verified records and source metadata.
6. One meaningful **Flame morphology comparison** or equivalent selected visualization, with source-derived data or an explicit illustrative label.
7. Adjacent, unmistakable **Published evidence** and **AI interpretation** areas.

The dashboard should retain the approved asymmetric hierarchy, but table and record density follows the readability rules above. Avoid decorative orbit lines behind dense text, arbitrary counts, and repeated card containers.

## Loading, error, empty, and success states

- **Loading:** Keep layout stable; use restrained skeleton rows for lists and a labeled loading state for charts. Avoid flickering or simulated progress percentages.
- **Search loading:** Preserve the query and filters; announce “Searching research sources…” to assistive technology. Keep prior results distinguishable from refreshed results.
- **Empty search:** State that no records match the current query/filters; offer clear-filter and revise-query actions. Do not imply that absence of results is absence of evidence.
- **Empty collection/recent work:** Explain the next useful action without fake records or filler art.
- **Error:** Use a concise message with a recoverable next step; preserve user input. Distinguish source unavailable, parsing/metadata issue, and application error when known.
- **Partial source error:** Keep successful records visible and identify only the unavailable source(s); do not silently treat partial results as complete.
- **Success:** Confirm saves, exports, and collection actions with a text announcement and visible state update. Avoid success color alone.
- **Illustrative/demo state:** Mark the entire example region persistently, including charts, tables, and exported previews.

## Accessibility requirements

Target **WCAG 2.2 Level AA** for the implemented public and authenticated surfaces. At minimum:

- Text contrast: 4.5:1 for normal text and 3:1 for large text. Non-text controls, meaningful icons, chart marks, and focus indicators need sufficient contrast against adjacent colors.
- Keyboard access for every interactive element, logical focus order, visible focus, no focus obscured by sticky navigation/dialogs, and correct focus management for menus/drawers/dialogs.
- Prefer 44 × 44 CSS px touch targets; do not fall below the WCAG 2.2 minimum target-size criterion without meeting its spacing/exception conditions.
- Use semantic headings, landmarks, buttons, labeled inputs, and real table semantics. Communicate selected, expanded, invalid, loading, and disabled states programmatically.
- Never use color as the only distinction between published evidence, AI interpretation, chart series, active state, or form status.
- Provide text alternatives for research imagery, accessible chart descriptions and data alternatives, meaningful names for icon controls, and captions/attribution where applicable.
- Support zoom/reflow without two-dimensional page scrolling at ordinary text sizes, except for data structures where horizontal comparison is essential; offer a clear mobile alternative for those structures.
- Respect reduced-motion preferences. Avoid flashing, long animations, automatic camera-like movement, and high-intensity glow. Animation must not convey evidence absent from the static state.
- Validate real foreground/background pairs and control/focus contrast during implementation; token names alone do not establish conformance.

Reference: [W3C Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/), including contrast minimum, non-text contrast, focus visibility, and target-size criteria.

## Scientific integrity and content governance

- Research values, source titles, authors, citations, dates, NASA program references, and experimental descriptions must resolve to traceable records before they appear as fact.
- Store provenance with the content: provider/repository, source identifier, stable URL/DOI, retrieval time, source version where known, and page/section/table/figure location.
- Preserve the distinction between original source content, normalized metadata, computed values, and AI-generated interpretation in both data structures and UI.
- Label all mockups, fixtures, and seed data **Illustrative data**. Do not make illustrative values resemble verified measurements without a persistent label.
- Validate generated explanatory copy scientifically before release. Concept text is not an approved scientific statement.
- Do not imply endorsement or affiliation beyond documented source attribution. Do not use NASA marks without authorization.

## Handoff rules for implementation

- Treat the two approved Orbital Research reference images as the visual acceptance references for the landing page and authenticated overview. Use the Combustion Lab reference only for readable research tables and metadata hierarchy.
- Keep this file as the design source of truth; add tokens and reusable component variants before screen-specific styling.
- Reuse shared typography, color, spacing, search, table, evidence, and AI-interpretation patterns across screens. Screen differences should be explicit variants.
- Before replacing concept imagery, verify the new media source, rights/attribution, scientific context, crop, and color treatment.
- Current implementation covers live NASA NTRS research search and paper details, Supabase authentication and user-owned research persistence, and a Gemini assistant grounded in retrieved NASA metadata and abstracts. Vector retrieval and data-backed scientific analytics remain outside this milestone.
