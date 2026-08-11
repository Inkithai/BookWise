//src/app/auth/sso/page.tsx
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch } from '@/slices/hooks';
import { setAuthUserFromRawData } from '@/slices/authSlice';
import { getCurrentUser } from '@/services/service';
import { Loader2 } from 'lucide-react';

function SSOCrossAuthContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            console.error('SSO Error: No token provided');
            router.push('/auth/login');
            return;
        }

        const performSSO = async () => {
            try {
                const tokenKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken';

                // 1. Store the token
                localStorage.setItem(tokenKey, token);

                // 2. Fetch the user profile from BE2 using the new token
                // The SyncOAuth2User middleware in BE2 will handle the sync
                const userData = await getCurrentUser();

                if (userData && userData.data) {
                    // 3. Update Redux store and localStorage for user
                    dispatch(setAuthUserFromRawData(userData.data));

                    router.push('/dashboard');
                } else {
                    throw new Error('Failed to fetch user data after SSO');
                }
            } catch (error) {
                console.error('SSO Authentication Failed:', error);
                localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken');
                router.push('/auth/login?error=sso-failed');
            }
        };

        performSSO();
    }, [searchParams, router, dispatch]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
                <div className="text-center">
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Authenticating</h1>
                    <p className="text-slate-500 text-sm">Please wait while we sync your account...</p>
                </div>
            </div>
        </div>
    );
}

export default function SSOPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
            </div>
        }>
            <SSOCrossAuthContent />
        </Suspense>
    );
}
