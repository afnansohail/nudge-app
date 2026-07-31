// plugins/tile-service/withNewNudgeTile.js
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TILE_SERVICE_CLASS = 'NewNudgeTileService';
const TILE_ICON_NAME = 'ic_tile_new_nudge';
const TILE_LABEL = 'Nudge me';

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
