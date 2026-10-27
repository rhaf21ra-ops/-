import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qistuha.app',
  appName: 'قسطها',
  webDir: 'out',
  server: {
    // للاختبار الحي مباشرة من Netlify (بدون export) - غيّره إلى out عند البناء المحلي
    url: 'https://qistuha.netlify.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#047857'
    }
  }
};

export default config;
