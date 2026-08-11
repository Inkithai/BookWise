'use client';

import { useEffect } from 'react';

/**
 * IosInputZoomPreventer
 * 
 * Prevents unwanted zoom on input focus on iOS Safari.
 * iOS automatically zooms when input font-size is less than 16px.
 * This component ensures all inputs have at least 16px font size on touch.
 */
export default function IosInputZoomPreventer() {
  useEffect(() => {
    // Prevent zoom on input focus on iOS
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        const currentFontSize = window.getComputedStyle(target).fontSize;
        const fontSizeNum = parseFloat(currentFontSize);
        
        // If font size is less than 16px, set it to 16px to prevent iOS zoom
        if (fontSizeNum < 16) {
          target.style.fontSize = '16px';
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
