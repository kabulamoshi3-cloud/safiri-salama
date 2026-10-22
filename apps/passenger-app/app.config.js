// Google Maps keys are injected at build time. Restrict the key to this app's
// Android package/iOS bundle identifier and the required Maps SDKs.
module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        ...(mapsKey ? { googleMapsApiKey: mapsKey } : {}),
      },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(mapsKey ? { googleMaps: { apiKey: mapsKey } } : {}),
      },
    },
  };
};
