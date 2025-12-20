import { Capacitor } from '@capacitor/core';

// Platform detection
export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isWeb = () => Capacitor.getPlatform() === 'web';

// Initialize native app features
export const initializeNativeApp = async () => {
  if (!isNativePlatform()) return;

  try {
    // Initialize Status Bar
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f0f12' });
    
    if (isAndroid()) {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (e) {
    console.log('StatusBar not available:', e);
  }

  try {
    // Initialize Keyboard
    const { Keyboard } = await import('@capacitor/keyboard');

    const syncKeyboardVisibleClass = (visible: boolean) => {
      const active = document.activeElement as HTMLElement | null;
      const isTextInput =
        !!active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

      if (visible && isTextInput) document.body.classList.add('keyboard-visible');
      if (!visible) document.body.classList.remove('keyboard-visible');
    };

    Keyboard.addListener('keyboardWillShow', () => syncKeyboardVisibleClass(true));
    Keyboard.addListener('keyboardDidShow', () => syncKeyboardVisibleClass(true));
    Keyboard.addListener('keyboardWillHide', () => syncKeyboardVisibleClass(false));
    Keyboard.addListener('keyboardDidHide', () => syncKeyboardVisibleClass(false));

    // Safety: if the class ever gets stuck, clear it as soon as user scrolls/taps outside inputs.
    const clearIfNoTextFocus = () => {
      const active = document.activeElement as HTMLElement | null;
      const isTextInput =
        !!active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (!isTextInput) document.body.classList.remove('keyboard-visible');
    };

    window.addEventListener('scroll', clearIfNoTextFocus, { passive: true });
    window.addEventListener('touchstart', clearIfNoTextFocus, { passive: true });
  } catch (e) {
    console.log('Keyboard not available:', e);
  }

  try {
    // Hide splash screen
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (e) {
    console.log('SplashScreen not available:', e);
  }

  try {
    // Handle back button on Android
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // Handle app state changes
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        document.dispatchEvent(new CustomEvent('app-resumed'));
      } else {
        document.dispatchEvent(new CustomEvent('app-paused'));
      }
    });
  } catch (e) {
    console.log('App not available:', e);
  }
};

// Haptic feedback utilities
export const hapticFeedback = async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  if (!isNativePlatform()) return;

  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
    }
  } catch (e) {
    console.log('Haptics not available:', e);
  }
};

// Vibrate for selection
export const hapticSelection = async () => {
  if (!isNativePlatform()) return;

  try {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.selectionStart();
    await Haptics.selectionEnd();
  } catch (e) {
    console.log('Haptics not available:', e);
  }
};
