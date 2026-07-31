# Android Quick Settings Tile — Create Nudge Shortcut

## Purpose
Let the user add a Quick Settings tile that jumps straight to the create-nudge screen without opening the app first.

## Scope
Android only. Quick Settings Tile (`TileService`), not a home-screen widget or long-press app shortcut.

## Flow
User taps the tile → standard Android unlock prompt if locked → `TileService.onClick()` fires `Intent(ACTION_VIEW, "nudgeapp://nudge/new")` with `FLAG_ACTIVITY_NEW_TASK` → `startActivityAndCollapse()` closes the panel and brings the app to `nudge/new` via expo-router's existing deep-link handling.

Tile is added manually by the user via Android's "Edit tiles" panel — no auto-add prompt (Android 13+ only, out of scope).

## Native pieces
- `plugins/tile-service/NewNudgeTileService.kt` — `TileService` subclass; `onClick()` builds and fires the deep-link intent as above.
- `plugins/tile-service/withNewNudgeTile.js` — Expo config plugin:
  - Copies the Kotlin file into `android/app/src/main/java/.../` on every `expo prebuild`.
  - Uses `withAndroidManifest` to inject the `<service>` entry: `android:permission="android.permission.BIND_QUICK_SETTINGS_TILE"`, intent-filter for `android.service.quicksettings.action.QS_TILE`, plus icon/label metadata.
  - Registered in `app.json`'s `plugins` array like the existing plugins (expo-router, expo-notifications, etc.).
- Tile icon: new monochrome "+" vector asset (white shape, transparent background — same style constraint as the existing notification monochrome icon, but a distinct "+" glyph, not the "n"). Tile label: "New nudge".

## JS-side changes
None expected beyond what already exists:
- `app.json` already has `"scheme": "nudgeapp"`; `nudge/new.tsx` already exists as a route, so expo-router already resolves `nudgeapp://nudge/new`.
- `RootLayout` (`src/app/_layout.tsx`) holds the splash screen until lists/nudges/settings finish loading, so a cold-start deep link into `nudge/new` never races store hydration — no guard code needed.

## Build & test
- Add `expo-dev-client` dependency; register the new config plugin in `app.json`.
- Build with `eas build --profile development --platform android` (existing `development` profile in `eas.json`, no changes needed there).
- Install the APK, run `npx expo start`, connect via the dev client.
- Manual test: add tile via Edit Tiles; tap from unlocked/foreground, from locked, and from a fully-killed app — confirm each lands on the create-nudge screen.
- No automated test for the native tap path (not practical in CI); existing coverage on `nudge/new`/`NudgeForm` is unaffected.

## Out of scope
- Auto-add-tile prompt (Android 13+ `TileService.requestAddTileService`)
- Show-over-lock-screen bypass (`setShowWhenLocked`) — standard unlock required instead
- iOS equivalent (no Quick Settings Tile concept on iOS)
- Home-screen widget
