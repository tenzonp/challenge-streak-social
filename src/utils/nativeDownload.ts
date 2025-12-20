import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toast } from 'sonner';

// Check if we're on native platform
export const isNative = () => Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isIOS = () => Capacitor.getPlatform() === 'ios';

export const downloadFile = async (url: string, filename: string): Promise<boolean> => {
  if (isNative()) {
    try {
      // Fetch the file as blob
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Convert blob to base64
      const base64Data = await blobToBase64(blob);

      // Use different directories for Android and iOS
      const directory = isAndroid() ? Directory.Documents : Directory.Documents;
      const path = isAndroid() ? `Download/${filename}` : filename;

      await Filesystem.writeFile({
        path,
        data: base64Data,
        directory,
        recursive: true,
      });

      toast.success('Saved to device');
      return true;
    } catch (error) {
      console.error('Native download error:', error);
      // Fallback: try alternate directory
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const base64Data = await blobToBase64(blob);
        
        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        toast.success('Saved to cache');
        return true;
      } catch (e) {
        console.error('Fallback download error:', e);
        toast.error('Failed to save file');
        return false;
      }
    }
  } else {
    // Web fallback
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Saved to downloads');
      return true;
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
      return false;
    }
  }
};

// Helper to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get pure base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const saveImageToGallery = async (dataUrl: string, filename: string): Promise<boolean> => {
  if (isNative()) {
    try {
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      // For Android, save to Pictures directory
      // For iOS, save to Documents (iOS manages photos differently)
      const directory = Directory.Documents;
      const path = isAndroid() ? `Pictures/${filename}` : filename;

      await Filesystem.writeFile({
        path,
        data: base64Data,
        directory,
        recursive: true,
      });

      toast.success('Saved to gallery');
      return true;
    } catch (error) {
      console.error('Save to gallery error:', error);
      
      // Fallback: try cache directory
      try {
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        toast.success('Image saved');
        return true;
      } catch (e) {
        console.error('Fallback save error:', e);
        toast.error('Failed to save');
        return false;
      }
    }
  } else {
    // Web fallback - download the file
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Saved to downloads');
      return true;
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to save');
      return false;
    }
  }
};

// Native share using Capacitor Share plugin
export const nativeShare = async (options: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> => {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle || 'Share',
      });
      return true;
    } catch (error) {
      console.error('Native share error:', error);
      return false;
    }
  } else {
    // Web share fallback
    if (navigator.share) {
      try {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return true;
      } catch (error) {
        console.error('Web share error:', error);
        return false;
      }
    }
    return false;
  }
};

// Share image using native share - saves to cache then shares
export const shareImage = async (dataUrl: string, filename: string, title?: string): Promise<boolean> => {
  if (isNative()) {
    try {
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      
      // Save to cache first
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      // Share using native share
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: title || 'Woup',
        url: result.uri,
        dialogTitle: 'Share',
      });
      
      return true;
    } catch (error) {
      console.error('Share error:', error);
      // Fallback to just saving
      return saveImageToGallery(dataUrl, filename);
    }
  } else {
    // Web share
    try {
      if (navigator.share && navigator.canShare) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: title || 'Woup',
            files: [file],
          });
          return true;
        }
      }
      
      // Fallback to download
      return saveImageToGallery(dataUrl, filename);
    } catch (error) {
      console.error('Share error:', error);
      return false;
    }
  }
};

// Open URL in native browser
export const openBrowser = async (url: string): Promise<void> => {
  if (isNative()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    } catch (error) {
      console.error('Browser error:', error);
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
};
