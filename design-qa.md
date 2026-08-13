# Bilingual web-pilot design QA

## Current public evidence

- [Macedonian Home, Dark, 390 × 844](docs/screenshots/01-home-mobile-mk-dark.jpg)
- [Macedonian active session, Light, 390 × 844](docs/screenshots/02-session-active-mobile-mk-light.jpg)
- [Macedonian vehicle management, Light](docs/screenshots/03-vehicles-desktop-mk-light.jpg)
- [Macedonian History, Dark](docs/screenshots/04-history-desktop-mk-dark.jpg)

The comparison confirms that the meeting pilot preserves the selected Option 1
direction: quiet civic typography, warm neutral canvas, restrained blue accent,
semantic development treatment, rounded bordered surfaces, and a zone-first
mobile hierarchy. The always-visible Kalveri/demo warning makes the pilot
slightly taller than the original visual. That is an intentional safety
deviation: synthetic TEST data must not be mistaken for an official Parking
Bitola service.

## Bilingual and responsive checks

- Macedonian and English switch immediately from Appearance and persist in the
  normal app. The opt-in public demo labels the setting as temporary because it
  deliberately resets on reload.
- The Macedonian Home screen, Appearance screen, simulated start/stop lifecycle,
  completed receipt, and History flow were exercised in the browser.
- The public demo keeps `TEST-A1`, sample plate `BT7713AD`, sample location, and
  simulation/no-real-SMS wording explicit in both languages.
- At 320 and 390 CSS pixels, measured document width equalled viewport width;
  no horizontal overflow or clipped primary action was found.
- Light and Dark modes were checked. The selected System preference continues to
  follow the browser/device scheme.
- The final browser pass produced zero console errors and zero warnings.

## Interaction checks

- Home → Appearance → language/theme changes → Home passed.
- Home → simulated Start → manual confirmation → Active → simulated Stop →
  manual confirmation → completed receipt → History passed.
- Public demo refresh uses the fixed sample location and never asks for browser
  location, SMS, notification, or background-location permission.
- Normal web mode retains explicit foreground-location permission handling;
  native SMS, background departure detection, and native notifications remain
  device-build test items and are not represented as web capabilities.

## Result

No actionable P0, P1, or P2 visual, responsive, theme, localization, interaction,
or accessibility finding remains for the meeting-safe web pilot.

final result: passed

---

# PARK-006 Design QA

## Comparison target

- Current browser-rendered evidence: [Macedonian History, Dark](docs/screenshots/04-history-desktop-mk-dark.jpg)
- State: existing Option 1 Home visual language compared with the PARK-006 populated History state.
- Current committed History capture: 1280 × 720 CSS pixels in Dark mode.
- The original development matrix separately covered 320, 375, 390, and 430
  pixel mobile widths.

The source and implementation are different product states, so this is not a
pixel-for-pixel layout comparison. The source remains authoritative for the
quiet civic visual language: typography, warm canvas, blue accent, card
surfaces, borders, icon treatment, spacing rhythm, and restrained semantic
badges. PARK-006's supplied screen specification is authoritative for History
information architecture and content.

## Full-view comparison evidence

The current History evidence preserves the source's strong title hierarchy,
warm neutral canvas, blue functional accent, rounded bordered cards, compact
semantic badges, vehicle icon treatment, and generous vertical rhythm. The
new list is denser than Home by necessity, but it remains visibly part of the
same product rather than introducing a second visual system.

No actionable P0, P1, or P2 difference was found in the first comparison pass,
and no visual change was made in response to that pass.

## Focused comparison evidence

The History screenshot is readable at repository-preview size, so a separate
crop was not needed. It shows the
relevant typography, border/radius, icon, metadata, badge, spacing, and color
surfaces at useful scale.

## Required fidelity surfaces

- Fonts and typography: existing system typography tokens, optical weights,
  line heights, overlines, tabular-number treatment, and hierarchy are reused.
  Long zone and vehicle labels wrap without reducing font scaling.
- Spacing and layout rhythm: page margins, card padding, section gaps, radii,
  separators, and elevation match the PARK-005A system. At 320 pixels, long
  fields reflow vertically without horizontal overflow.
- Colors and visual tokens: both Light and Dark use existing semantic tokens;
  no screen-specific color was added. Simulation and completion states are
  conveyed by text and icons as well as color.
- Image quality and asset fidelity: these screens require no photographic or
  illustrative assets. All visible icons use the existing Expo Symbols-based
  semantic icon component; no emoji, placeholder art, inline SVG, or CSS-drawn
  asset was introduced.
- Copy and content: labels use human dates, times, and durations; no internal
  IDs, coordinates, guessed prices, or raw ISO timestamps appear. Local-only
  storage and simulation status are explicit.

## Responsive and theme evidence

The committed screenshot set covers mobile and desktop layouts, Light and Dark
themes, Macedonian Home, active-session, vehicle-management, and History states.
The fuller development matrix also covered 320, 375, 390, and 430 pixel widths.

Measured document widths equal their 320, 375, 390, and 430 pixel viewports.
No horizontal overflow, date/time clipping, plate overflow, or unusable action
was observed.

## Interaction and accessibility checks

- Home → Parking history → Home navigation passed.
- Completed receipt → View History preserved the receipt and created one
  duplicate-safe history entry.
- The current receipt disabled Clear history and exposed an explanatory label.
- History → receipt → Done returned Home only after the archive succeeded.
- Empty, populated, simulated, long-field, missing-optional, and detail states
  rendered through deterministic preview fixtures.
- Accessibility labels verbalize zone, vehicle, date, start, stop, duration,
  and simulation. Destructive actions are labelled and implemented behind
  native confirmation alerts. Touch targets remain at least 44 points.
- Browser console errors: 0. Existing development warnings are limited to the
  Expo Notifications web limitation and React Native Web shadow deprecation.

Native VoiceOver/TalkBack output, OS-level large text, and native Alert dialogs
remain physical-device QA items; the browser harness cannot prove those paths.

## Findings

No actionable P0, P1, or P2 visual, responsive, theme, interaction, or
accessibility finding remains within PARK-006 scope.

## Comparison history

1. First normalized full-view comparison: passed with no P0/P1/P2 finding.
2. Light/Dark and 320/375/390/430 responsive matrix: passed without a visual
   fix iteration.
3. Core History and completed-receipt interaction pass: passed with zero
   browser console errors.

## Implementation checklist

- [x] Match the established PARK-005A design language.
- [x] Provide empty, populated, simulated, and detail history states.
- [x] Preserve readable long and missing-optional data layouts.
- [x] Validate Light and Dark themes.
- [x] Validate 320, 375, 390, and 430 pixel widths.
- [x] Keep simulation, privacy, and trusted-cost safety visible.
- [x] Verify primary History navigation and completed-receipt interactions.

final result: passed
