"use client"

import React, { useEffect } from 'react';
import { XCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const PaymentError = () => {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            window.location.href = '/landing';
        }, 3000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white via-red-50/50 to-white px-4">
            <div className="bg-white p-12 rounded-2xl shadow-xl text-center max-w-md w-full">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Failed</h1>
                <p className="text-gray-600 mb-6">
                    Unfortunately, your transaction could not be completed. Redirecting you to checkout...
                </p>
                <Link
                    href="/checkout"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                    Retry Payment <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
};

export default PaymentError;