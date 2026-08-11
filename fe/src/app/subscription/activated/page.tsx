"use client"

import { useAppSelector } from '@/slices/hooks';
import { CheckCircle, Loader } from 'lucide-react'
import { useRouter } from 'next/navigation';

import React, { useEffect } from 'react'

const Page = () => {
    const router = useRouter()
    const { authUser } = useAppSelector((state) => state.auth)
    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace('/dashboard');
        }, 2000);

        return () => clearTimeout(timer);
    }, [router]);


    // if (authUser && authUser.) {
    //     router.replace('/dashboard');
    //     return null; // don’t render anything
    // }


    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 flex items-center justify-center">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <div className="mb-6 flex justify-center">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Payment Successful!
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Your  subscription has been activated. You're being redirected to your dashboard...
                    </p>
                    <div className="flex justify-center">
                        <Loader className="w-5 h-5 animate-spin text-black" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Page