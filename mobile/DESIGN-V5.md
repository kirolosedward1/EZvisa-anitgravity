# EZvisa v5 visual system

References studied (Oct 2026):
- **Apple iOS 26 (Liquid Glass):** the tab bar floats as a glass capsule above content. A separated circular action sits beside it (the News/Health "search role" pattern).
- **App Store Today and Wallet:** a small uppercase date caption above a heavy large title, full-bleed photo cards with 24pt+ radii, and solid "pass" cards.
- **Revolut onboarding:** the logo on white, one bold line and two actions. KYC is split into micro-steps, one task per screen, with a visible progress bar.
- **Airbnb 2025:** white canvas, photo-first cards with the text below the image (not overlaid), big tappable choices, and a calm hierarchy.

## System

| Area | Rule |
|---|---|
| Canvas | Light #FFFFFF, dark #000000. Cards are flat fills (#F5F5F7 light, #1C1C1E dark) with no borders and no card shadows. |
| Depth | Shadows only on floating chrome (tab capsule, action button, sticky CTA). |
| Accent | Brand #0436DC (dark mode #8CA2FF for text/icons, #3D5AFE for fills). Used for the primary action, selection, progress and the active-application pass card. |
| Type | System SF. On the web build the stack is -apple-system, then Inter. Display 40/800 (-1.2), large title 34/800 (-0.9), title 28/700 (-0.6), headline 17/600. |
| Radii | Cards 24, tiles 20, inputs 16, buttons are 56pt pills, flags are circles. |
| Spacing | 8pt grid (4 and 12 for fine detail). Screen margin 16, section gap 32. Current tokens: `docs/design-system.md`. |
| Motion | Spring press (scale 0.97), slide-in steps, animated progress width, haptic on choices and primary actions. Reduce Motion is respected. |
| Copy | One line per screen at most; questions as titles; no sales copy. |
