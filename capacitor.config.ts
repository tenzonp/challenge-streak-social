import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.96ca2c923ad24040841b3d79de2d3ffd',
  appName: 'woup',
  webDir: 'dist',
  server: {
    url: 'https://96ca2c92-3ad2-4040-841b-3d79de2d3ffd.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f0f12'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0f0f12',
    preferredContentMode: 'mobile'
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Filesystem: {
      readPermissions: ['storage'],
      writePermissions: ['storage']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f0f12',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f0f12'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
