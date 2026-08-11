// src/hooks/useTokenExpiry.ts - Optional: Active token monitoring
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/slices/hooks';
import { handleTokenExpired } from '@/slices/authSlice';
import { toast } from 'sonner';

export const useTokenExpiry = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const checkTokenExpiry = () => {
      const tokenKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken';
      const token = localStorage.getItem(tokenKey);
      
      if (!token) return;

      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        
        if (decoded.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = decoded.exp - currentTime;
          
          // If token expires in less than 5 minutes, show warning
          if (timeUntilExpiry > 0 && timeUntilExpiry < 300) {
            toast.warning('Your session will expire soon. Please save your work.');
          }
          
          // If token is expired
          if (timeUntilExpiry <= 0) {
            dispatch(handleTokenExpired());
            toast.error('Your session has expired. Please login again.');
            router.push('/auth/login');
          }
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);

    return () => clearInterval(interval);
  }, [dispatch, router]);
};