import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.streammanager.pro',
  appName: 'StreamManager Pro',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#06060f',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#06060f',
    },
  },
};

export default config;
