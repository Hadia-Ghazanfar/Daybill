import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.daybill.app',
  appName: 'Daybill',
  webDir: 'frontend/dist',
  android: {
    scheme: 'https',
  },
};

export default config;

/**
 * NOTE: The Capacitor toolchain is NOT installed in this repo yet.
 * The owner installs and initializes it later, AFTER a production build exists:
 *
 *   npm install @capacitor/core
 *   npm install -D @capacitor/cli
 *   npm run build                 # builds the web app into frontend/dist
 *   npx cap init                  # accepts this config file as-is
 *   npx cap add android           # creates the native android/ project
 *   npx cap sync                  # copies frontend/dist into the native app
 *
 * Then open android/ in Android Studio to build/sign the APK.
 * See README.md ("APK via Capacitor") for the full walkthrough.
 */
