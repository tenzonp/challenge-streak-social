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
    allowMixedContent: true
  },
  ios: {
    contentInset: 'automatic'
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
    }
  }
};

export default config;
