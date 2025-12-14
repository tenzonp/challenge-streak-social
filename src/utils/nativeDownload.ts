import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toast } from 'sonner';

export const downloadFile = async (url: string, filename: string): Promise<boolean> => {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // Fetch the file as blob
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      // Save to device
      await Filesystem.writeFile({
        path: `Download/${filename}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      toast.success('Saved to device');
      return true;
    } catch (error) {
      console.error('Native download error:', error);
      toast.error('Failed to save file');
      return false;
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

export const saveImageToGallery = async (dataUrl: string, filename: string): Promise<boolean> => {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const base64Data = dataUrl.split(',')[1];

      await Filesystem.writeFile({
        path: `Pictures/${filename}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      toast.success('Saved to gallery');
      return true;
    } catch (error) {
      console.error('Save to gallery error:', error);
      toast.error('Failed to save');
      return false;
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
