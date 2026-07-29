# Nudge — Phase 1 Design

Local-first Android reminders app. No auth, no backend, no sync. Single user, single device.

## Scope

In: lists (icon + color), one-time/recurring nudges, priority as a display-only tag, Android
local notifications with snooze actions, light/dark theming, curated icon/color pickers.

Out (deliberately, to avoid repeating the last spec's complexity): location-based/"nearby"
nudges, list sharing/multi-user, functional repeat-until-dismissed notifications, an ORM,
ORM/migration tooling, a pre-materialized occurrence history.

Terminology: reminders are called "nudges" throughout the UI and copy.

## Data model

SQLite (`expo-sqlite`), raw queries, one versioned migration function run at boot. No ORM.

- **lists**: `id, name, icon, color, sort_order, is_default, created_at`
  Exactly one list has `is_default = true` (seeded on first launch); it can be renamed/re-themed
  but never deleted.
- **nudges**: `id, list_id, title, note, due_at, recurrence_type (none|daily|weekly|monthly|every_n_days),
  recurrence_params (JSON: weekdays[] | day_of_month | interval_n), next_occurrence_at,
  priority (gentle|firm|relentless), completed_at, snoozed_until, created_at, updated_at`
  `due_at = null` means no due date ("Whenever, honestly" bucket).
- **settings** (single row): `theme_preference (system|light|dark), completed_count`
  `completed_count` feeds the home screen's "Nailed it" stat tile. No per-occurrence history
  table — completing a recurring nudge bumps this counter and advances `next_occurrence_at`.

## Navigation (expo-router)

Root stack: `index` (Home), `list/[id]` (List detail), `list/new`, `list/[id]/edit` (modal:
name/icon/color), `nudge/new`, `nudge/[id]/edit` (modal: the New Nudge form, reused for edit),
`settings`. Icon/color pickers are bottom sheets within the list create/edit modal.

## State (zustand)

`useListsStore`, `useNudgesStore`, `useSettingsStore`. Each loads from SQLite on boot; every
mutation writes to SQLite then updates the store (SQLite is the source of truth, zustand is a
reactive mirror). Home/List-detail bucketing ("Nudging soon" / "Whenever, honestly" / completed)
is a derived selector, not stored state.

## Notifications & recurrence

One scheduled `expo-notifications` trigger per nudge at a time, with Android action buttons:
Snooze 1hr / Snooze to tomorrow / Mark done. The response handler updates SQLite and reschedules:
recurring nudges compute their next matching occurrence from the rule; one-time nudges mark
complete and cancel. On app foreground, any nudge whose `next_occurrence_at` has silently
lapsed is caught up and rescheduled — no missed-notification backlog. Recurrence math is a
small hand-written date util (daily / weekly-by-weekday / monthly / every-N-days), not an
RRULE library.

## Theming

Tokens derived from the imported mockup (`Nudge Screens.dc.html`).

- Light: bg `#FCFAF7`, card `#FFFFFF`, text `#1A1815`, muted `#A69E92`, accent `#F4674A`/`#C24A2C`.
- Dark: warm near-black bg, warm off-white text, same accent brightened slightly for contrast.
- Fonts: `Outfit` (body/headings), `DM Mono` (small-caps labels/timestamps).
- Each of the ~8 curated list colors gets a matched light/dark swatch pair.
- Preference: follows system by default; override in Settings (system/light/dark).

## UI kit & motion

Button, Card, Pill, EmptyState, StatTile, NudgeRow, ListRow, IconPicker, ColorPicker — styled
with nativewind. Curated icon set (~20 lucide icons) and curated color palette (~8 swatches)
are fixed constants, no custom upload. Reanimated for: FAB press scale, checkbox fill/checkmark
on complete, swipe-to-complete/delete on nudge rows, stat-tile count-up, modal-sheet transitions.

## Edge cases

- Deleting a list cascades to its nudges and cancels their scheduled notifications; confirm
  dialog first. Default list can't be deleted.
- Notification permission denial doesn't block core usage — nudges without due dates need no
  permission; a banner prompts enabling it for timed ones.

## Testing

Given the lean-scope decision, only the recurrence date-math util needs unit tests. No jest
setup for the rest of the app in Phase 1.
