import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/core/lib/supabase';
import { edgeApi } from '@/core/lib/edge-api';

export interface UploadAvatarResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

/**
 * Launches the device image picker, uploads the selected photo to Supabase Storage ('avatars' bucket),
 * and updates the user's profile avatar_url in the database.
 */
export async function pickAndUploadAvatar(): Promise<UploadAvatarResult> {
  try {
    // 1. Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // 2. Request permission to access media library
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return { success: false, error: 'Permission to access photo library was denied' };
    }

    // 3. Launch Image Picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, error: 'Canceled' };
    }

    const asset = result.assets[0];
    const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `${user.id}/avatar.${fileExt}`;
    const contentType = asset.mimeType || `image/${fileExt}`;

    // 4. Convert base64 / blob for Supabase upload
    let fileData: ArrayBuffer | Blob;
    if (asset.base64) {
      const binaryString = atob(asset.base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;
    } else {
      const response = await fetch(asset.uri);
      fileData = await response.blob();
    }

    // 5. Upload to Supabase Storage 'avatars' bucket (with upsert: true)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileData, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // 6. Get public URL of the uploaded avatar
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    // 7. Update public.profiles avatar_url, edgeApi profile, & auth user_metadata
    const [profileUpdateRes, authUpdateRes] = await Promise.all([
      supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id),
      supabase.auth.updateUser({ data: { avatar_url: publicUrl } }),
    ]);

    if (profileUpdateRes.error) {
      console.warn('Profiles table update warning (retrying with user_id):', profileUpdateRes.error);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
    }

    // Also update via edgeApi profile endpoint if available
    try {
      const currentProfile = await edgeApi.getProfile();
      if (currentProfile.data) {
        await edgeApi.updateProfile({ avatar_url: publicUrl } as any, currentProfile.data.version);
      }
    } catch (edgeErr) {
      console.warn('EdgeApi update profile avatar warning:', edgeErr);
    }

    return { success: true, publicUrl };
  } catch (error: any) {
    console.error('Avatar upload exception:', error);
    return { success: false, error: error?.message || 'An unexpected error occurred' };
  }
}
