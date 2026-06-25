const { withMainActivity } = require("@expo/config-plugins");

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

  const onCreateMatch = next.match(/override fun onCreate\(savedInstanceState: Bundle\?\) \{[\s\S]*?super\.onCreate\(savedInstanceState\)/);
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

module.exports = function withHealthConnectPermissionDelegate(config) {
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") return config;
    config.modResults.contents = ensureHealthConnectDelegate(config.modResults.contents);
    return config;
  });
};
