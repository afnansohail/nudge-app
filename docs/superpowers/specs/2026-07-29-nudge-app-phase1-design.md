# Nudge — Phase 1 (Local-First MVP) Design

## Status
Approved by user on 2026-07-29. Ready for implementation planning.

## Context
Nudge is a reminder/to-do Android app built with Expo + React Native. The user
supplied a feature mindmap, a preferred stack, and Claude Design mockups
(`Nudge.dc.html`, `android-frame.jsx`) plus a companion spec
(`nudge_app_design_spec.md`) describing a 12-screen app with auth, cloud sync,
notifications, recurrence, and import/export.

That full scope is too much for one implementation plan. This document covers
**Phase 1 only**: a fully working, offline, no-login reminder app. Later
phases (not designed here) will add:
- **Phase 2**: Supabase auth + cloud backup/sync.
- **Phase 3**: extras — notification-panel quick-add, custom user-defined
  themes (beyond light/dark), home-screen widgets.

## Screens (Phase 1)
Trimmed from the design spec's 12 down to what needs no backend:

- **Home** — greeting, stat chips (Today/Scheduled/Starred/All), list grid,
  FAB to create a nudge.
- **Create/Edit Nudge** — unified create + edit (a tap on a reminder opens
  this in edit mode; no separate "Reminder Details" screen).
- **Lists** — view/manage lists.
- **Create/Edit List** — name, color, icon.
- **Search** — opened from a header icon on Home, not a bottom tab.
- **Archive** — completed + deleted reminders, each toggleable, reachable
  from a Home header action (or Settings entry).
- **Settings** — theme (light/dark), default reminder time, hide-completed
  toggle, local JSON export/import, notifications, about.
- **Onboarding** — minimal: welcome + notification-permission request, shown
  once on first launch.

Deferred to Phase 2/3: Authentication, Theme Picker (custom themes beyond
light/dark), cloud Import/Export.

## Navigation
Expo Router `(tabs)` group with three bottom tabs: **Home**, **Lists**,
**Settings**. Search is a header icon action, not a tab. Archive is a header
action on Home / an entry in Settings, not a tab. Create/Edit Nudge,
Create/Edit List, and all pickers (date, time, repeat, list, tag, priority)
are modal routes or bottom sheets — matching the design spec's
dialog-heavy pattern rather than adding full screens.

## Data model

### Reminder
| Field | Type | Notes |
|---|---|---|
| id | integer PK (autoincrement) | |
| title | text | required |
| notes | text | optional, plain text |
| link | text | optional URL, rendered as a tappable link |
| imageUri | text | optional, one image per reminder |
| dueAt | datetime, nullable | if null, uses Settings' default reminder time when the reminder needs to fire |
| priority | enum: `low` \| `medium` \| `high` | matches the `!` / `!!` / `!!!` mockup |
| starred | boolean | |
| completed | boolean | |
| completedAt | datetime, nullable | |
| deleted | boolean | soft delete — powers the toggleable Archive/trash view |
| deletedAt | datetime, nullable | |
| listId | FK → List, required | one list per reminder |
| recurrenceRule | JSON, nullable | see Recurrence below |
| createdAt / updatedAt | datetime | |

### List
| Field | Type | Notes |
|---|---|---|
| id | integer PK (autoincrement) | |
| name | text | |
| color | text (hex) | |
| icon | text | key into the curated icon set (Lucide) |
| createdAt | datetime | |

**Default state**: on first launch, seed exactly one list named **"Nudges"**
(default color = the app's primary token, default icon = a bell/nudge-style
icon). The user can create additional lists at any time, each with a
freeform name, a color picked from a swatch palette, and an icon picked from
a curated subset of **Lucide icons** (a fixed, relevant set — e.g. briefcase,
shopping-cart, home, heart, book, dumbbell, plane, wallet, graduation-cap —
not the entire Lucide catalog) rather than a full icon-search UI.

### Tag
| Field | Type | Notes |
|---|---|---|
| id | integer PK (autoincrement) | |
| name | text, unique | freeform, e.g. `#exercise` |

### ReminderTag (join table)
Many-to-many between Reminder and Tag. A reminder can have any number of
tags, independent of its single list.

## Recurrence engine
`recurrenceRule` is stored as JSON directly on the reminder (no separate
table — a reminder never needs more than one active rule):

```json
{
  "type": "interval" | "weekdays" | "monthlyDate",
  "intervalUnit": "day" | "week" | "month",
  "intervalValue": 1,
  "weekdays": [1, 3, 5],
  "dayOfMonth": 15
}
```

Supports: every N days/weeks/months, specific weekdays (e.g. Mon+Wed+Fri),
and monthly-by-date (e.g. the 15th of every month). Explicitly **out of
scope**: Nth-weekday-of-month (e.g. "last Friday") and yearly rules.

## Notifications
Single mechanism for every recurrence type: schedule only the **next**
occurrence as an `expo-notifications` date-trigger local notification. When
it fires — or when the app is opened and finds a past-due reminder — compute
the next date matching the rule and reschedule. This avoids maintaining two
code paths (native repeating triggers vs. custom logic), since native
repeating triggers can't express weekday-sets or "every N days" anyway.

Notification actions: **Done**, **Snooze** (5 min / 15 min / 30 min /
tomorrow / custom time), per the design spec's snooze picker and the
mindmap's "option to snooze or mark as done."

## Theming & design tokens
Fixed light and dark themes (not wallpaper-derived Material You dynamic
color) built as NativeWind tokens in `tailwind.config.js`:
- Primary: `#f73a2e` (reddish-orange, replacing the mockup's purple).
- List-accent colors (coral/blue/green/amber-style swatches) remain
  available as the palette for per-list colors, since those are user-chosen
  per list, not the brand color.
- All colors, spacing, and radii are named tokens so a future re-theme is a
  config edit, not a find-and-replace across components.

Material 3-style visual language (rounded corners, pill buttons/tags,
elevation) is kept from the mockups; true wallpaper-based dynamic color is
explicitly deferred (not planned for any phase unless requested later).

## Data & state architecture
- **SQLite + Drizzle ORM is the single source of truth.** Screens read
  reminders/lists/tags reactively via Drizzle's live-query hook and
  re-render automatically on writes — no manually-synced in-memory copy of
  reminder data.
- **Zustand holds only ephemeral UI state**: active filter/tab, search
  query, multi-select mode, sheet/modal visibility, theme mode. It never
  mirrors reminder/list data, avoiding store/DB drift bugs.
- Business logic (recurrence math, notification scheduling, import/export
  serialization) lives in plain TypeScript modules (e.g. under `lib/`), not
  inside components or the Zustand store.

## Import/Export (Phase 1 scope)
Local JSON export/import only (no cloud storage yet) — matches the
mindmap's "export/import data (json)" item. Export serializes reminders,
lists, and tags to a JSON file the user can share/save. Import validates the
file, then **merges by default** (adds records not already present by id,
skips exact duplicates) with an explicit "Replace all local data instead"
option surfaced before the import is applied, so a bad import can't silently
wipe existing reminders.

## Non-goals for Phase 1
- Login / accounts / cloud sync (Phase 2).
- Custom user-created themes beyond light/dark (Phase 3).
- Home-screen widgets (Phase 3).
- Add-reminder button in the notification panel / quick settings (Phase 3).
- True Material You wallpaper-based dynamic color.
- Nth-weekday-of-month and yearly recurrence rules.
- iOS-specific handling (Android is the only target platform).
