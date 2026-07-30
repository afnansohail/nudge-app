# Nudge UI Polish — Design

## 1. Data model & bucketing foundation
- Remove `priority` entirely: DB migration v2 rebuilds `nudges` table without the column; strip `Priority` type, `PRIORITY_LABELS`, and all references in `NudgeForm.tsx`, `NudgeRow.tsx`, `nudge/new.tsx`, `nudge/[id]/edit.tsx`, `db/nudges.ts`; update `buckets.test.ts` fixture.
- New shared `src/lib/status.ts` replacing `buckets.ts` and the home screen's separate stat computation:
  - `completed`: `completedAt !== null`
  - `snoozed`: not completed, `snoozedUntil !== null && snoozedUntil > now`
  - `missed`: not completed, not snoozed, has an effective date (`nextOccurrenceAt ?? dueAt`) in the past
  - `upcoming`: everything else (future-dated or no date — "whenever" folds into upcoming; no more later-vs-soon distinction)
  - All existing bucketing call sites (home stats, list-detail sections, new category screen) use this one function.

## 2. Home screen & category views
- Empty-state copy: "Then the day is yours" only shown when there are zero upcoming nudges too, not just zero urgent ones.
- Home stat tiles become 4 boxes: Upcoming, Completed, Snoozed, Missed, driven by `status.ts` counts across all lists.
- New shared screen `src/app/nudges/[status].tsx`: fetches all nudges matching the route's status, grouped into sections by list, reusing `NudgeRow`. Screen title reflects the status.
- New `AppSettings.hideCompletedSection: boolean` (default false) + settings toggle "Show completed nudges in lists"; only affects the per-list "Nailed it · N" section in `list/[id]/index.tsx`. Home's Completed box is unaffected.

## 3. Nudge row polish
- New `src/lib/date.ts` formatter that includes the year whenever it differs from the current year; used by list-detail row labels (extended to show date, not just time), `NudgeForm.tsx`, and the home screen's "today" header.
- Overdue (status `missed`) rows: date/time label switches to a new warning color token (`overdue`/`overdue-dark` in `tokens.ts`) plus a small "Overdue" tag in `NudgeRow.tsx`.
- Delete/complete gets a fade+collapse Reanimated `exiting`/`layout` transition (new usage of these APIs in the codebase) on both checkbox-tap and swipe paths.

## 4. Nudge form — date/time picker rebuild
- New dependency: `react-native-ui-datepicker` (JS-rendered, NativeWind-aware, no reanimated/gesture-handler conflicts). Smoke-test install before full integration.
- Replace the single date+time toggle with independent **Date** and **Time** pills — either, both, or neither can be set, no forced chaining.
- Picker skinned via its className/style props to match `tokens.ts` colors and current light/dark theme preference.
- On submit: missing date defaults to today, missing time defaults to the configurable default-time setting. Submit disabled until `title` is non-empty; everything else stays optional.
- New `AppSettings.defaultNudgeTime: string` ("HH:mm", default "09:00") + settings row using the same themed picker in time-only mode.
- `hideCompletedSection` and `defaultNudgeTime` ship in the same migration as the priority-column drop (one version bump, v2).

## 5. List icon/color expansion
- `ListColorKey`: 8 → ~16 hues (indigo, emerald, orange, cyan, fuchsia, olive, plum, sky), each with light/dark `{tile, dot, text}` following the existing structure. `ColorPicker.tsx` unchanged (maps over `LIST_COLOR_KEYS`).
- `ListIconKey`: 20 → ~40, more `lucide-react-native` icons (already a dependency) across fitness/food/finance/travel/tech/nature/home categories. `IconPicker.tsx` unchanged.
