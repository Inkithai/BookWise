// components/common/Footer.tsx
import React from 'react';
import { Heart } from 'lucide-react';
import Image from 'next/image';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="backdrop-blur-sm bg-white/70 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-700 shadow-sm py-3">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
           <span className="mr-1">Made with</span>
            <Heart
              size={16}
              className="text-red-500 fill-red-500 animate-pulse mx-1 transition-transform hover:scale-110"
            />
          </div> 
          <div className="flex items-center justify-center text-slate-600 dark:text-slate-300 text-sm font-medium">
            <div className="relative w-6 h-6">
              <Image
                src="/logo.png"
                alt="BookWise Logo"
                width={24}
                height={24}
                className="block"
              />
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
              © 2019–{currentYear} <span className="font-semibold text-slate-800 dark:text-white">BookWise</span>. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};