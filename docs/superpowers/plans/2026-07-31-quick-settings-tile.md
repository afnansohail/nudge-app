# Android Quick Settings Tile — Create Nudge Shortcut Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Android Quick Settings tile that deep-links straight into the existing create-nudge screen (`nudge/new`).

**Architecture:** A small custom Expo config plugin (`plugins/tile-service/`) copies a Kotlin `TileService` subclass and a vector "+" icon into the native Android project on every `expo prebuild`, and injects the required `<service>` entry into `AndroidManifest.xml`. Tapping the tile fires an `ACTION_VIEW` intent at `nudgeapp://nudge/new`, which expo-router already resolves to the existing create-nudge route — no JS/route changes needed.

**Tech Stack:** Expo SDK 54, `@expo/config-plugins` (via `expo/config-plugins`, v54.0.5, already installed), Kotlin, `expo-dev-client`, EAS Build.

## Global Constraints

- Android only — no iOS equivalent, don't touch `ios` config.
- Android package is `com.afnansohail.nudgeapp` (from `app.json` → `expo.android.package`) — the Kotlin file's package declaration and the manifest `android:name` must match this exactly.
- Deep link target is `nudgeapp://nudge/new` (existing `scheme` in `app.json`, existing route at `src/app/nudge/new.tsx`) — do not add a new route.
- Manual tile add only (user adds via Android's "Edit tiles" panel) — do not implement the Android 13+ auto-add-tile API.
- Standard unlock required when tapping from the lock screen — do not set `showWhenLocked`/bypass keyguard.
- `android/` is gitignored in this project (continuous native generation) — never hand-edit files under `android/`; all native content must be produced by the config plugin so it survives `expo prebuild --clean`.
- Tile icon is a new "+" glyph, distinct from the existing monochrome "n" notification icon (`assets/images/android-icon-monochrome.png`) — do not reuse that asset.

---

### Task 1: Native TileService source + icon asset

**Files:**
- Create: `plugins/tile-service/NewNudgeTileService.kt`
- Create: `plugins/tile-service/ic_tile_new_nudge.xml`

**Interfaces:**
- Produces: a Kotlin class `com.afnansohail.nudgeapp.NewNudgeTileService` (file name `NewNudgeTileService.kt`) that Task 2's config plugin copies verbatim into the native project, and a drawable resource file `ic_tile_new_nudge.xml` that Task 2 copies into `res/drawable/`. Task 2 references both by these exact file names.

- [ ] **Step 1: Write the TileService Kotlin source**

```kotlin
// plugins/tile-service/NewNudgeTileService.kt
package com.afnansohail.nudgeapp

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.TileService

class NewNudgeTileService : TileService() {
    override fun onClick() {
        super.onClick()
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("nudgeapp://nudge/new")).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE
            )
            startActivityAndCollapse(pendingIntent)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
```

`startActivityAndCollapse(Intent)` is deprecated (and throws for apps targeting API 34+) as of Android 14; the `PendingIntent` overload only exists from API 34 onward. The SDK_INT branch is required to support both — this isn't optional cleanup, both branches are load-bearing on real devices.

- [ ] **Step 2: Write the tile icon vector drawable**

```xml
<!-- plugins/tile-service/ic_tile_new_nudge.xml -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
</vector>
```

This is a standard Material "+" glyph, white fill on a transparent background, matching the style Android expects for a Quick Settings tile icon.

- [ ] **Step 3: Commit**

```bash
git add plugins/tile-service/NewNudgeTileService.kt plugins/tile-service/ic_tile_new_nudge.xml
git commit -m "feat: add TileService source and icon for quick-settings create-nudge tile"
```

---

### Task 2: Config plugin — copy files, inject manifest, register in app.json

**Files:**
- Create: `plugins/tile-service/withNewNudgeTile.js`
- Modify: `app.json` (add plugin to `expo.plugins`)
- Test: manual verification via `expo prebuild` (see Step 2 below) — this project has no config-plugin unit-test harness, so verification is an integration check against the actual generated native project rather than a unit test.

**Interfaces:**
- Consumes: `NewNudgeTileService.kt` and `ic_tile_new_nudge.xml` from Task 1 (same directory, referenced by relative path via `__dirname`).
- Produces: `module.exports = withNewNudgeTile` — a `ConfigPlugin` function, registered directly (by file path) in `app.json`'s `plugins` array.

- [ ] **Step 1: Write the config plugin**

```js
// plugins/tile-service/withNewNudgeTile.js
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TILE_SERVICE_CLASS = 'NewNudgeTileService';
const TILE_ICON_NAME = 'ic_tile_new_nudge';
const TILE_LABEL = 'New nudge';

function withTileServiceSourceFile(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const packagePath = config.android.package.replace(/\./g, '/');
      const javaDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        packagePath
      );
      fs.mkdirSync(javaDir, { recursive: true });
      fs.copyFileSync(
        path.join(__dirname, `${TILE_SERVICE_CLASS}.kt`),
        path.join(javaDir, `${TILE_SERVICE_CLASS}.kt`)
      );
      return config;
    },
  ]);
}

function withTileIcon(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const drawableDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/drawable'
      );
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.copyFileSync(
        path.join(__dirname, `${TILE_ICON_NAME}.xml`),
        path.join(drawableDir, `${TILE_ICON_NAME}.xml`)
      );
      return config;
    },
  ]);
}

function withTileManifest(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    mainApplication.service = (mainApplication.service ?? []).filter(
      (service) => service.$['android:name'] !== `.${TILE_SERVICE_CLASS}`
    );
    mainApplication.service.push({
      $: {
        'android:name': `.${TILE_SERVICE_CLASS}`,
        'android:label': TILE_LABEL,
        'android:icon': `@drawable/${TILE_ICON_NAME}`,
        'android:permission': 'android.permission.BIND_QUICK_SETTINGS_TILE',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.service.quicksettings.action.QS_TILE' } }],
        },
      ],
    });
    return config;
  });
}

module.exports = function withNewNudgeTile(config) {
  config = withTileServiceSourceFile(config);
  config = withTileIcon(config);
  config = withTileManifest(config);
  return config;
};
```

The manifest step filters out any existing entry with the same `android:name` before pushing, so re-running `expo prebuild` (which re-applies plugins against a fresh manifest each time) never produces duplicate `<service>` entries.

- [ ] **Step 2: Register the plugin in app.json**

Modify `app.json`, inside `expo.plugins` (add as a new array entry, keeping the existing entries unchanged):

```json
      "./plugins/tile-service/withNewNudgeTile.js",
```

- [ ] **Step 3: Verify via prebuild**

Run:
```bash
npx expo prebuild --platform android --clean
```
Expected: command exits 0.

Then run:
```bash
grep -n 'NewNudgeTileService' android/app/src/main/AndroidManifest.xml
grep -n 'BIND_QUICK_SETTINGS_TILE' android/app/src/main/AndroidManifest.xml
test -f android/app/src/main/java/com/afnansohail/nudgeapp/NewNudgeTileService.kt && echo "kt OK"
test -f android/app/src/main/res/drawable/ic_tile_new_nudge.xml && echo "icon OK"
```
Expected: both greps print a matching line, and both `echo` lines print. This confirms the plugin correctly generates the native project; it does not yet confirm the Kotlin compiles (that happens during the Task 3 build).

- [ ] **Step 4: Commit**

```bash
git add plugins/tile-service/withNewNudgeTile.js app.json
git commit -m "feat: add config plugin wiring the create-nudge quick-settings tile"
```

Note: do not `git add android/` — it's gitignored and regenerated by prebuild; running Step 3 leaves a local `android/` directory behind, which is expected and fine to leave in place for Task 3's build.

---

### Task 3: Dev client build and on-device verification

**Files:**
- Modify: `package.json` (add `expo-dev-client` dependency)

**Interfaces:**
- Consumes: the working config plugin from Task 2 (must already be registered in `app.json`).
- Produces: an installed development-client APK on a physical Android device, used only for manual verification — no further tasks depend on this one programmatically.

- [ ] **Step 1: Add the dev client dependency**

```bash
npx expo install expo-dev-client
```
Expected: `package.json` gains an `expo-dev-client` entry; command exits 0.

- [ ] **Step 2: Start a cloud development build**

```bash
eas build --profile development --platform android
```
This uses the existing `development` profile in `eas.json` (`developmentClient: true`, `distribution: internal`) — no `eas.json` changes needed. Wait for the build to finish, then download/install the resulting APK on a physical Android device (EAS prints a QR code / link for this).

- [ ] **Step 3: Start the bundler**

```bash
npx expo start --dev-client
```

- [ ] **Step 4: Manual verification checklist**

On the device, with the dev-client app installed and Metro running:
- [ ] Open Quick Settings → Edit tiles → drag the "New nudge" tile into the active tiles. Confirm it shows the "+" icon and "New nudge" label.
- [ ] With the app already open in the foreground, tap the tile. Confirm the panel collapses and the create-nudge screen (`nudge/new`) opens.
- [ ] Lock the device, tap the tile from the lock screen. Confirm the standard unlock prompt appears, and after unlocking, the create-nudge screen opens.
- [ ] Fully close the app (swipe away from recents), tap the tile. Confirm the app cold-starts directly into the create-nudge screen (not the home screen).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add expo-dev-client for quick-settings tile development builds"
```

---

## Out of scope (confirmed during design, do not implement)

- Android 13+ auto-add-tile prompt (`TileService.requestAddTileService`)
- `showWhenLocked` / lock-screen bypass
- iOS equivalent
- Home-screen widget
- Automated tests for the native tap path (not practical in CI for this project)
