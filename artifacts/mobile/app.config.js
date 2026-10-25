const fs = require("fs");

// Push notifications on Android need Firebase's google-services.json.
// On EAS it is supplied as the file secret GOOGLE_SERVICES_JSON; locally you can drop the file
// next to this one. Without it the app still builds, it just cannot receive push alerts.
module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync("./google-services.json") ? "./google-services.json" : undefined);

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
