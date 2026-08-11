"use client"
import React from 'react';
import Link from 'next/link';
import { Linkedin, Twitter, Facebook, ArrowRight } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { name: 'Home', id: 'hero' },
    { name: 'Features', id: 'features' },
    { name: 'Pricing', id: 'pricing' },
    { name: 'Contact', id: 'contact' }
  ];

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Facebook, href: '#', label: 'Facebook' }
  ];

  return (
    <footer className="relative bg-white text-gray-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0F766E]/3 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            {/* Brand Section */}
            <div className="space-y-6">
              <div>
                <div className="flex flex-shrink-0">
                  <span className="text-2xl font-bold text-primary mr-2">
                    BookWise
                  </span>
                  <img
                    src="/logo.png"
                    alt="BookWise Logo"
                    className="h-6 w-auto"
                  />
                </div>
                <p className="text-gray-600 text-sm mt-2">Accounting & Bookkeeping Platform</p>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed max-w-sm">
                Streamline your invoicing workflow with our comprehensive suite of tools.
              </p>


            </div>

            {/* Navigation Links */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-6 text-sm uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-[#0F766E] rounded"></div>
                Navigation
              </h4>
              <ul className="space-y-3">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className="text-gray-700 hover:text-[#0F766E] transition-colors duration-200 text-sm font-medium hover:translate-x-1 inline-block"
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-6 text-sm uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-[#0F766E] rounded"></div>
                Legal
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/Privacy"
                    className="text-gray-700 hover:text-[#0F766E] transition-colors duration-200 text-sm font-medium hover:translate-x-1 inline-block"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-and-conditions"
                    className="text-gray-700 hover:text-[#0F766E] transition-colors duration-200 text-sm font-medium hover:translate-x-1 inline-block"
                  >
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/help"
                    className="text-gray-700 hover:text-[#0F766E] transition-colors duration-200 text-sm font-medium hover:translate-x-1 inline-block"
                  >
                    Help
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('contact')}
                    className="text-gray-700 hover:text-[#0F766E] transition-colors duration-200 text-sm font-medium hover:translate-x-1 inline-block"
                  >
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>

            {/* Account Section */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-6 text-sm uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-[#0F766E] rounded"></div>
                Account
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/auth/login"
                    className="text-gray-700 hover:text-[#0F766E] transition-colors duration-200 text-sm font-medium hover:translate-x-1 inline-block"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center px-4 py-2.5 bg-[#0F766E] hover:bg-[#0F766E] text-white rounded-lg text-sm font-medium transition-colors duration-300"
                  >
                    Register Now
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mb-8"></div>

          {/* Bottom Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-sm text-center sm:text-left">
              &copy; {currentYear} BookWise Invoicing. All rights reserved.
            </p>


          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;