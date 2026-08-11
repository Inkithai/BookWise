/**
 * Formats image URLs from the backend to ensure they load correctly.
 * 
 * The backend returns paths like: /storage/app/public/admin/img/logo.png
 * But the correct public URL should be: /storage/admin/img/logo.png
 * 
 * This function removes the '/app/public' segment to fix 403 Forbidden errors.
 * 
 * @param url - The image URL from the backend
 * @returns The corrected image URL
 */
export function formatImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // If it's already a full URL (http/https), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Fix Laravel storage path: remove '/app/public' segment
  if (url.includes('/storage/app/public/')) {
    return url.replace('/storage/app/public/', '/storage/');
  }
  
  // Return original if no fix needed
  return url;
}
