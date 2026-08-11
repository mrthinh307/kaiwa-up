---
version: "alpha"
name: KaiwaUp Neobrutalism
description: A bold, accessible interface for Japanese listening and speaking practice.
colors:
  primary: "oklch(67.47% 0.1726 259.49)"
  on-primary: "oklch(0% 0 0)"
  background: "oklch(93.46% 0.0305 255.11)"
  surface: "oklch(100% 0 0)"
  foreground: "oklch(0% 0 0)"
  border: "oklch(0% 0 0)"
  ring: "oklch(0% 0 0)"
  destructive: "oklch(59.2% 0.249 27.5)"
  destructive-foreground: "oklch(0% 0 0)"
  rank-gold: "#facc00"
  rank-silver: "#c7cdd4"
  rank-bronze: "#cd7f32"
  overlay: "oklch(0% 0 0 / 0.8)"
  dark-background: "oklch(29.23% 0.0626 270.49)"
  dark-surface: "oklch(23.93% 0 0)"
  dark-foreground: "oklch(92.49% 0 0)"
  dark-ring: "oklch(100% 0 0)"
  dark-destructive: "oklch(70.4% 0.191 22.216)"
  dark-rank-gold: "#e0b700"
  dark-rank-silver: "#aeb7c2"
  dark-rank-bronze: "#b96a32"
  chart-1: "#5294ff"
  chart-2: "#ff4d50"
  chart-3: "#facc00"
  chart-4: "#05e17a"
  chart-5: "#7a83ff"
typography:
  display-desktop:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 72px
    letterSpacing: 0px
  display-mobile:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: 0px
  section-title-desktop:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: 60px
    fontWeight: 700
    lineHeight: 75px
    letterSpacing: 0px
  section-title-mobile:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: 30px
    fontWeight: 700
    lineHeight: 37.5px
    letterSpacing: 0px
  heading-card:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 32px
    letterSpacing: 0px
  body-large:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: 20px
    fontWeight: 500
    lineHeight: 28px
    letterSpacing: 0px
  body:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
  body-small:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  label:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
rounded:
  none: 0px
  base: 5px
  full: 9999px
spacing:
  micro: 4px
  compact: 8px
  control: 12px
  base: 16px
  comfortable: 20px
  panel: 24px
  cluster: 32px
  large: 40px
  extra-large: 48px
  section-mobile: 64px
  section-desktop: 96px
  hero-mobile: 120px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: 8px 16px
    height: 40px
  button-neutral:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: 8px 16px
    height: 40px
  icon-control:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.base}"
    size: 40px
  input-standard:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-small}"
    rounded: "{rounded.base}"
    padding: 8px 12px
    height: 40px
  card-raised:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.base}"
    padding: 24px
  section-label:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: 4px 12px
  dark-shell:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-foreground}"
  dark-surface:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-foreground}"
  divider-strong:
    backgroundColor: "{colors.border}"
    height: 4px
  focus-indicator:
    backgroundColor: "{colors.ring}"
    height: 2px
  dark-focus-indicator:
    backgroundColor: "{colors.dark-ring}"
    height: 2px
  dialog-overlay:
    backgroundColor: "{colors.overlay}"
    width: 100%
    height: 100%
  chart-series-1:
    backgroundColor: "{colors.chart-1}"
    textColor: "{colors.foreground}"
  chart-series-2:
    backgroundColor: "{colors.chart-2}"
    textColor: "{colors.foreground}"
  chart-series-3:
    backgroundColor: "{colors.chart-3}"
    textColor: "{colors.foreground}"
  chart-series-4:
    backgroundColor: "{colors.chart-4}"
    textColor: "{colors.foreground}"
  chart-series-5:
    backgroundColor: "{colors.chart-5}"
    textColor: "{colors.foreground}"
---

## Overview

KaiwaUp uses a blue-led Neobrutalist visual language to make Japanese practice feel energetic,
direct, and tactile. Thick black rules, compact corner rounding, saturated blue fields, hard offset
shadows, and editorial-scale typography establish the character. White and pale-blue surfaces keep
Japanese learning content readable while the strong geometry makes exercises and progress states
easy to scan.

This file follows Google's alpha
[DESIGN.md specification](https://github.com/google-labs-code/design.md): the YAML front matter is
the normative token layer, while the prose explains how to apply those tokens. Accessibility,
component reuse, and documented extension rules follow the same principles used by mature design
systems such as [USWDS](https://designsystem.digital.gov/documentation/accessibility/) and the
[CMS Design System](https://design.cms.gov/getting-started/for-designers/).

### Implementation authority

When sources disagree, use this order:

1. [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css) is authoritative for theme values,
   font utilities, shadows, custom cursors, scrollbars, and shared motion utilities.
2. [`apps/web/src/components/ui`](apps/web/src/components/ui) is authoritative for component APIs,
   variants, states, geometry, and interaction behavior.
3. The completed Landing Page at `http://localhost:3000/` is authoritative for KaiwaUp composition,
   responsive hierarchy, content density, and brand expression.
4. This file is the usage contract for future UI. If implementation intentionally changes, update
   this file in the same change.
5. [neobrutalism.dev](https://www.neobrutalism.dev/styling) is the upstream component reference.
   Local installed components take precedence when an upstream release differs.

### Required workflow for AI agents

Before implementing or modifying frontend UI:

1. Read this file and the nearest `AGENTS.md`.
2. Inspect `globals.css` instead of inventing theme variables.
3. Search `apps/web/src/components/ui` and existing feature components before creating a component.
4. Reuse an installed Neobrutalism primitive and its documented variants whenever it satisfies the
   behavior.
5. If the primitive is not installed, search the official
   [Neobrutalism component documentation](https://www.neobrutalism.dev/docs) and install its
   upstream registry component when available.
6. Create a custom primitive only when neither `apps/web/src/components/ui` nor the official
   Neobrutalism library provides an appropriate component. Compose product-specific behavior around
   primitives instead of duplicating their implementation.
7. Compose layout with Tailwind utilities and semantic color classes; do not copy raw hex or OKLCH
   values into JSX.
8. Keep Server Components by default. Add `"use client"` only for interaction, hooks, or browser
   APIs.
9. Verify at a compact mobile viewport and a desktop viewport, then run lint, typecheck, and a
   production build for rendering-impacting changes.

### Product character

- Bold, playful, and optimistic rather than childish.
- Direct and instructional rather than decorative or vague.
- High contrast, flat color, visible structure, and physical interaction feedback.
- Generous marketing composition paired with focused, calmer learning surfaces.
- English UI uses concise active language. Japanese content remains visually primary during
  practice and always receives appropriate language metadata.

## Colors

Use semantic utilities such as `bg-main`, `bg-background`, `bg-secondary-background`,
`text-foreground`, `text-main-foreground`, `border-border`, and `ring-ring`. Raw color values belong
only in `globals.css`.

### Light theme

| Role            | CSS token                  | Tailwind utility              | Value                                                              | Usage                                                        |
| --------------- | -------------------------- | ----------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| Primary         | `--main`                   | `bg-main`                     | `oklch(67.47% 0.1726 259.49)`                                      | Primary actions, selected states, branded sections, progress |
| On primary      | `--main-foreground`        | `text-main-foreground`        | `oklch(0% 0 0)`                                                    | Text and icons on primary blue                               |
| Page background | `--background`             | `bg-background`               | `oklch(93.46% 0.0305 255.11)`                                      | Default page and pale-blue content surfaces                  |
| Raised surface  | `--secondary-background`   | `bg-secondary-background`     | `oklch(100% 0 0)`                                                  | Inputs, neutral controls, cards, navbar                      |
| Foreground      | `--foreground`             | `text-foreground`             | `oklch(0% 0 0)`                                                    | Primary text, inverse sections, icons                        |
| Border          | `--border`                 | `border-border`               | `oklch(0% 0 0)`                                                    | Component outlines, dividers, hard shadows                   |
| Focus ring      | `--ring`                   | `ring-ring`                   | `oklch(0% 0 0)`                                                    | Keyboard focus                                               |
| Overlay         | `--overlay`                | `bg-overlay`                  | `oklch(0% 0 0 / 0.8)`                                              | Modal and drawer backdrops                                   |
| Destructive     | `--destructive`            | `text-destructive`            | light `oklch(59.2% 0.249 27.5)` / dark `oklch(70.4% 0.191 22.216)` | Validation and destructive error text                        |
| Destructive fg  | `--destructive-foreground` | `text-destructive-foreground` | `oklch(0% 0 0)`                                                    | Text and icons placed on destructive surfaces                |

The primary color is intentionally reused across actions, large section fills, selected tabs,
progress bars, score badges, and small decorative accents. Do not introduce a second CTA color to
create hierarchy; use surface, border, scale, placement, or an existing component variant instead.

### Dark theme

Dark mode is supported through the `.dark` class and `next-themes`. Continue using the same semantic
utilities; never write page-specific `dark:` replacements for values already handled by tokens.

| Role           | Value                         |
| -------------- | ----------------------------- |
| Background     | `oklch(29.23% 0.0626 270.49)` |
| Raised surface | `oklch(23.93% 0 0)`           |
| Foreground     | `oklch(92.49% 0 0)`           |
| Primary        | `oklch(67.47% 0.1726 259.49)` |
| Border         | `oklch(0% 0 0)`               |
| Focus ring     | `oklch(100% 0 0)`             |

The black border and shadow remain intentionally black in both themes. Test dark mode visually;
semantic token use does not guarantee that every custom composition has sufficient contrast.

### Data colors

`chart-1` through `chart-5` are reserved for charts, progress comparisons, and categorical data.
They are not an alternate UI accent palette. Pair color with text, icons, labels, or patterns so
meaning never depends on color alone.

Leaderboard podium surfaces use the dedicated `rank-gold`, `rank-silver`, and `rank-bronze` tokens.
These colors communicate first, second, and third place only; do not reuse them as general accents or
button colors. Pair every podium color with its numeric rank and medal icon, and use
`text-main-foreground` for content placed on these surfaces in both themes.

## Typography

The global sans stack is DM Sans followed by Noto Sans JP. DM Sans gives the Latin interface its
compact, geometric voice; Noto Sans JP supplies Japanese glyphs without requiring per-element font
classes. Code and technical identifiers use the system monospace stack.

| Role               | Compact         | Desktop                             | Weight | Typical use                       |
| ------------------ | --------------- | ----------------------------------- | ------ | --------------------------------- |
| Hero display       | `24px / 36px`   | `48px / 72px`                       | 700    | Landing hero only                 |
| Section display    | `30px / 37.5px` | up to `60px / 75px`                 | 700    | Major marketing sections          |
| Card heading       | `24px / 32px`   | `24–36px`, proportional line height | 700    | Cards and exercise groups         |
| Large body         | `20px / 28px`   | `20–24px`, relaxed                  | 500    | Marketing introductions           |
| Body               | `16px / 24px`   | same                                | 500    | Application copy and instructions |
| Small body / label | `14px / 20px`   | same                                | 500    | Metadata, controls, helper text   |

Use semantic heading elements in document order; do not choose an `h` level for its appearance.
Marketing pages may scale headings responsively with Tailwind utilities. Product screens should use
the smaller end of the scale to preserve task focus and information density.

Japanese guidance:

- Wrap Japanese passages in `lang="ja"` when the surrounding page language is not Japanese.
- Use relaxed line height for multi-line Japanese reading content; never force Latin line-height
  onto dense kana/kanji paragraphs.
- Use HTML `ruby` and `rt` for furigana instead of manual parentheses or absolutely positioned text.
- Do not use monospace merely to align Japanese characters.
- Keep the original Japanese visually above or stronger than its translation in practice content.

## Layout

The spacing system is based on 4px. Prefer the documented scale and Tailwind's matching utilities.
Arbitrary values are acceptable only when reproducing an established Landing Page composition or a
measured media/timeline requirement.

### Containers and sections

- Navbar, footer, hero copy, and most editorial sections use a `1300px` maximum content width.
- Wide feature grids may use up to `1400px`.
- Compact viewport padding is `20px` (`px-5`); use `32px` (`sm:px-8`) when space allows.
- Standard section padding is `64px` vertically and grows to `96px` on large screens.
- The fixed public navbar is `70px` high with a `4px` bottom border.
- Use `4px` borders to separate major page regions and `2px` borders inside components.
- Full-width section backgrounds alternate between `background`, `secondary-background`, `main`,
  and deliberate inverse `foreground` regions.

### Responsive composition

Build mobile-first with existing Tailwind breakpoints. Prefer reflow over proportional shrinking:

- One-column layouts become two columns at medium widths and three columns only when content fits.
- CTA groups stack on compact screens and become inline from `sm` when labels remain comfortable.
- Dense grids preserve border continuity; avoid doubled borders at breakpoint transitions.
- Decorative hero component walls and large stars may hide or move off-canvas on compact screens.
- Navigation progressively hides secondary links while preserving brand, primary CTA, repository
  link, and theme control.
- Never create horizontal page overflow. Deliberate overflow inside scroll areas and marquees must
  be contained and labelled appropriately.

### Established Landing Page patterns

- `landing-grid` uses a subtle `70px × 70px` grid behind high-impact marketing sections.
- Hero sections use `100dvh` minimum height and substantial vertical padding to account for the
  fixed navbar.
- Section eyebrows use a primary fill, 2px border, bold small label, and hard shadow.
- Feature collections often share borders as one continuous grid instead of rendering isolated
  floating cards.
- Marquees reinforce methods and outcomes; they are marketing devices, not default application
  navigation.
- Decorative stars are sparse brand punctuation. Do not add them to task-dense learning controls,
  forms, tables, or dialogs.

Application screens should inherit the same colors, borders, typography, and component behavior but
use calmer backgrounds, shorter vertical gaps, and clearer task grouping than the Landing Page.

## Elevation & Depth

Depth is flat and mechanical, not atmospheric:

- Standard raised elements use `shadow-shadow`: `4px 4px 0 0 var(--border)`.
- Shadows have no blur, transparency, gradient, or glow.
- A normal component border is 2px; major section frames may be 4px.
- The upstream default Button translates by the shadow offset and removes its shadow on hover.
- `reverse` begins flat and moves up-left while gaining the hard shadow on hover.
- `noShadow` remains flat and is appropriate for controls embedded inside already framed surfaces.
- Focus indication uses a ring in addition to the border or shadow; do not rely on color or shadow
  alone.
- Disabled controls retain recognizable geometry, lower opacity, and do not respond to pointer
  interaction.

Use the upstream interaction as installed. Do not move the pressed effect from `hover` to `active`,
change its direction, or add easing unless the design system is intentionally revised.

## Shapes

The standard component recipe is a 2px black border, `rounded-base` (`5px`), and optional hard
shadow.

- Use `rounded-base` for buttons, fields, cards, alerts, accordions, tabs, and compact panels.
- Use square corners for full-width section frames and continuous bordered grids.
- Use `rounded-full` only when the geometry is inherently circular or pill-like: avatars, status
  dots, progress tracks, and circular score indicators.
- Do not introduce large soft card radii, organic blobs, clipped glass panels, or mixed corner
  systems.
- Decorative SVG stars may use their own geometry but must retain the palette and stroke language.

## Components

The installed components in `apps/web/src/components/ui` are the default building blocks. Reuse
their props, states, data attributes, accessibility behavior, and variants. Feature components may
compose these primitives but should not duplicate their implementation. When a required primitive
is missing locally, use the official [Neobrutalism component catalog](https://www.neobrutalism.dev/docs)
as the second source of truth and install the upstream component. Custom primitives are permitted
only when both sources lack a suitable component.

### Buttons and actions

| Variant    | Use                                                          |
| ---------- | ------------------------------------------------------------ |
| `default`  | Principal action in a local decision area                    |
| `neutral`  | Secondary action on either background color                  |
| `noShadow` | Flat action inside an already bordered or elevated container |
| `reverse`  | Action that should gain emphasis on hover                    |

Use `asChild` for Next.js links styled as buttons. Use `size="icon"` only with an accessible name.
Do not create semantic color variants such as success or warning by editing Button; use an Alert,
Badge, surrounding status treatment, or a documented product-specific component.

### Cards and bordered groups

- Start with `Card` when content needs a standalone framed surface.
- Override a Card background with semantic classes only when the surrounding section requires clear
  contrast.
- Use a shared-border CSS grid for equal sibling features, comparison cells, or method collections.
- Avoid stacking several shadowed cards inside another shadowed card.
- Keep default card padding near 24px; compact application panels may use 16–20px.

### Forms and selection controls

- Use installed `Input`, `Label`, `Select`, `Checkbox`, `RadioGroup`, `Slider`, and `InputOTP`
  components before creating replacements.
- Fields use the raised white surface, 2px border, 5px radius, 14px text, and visible focus ring.
- Labels precede their controls. Helper text and validation messages follow the relevant field.
- Validation must include text; do not communicate error state through color alone.
- Use `text-destructive` for field-level validation errors and other clearly destructive error copy;
  keep the message adjacent to the affected control.
- Keep native semantics, names, autocomplete behavior, and keyboard operation.

### Feedback and disclosure

- Use `Alert` for persistent status, `Dialog` for blocking decisions, and `Accordion` or
  `Collapsible` for progressive disclosure.
- Use `Sonner` toasts for transient mutation outcomes and temporarily unavailable integrations.
  Keep field-level validation next to its control; do not move actionable form errors into a toast.
- Titles explain the outcome; descriptions explain what the learner should do next.
- Default feedback uses primary blue. Destructive treatment is reserved for actual errors or
  irreversible actions.
- Loading states preserve layout dimensions and announce busy state when necessary.

### Navigation and product patterns

- Public navigation follows the established fixed 70px navbar and responsive visibility pattern.
- Product navigation may be denser but retains clear borders, current-page semantics, and keyboard
  access.
- Use `aria-current="page"` or the appropriate selected state for active navigation.
- Progress, streaks, scores, transcripts, audio timelines, and Japanese prompts pair numeric or
  visual indicators with a readable text label.

### Icons, motion, and accessibility

- Reuse the icon library already used in the target subtree; do not mix icon styles within one
  component.
- Decorative icons use `aria-hidden="true"`. Icon-only actions require `aria-label` or visible
  accessible text.
- Preserve visible focus states and complete keyboard operation.
- Default controls are at least the installed component size. Prefer 44px or larger for primary
  touch actions; compact 36–40px header controls require adequate separation and an accessible name.
- Marquee animation pauses under `prefers-reduced-motion`. New looping or decorative motion must do
  the same.
- Test light and dark themes, keyboard-only navigation, 200% zoom, mobile reflow, and Japanese text
  wrapping for any new page-level UI.

## Do's and Don'ts

### Do

- Use semantic theme utilities and let `.dark` tokens adapt the interface.
- Reuse installed Neobrutalism components before writing custom primitives.
- Use 2px component borders, 4px section borders, 5px component radius, and the shared hard shadow.
- Alternate full-width surfaces to create hierarchy without adding new colors.
- Keep one obvious primary action per local decision area.
- Use DM Sans for interface text and Noto Sans JP as the automatic Japanese fallback.
- Give Japanese examples, translations, audio controls, feedback, and progress a clear visual order.
- Preserve semantic HTML, focus visibility, reduced-motion behavior, and meaningful accessible names.
- Check the existing Landing Page for composition precedent before inventing a new marketing pattern.
- Update this file whenever global tokens or shared component behavior intentionally changes.

### Don't

- Do not hardcode palette values in JSX or create parallel variables outside `globals.css`.
- Do not add gradients, glassmorphism, blurred shadows, soft elevation, or large rounded cards.
- Do not turn chart colors into arbitrary button or section colors.
- Do not fork an upstream component only to change its radius, border, shadow, or hover behavior.
- Do not copy the Landing Page's decorative density into forms, lesson workflows, or dashboards.
- Do not use decorative stars, marquees, and grid backgrounds without a clear brand or narrative role.
- Do not hide required information behind hover or use color as the only state indicator.
- Do not shrink Japanese content, touch targets, or borders to make a layout fit; reflow the layout.
- Do not add `"use client"` to a component solely for styling.
- Do not introduce a new runtime dependency when an installed component or CSS utility is sufficient.
