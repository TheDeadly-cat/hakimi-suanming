# First local reading trial — design QA

Final result: passed for the reading-screen scope. Formal installer/build acceptance remains incomplete and is tracked separately.

Source visual truth: `docs/design/first-trial/selected-v2.png` (the user's second selected design).

Rendered target: the synthetic chart route at `http://127.0.0.1:5197/cases/<synthetic-case-id>/revisions/<synthetic-revision-id>`; local record identifiers are omitted.
Synthetic 1995-08-18 08:26, Asia/Shanghai, male; no real profiles copied. Source uses the same four pillars. Alias and functional additions differ intentionally.

Evidence directory: `validation/20261015-first-trial/visual/` within the external local validation archive; screenshots and browser data are not included in this repository.

## Comparison and iteration

- First combined input: `comparison-1.png`, rendered from `compare-1.html` with both the source and `implementation-1.png` together.
- P2: the full pattern phrase in the large headline wrapped awkwardly and pushed readable conclusions below the fold. Fixed with a short day-master/baseline headline; the full pattern stays in its dedicated expandable section.
- P2: long positional prose and technical section titles made the main reading harder to scan. Fixed with plain-language headings and a short first sentence; the original explanation remains available under the corresponding evidence disclosure and in saved snapshots.
- Post-fix combined input: `comparison-final.png`, rendered from `compare-final.html` using source and `implementation-final.png`. Both were opened together and visually inspected. No remaining P0/P1/P2 findings within this screen's approved scope.
- `implementation-2.png` is a rejected loading-state capture and is not acceptance evidence. `mobile-1.png` captured the wrong tab viewport and is also excluded.

Desktop capture CSS viewport: 1487 × 1058, DPR 1. Source raster: 1487 × 1058. Browser screenshot export: 1472 × 1047; the combined HTML scales both images equally by column width while preserving aspect ratio. This supports layout comparison, not a pixel-identical claim.

## Five surfaces checked

1. Typography: serif display headings and pillar characters, readable supporting copy, short main headline. System font rendering cannot exactly reproduce an ImageGen reference.
2. Layout: compact 196 px sidebar, reference/reading split, header actions, dividers, theme tabs, disclosure rhythm. Three explicit judgment axes and a true feedback form intentionally add content beyond the image mockup.
3. Color: warm ivory, dark ink, jade actions, cinnabar section accents and element colors; visible keyboard focus and selected tabs.
4. Assets: existing brand asset and lucide icons; generated pale ink mountains in `apps/web/src/assets/reading-mountains-v1.png`, not a CSS or hand-drawn replacement. Source output was copied into the project.
5. Copy: actual computed chart and rule outputs replace static mock copy; local automatic reading is identified truthfully. The large headline remains concise while the full judgment and conditions are inspectable.

## Interaction and responsive evidence

- `mobile-ready.png`: actual 390 × 844 CSS viewport; document scroll width 375, no horizontal overflow. Main reading precedes the chart column; primary actions remain usable.
- Default chart route opens the new reading screen.
- 2030 selection changes the visible ten-god/theme and clash explanation.
- Career tab displays the corresponding month-pillar interpretation.
- Saving creates a real local snapshot; feedback records the original conclusion and user text.
- Reloading preserves both records; `feedback-reopened.png` records the reopened feedback state.
- Fresh reload after HMR produced no new relevant console errors. One earlier development-only duplicate-createRoot message occurred during entry-module hot reload; it did not recur after a full reload.
- Test details are in `browser-checks.json` in the evidence directory's parent. No claim of full accessibility certification or all-route regression testing.

## Deliberate scope and remaining work

The three judgment axes, ten-year selector and feedback fields are user-requested functional additions. They increase page length relative to the static image, so the feedback form can require scrolling. The existing input workflow, professional views and older export UI are not redesigned by this pass.

The new reading runtime and 49 targeted checks pass. Normal aggregate build still reports the earlier F04 calendar subtitle file's historical registration mismatch; Vite's application build completed, but that is not a fully green formal build or a new installed package. See `build-remaining-blocker.json` beside the validation evidence. The previous candidate installation and its data were not replaced.

## Asset provenance

Built-in ImageGen produced the mountain asset from the selected reference's decorative direction. Prompt: "A wide, very pale grey-green ink-and-watercolor misty mountain panorama, low contrast, soft irregular edges fading to transparent, no text/UI/buildings; subtle decoration on warm ivory." The full generation request remains in this chat. No API key or external provider call was added to the product.

## First-trial closure update — 2026-10-15

The historical report-file mismatch above is resolved through a separately versioned calendar-frame presentation; the original report payload and its registered bytes remain unchanged. Report tests and identity checks passed. The subsequent normal build compiled the complete web application but its aggregate remains blocked by the existing EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE requirement. This local trial does not claim expert admission or public-release readiness.

The ordinary home, new-chart and case-library entry pages now share the selected sidebar. Home prioritizes reading and recent charts; detailed research tools are collapsed. Input validation explanations and calculation details are expandable, while required dates, DST choices, day-boundary choices and calculation/save actions remain accessible. Existing input/case tests and updated navigation expectations pass: 48/48. Original failed expectations are preserved outside the repository before correction.

Annual interpretation 0.2 separates current-year influence from decade background. A balanced baseline now displays theme interpretation instead of asserting peaceful years. The full year/decade explanations and evidence are included in newly saved snapshots; old saved text is not rewritten. The six-file integration check passes 52/52, and full TypeScript checking passes. Screenshots and checks for this closure are in validation/20261015-first-trial/closure. The final sealed artifact, packaged-origin browser checks and portable-package receipt are recorded separately in the external delivery directory; this document is frozen before that artifact capture.

The new entry pages are a usability simplification of the existing form, not an image-identical redesign of every professional screen. Scope beyond the first trial remains the laterScope recorded in benchmark-scope.json.
