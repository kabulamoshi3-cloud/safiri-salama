// Expo injects EXPO_PUBLIC_* env vars at build time via babel-preset-expo.
// Declare the shape here so TypeScript recognises `process.env.*`.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_TRACKING_URL?: string;
    [key: string]: string | undefined;
  };
};
