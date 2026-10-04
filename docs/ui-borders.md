# Game UI border contract

- Panel, board/canvas shell, HUD, button and separator borders are at most **1 CSS px** in both themes and at every breakpoint. Explicit borderless controls stay borderless.
- Keep only the intentional **2px puzzle partitions** in Sudoku and Nonogram. Their major/minor color contrast also remains unchanged.
- Preserve keyboard-focus outlines, the Nonogram keyboard cursor, Canvas characters/obstacles and original fruit icon shading. A focus indicator is not a permanent panel border.
- Avoid offset hard shadows or broad drop shadows on game panels/buttons that visually form a second heavy frame. The existing shared utility-button treatment is independent.
- Update a modified route's CSS asset query key; do not change unchanged gameplay JS keys.

## Verification

`node --test tests/thin-ui-borders.test.js` checks all catalog CSS, including responsive declarations and pseudo-elements.

`npm run qa:borders -- <origin> <phase> [from-index] [until-index]` uses an isolated Chromium CDP context (`BORDER_CDP_URL`, default `http://127.0.0.1:9222`). It checks title and playable DOM borders, overflow, native Start clicks, Canvas painting, and light/dark themes at six portrait/landscape/tablet/desktop sizes. Desktop/mobile screenshots are retained alongside a JSON manifest under `$TMPDIR/thin-ui-borders/<phase>/`. Focus and viewport are emulated; this is not physical-phone testing. Browser-only Canvas observers count paint without intercepting game source or changing gameplay.

Run the complete repository tests and recreate Pages staging after them. Verify the deployment SHA and live HTML/CSS bytes, then repeat the border matrix against the public hostname.
