
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cloud.patholab.app',
  appName: 'Patholab Cloud',
  webDir: 'public',
  server: {
    url: 'https://app.patholab.cloud',
    allowNavigation: ['app.patholab.cloud'],
    androidScheme: 'https',
  },
  ios: {
    appendUserAgent: 'CapacitorApp',
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#3730a3',
    },
    Keyboard: {
      resize: 'body',
      style: 'LIGHT',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 2200,
      backgroundColor: '#3730a3',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
