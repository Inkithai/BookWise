"use client"

import React, { useEffect } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const PaymentSuccess = () => {
    const router = useRouter();
    setTimeout(() => {
        window.location.href = '/landing';
    }, 3000);

    // useEffect(() => {


    //     return () => clearTimeout(timer);
    // }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white via-teal-50/50 to-white px-4">
            <div className="bg-white p-12 rounded-2xl shadow-xl text-center max-w-md w-full">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
                <p className="text-gray-600 mb-6">
                    You will be redirected
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#0F766E] text-white font-medium rounded-lg hover:bg-[#0F766E] transition-colors"
                >
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
};

export default PaymentSuccess;