const { AndroidConfig, withAndroidManifest, withMainActivity } = require("@expo/config-plugins");

const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";
const HEALTH_PERMISSION_USAGE_ALIAS = "ViewPermissionUsageActivity";

function addImport(src, importLine) {
  if (src.includes(importLine)) return src;
  const packageMatch = src.match(/^package\s+[^\n]+\n/m);
  if (packageMatch) {
    const index = packageMatch.index + packageMatch[0].length;
    return `${src.slice(0, index)}\n${importLine}\n${src.slice(index)}`;
  }
  return `${importLine}\n${src}`;
}

function ensureHealthConnectDelegate(src) {
  let next = addImport(src, "import android.os.Bundle");
  next = addImport(next, "import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate");

  if (next.includes("HealthConnectPermissionDelegate.setPermissionDelegate(this)")) {
    return next;
  }

  const onCreateMatch = next.match(/override fun onCreate\(savedInstanceState: Bundle\?\) \{[\s\S]*?super\.onCreate\([^)]+\)/);
  if (onCreateMatch?.index != null) {
    const insertAt = onCreateMatch.index + onCreateMatch[0].length;
    return `${next.slice(0, insertAt)}\n    HealthConnectPermissionDelegate.setPermissionDelegate(this)${next.slice(insertAt)}`;
  }

  const componentMatch = next.match(/\n\s*override fun getMainComponentName\(\): String/);
  const onCreate = `
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    HealthConnectPermissionDelegate.setPermissionDelegate(this)
  }
`;
  if (componentMatch?.index != null) {
    return `${next.slice(0, componentMatch.index)}${onCreate}${next.slice(componentMatch.index)}`;
  }

  return next.replace(/\n\}$/, `${onCreate}\n}`);
}

function ensureHealthConnectManifest(androidManifest) {
  const manifest = androidManifest.manifest;
  const application = manifest.application?.[0];
  if (!application) return androidManifest;

  const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);
  application["activity-alias"] = application["activity-alias"] ?? [];
  const targetActivity = mainActivity.$?.["android:name"] ?? ".MainActivity";
  const usageAlias = application["activity-alias"].find(
    (activityAlias) => activityAlias.$?.["android:name"] === HEALTH_PERMISSION_USAGE_ALIAS
  );
  const nextUsageAlias = usageAlias ?? {
    $: {
      "android:name": HEALTH_PERMISSION_USAGE_ALIAS,
    },
  };
  nextUsageAlias.$ = {
    ...nextUsageAlias.$,
    "android:exported": "true",
    "android:permission": "android.permission.START_VIEW_PERMISSION_USAGE",
    "android:targetActivity": targetActivity,
  };
  nextUsageAlias["intent-filter"] = [
    {
      action: [
        {
          $: {
            "android:name": "android.intent.action.VIEW_PERMISSION_USAGE",
          },
        },
      ],
      category: [
        {
          $: {
            "android:name": "android.intent.category.HEALTH_PERMISSIONS",
          },
        },
      ],
    },
  ];
  if (!usageAlias) {
    application["activity-alias"].push(nextUsageAlias);
  }

  manifest.queries = manifest.queries ?? [];
  const queries = manifest.queries[0] ?? {};
  queries.package = queries.package ?? [];
  const hasHealthConnectQuery = queries.package.some((item) => item.$?.["android:name"] === HEALTH_CONNECT_PACKAGE);
  if (!hasHealthConnectQuery) {
    queries.package.push({
      $: {
        "android:name": HEALTH_CONNECT_PACKAGE,
      },
    });
  }
  manifest.queries[0] = queries;

  return androidManifest;
}

module.exports = function withHealthConnectPermissionDelegate(config) {
  config = withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") return config;
    config.modResults.contents = ensureHealthConnectDelegate(config.modResults.contents);
    return config;
  });

  return withAndroidManifest(config, (config) => {
    config.modResults = ensureHealthConnectManifest(config.modResults);
    return config;
  });
};
