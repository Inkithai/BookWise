"use client";

import React from "react";
import {
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Palette,
  Info,
  Lock,
  Key,
} from "lucide-react";

const SettingsGuide = () => {
  return (
    <div className="w-full">
      <div className="bg-white shadow rounded-lg mx-2 sm:mx-4 lg:mx-6 mb-4 sm:mb-6 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-rose-50">
          <div className="flex items-center">
            <div className="bg-pink-100 p-2 sm:p-3 rounded-lg">
              <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-pink-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings Guide</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Configure your account and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6 sm:space-y-8">
            {/* Account Settings */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Account Settings</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Manage your personal account information and security settings.
              </p>
              
              <div className="bg-pink-50 p-4 rounded-lg border border-pink-200 mb-4">
                <h4 className="font-medium text-pink-800 mb-3 text-sm sm:text-base">Account Management Options</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-pink-700 text-xs sm:text-sm">
                  <li className="flex items-center"><User className="h-4 w-4 mr-2" /> Profile information</li>
                  <li className="flex items-center"><Lock className="h-4 w-4 mr-2" /> Password management</li>
                  <li className="flex items-center"><Key className="h-4 w-4 mr-2" /> Two-factor authentication</li>
                  <li className="flex items-center"><Shield className="h-4 w-4 mr-2" /> Security settings</li>
                </ul>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Notification Settings</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Customize how and when you receive notifications about your account activities.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <Bell className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Email Notifications</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Configure email alerts for invoices, payments, and important account updates.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <Bell className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Push Notifications</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Enable browser push notifications for real-time updates on your devices.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Settings */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Payment Settings</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Configure payment gateways and billing preferences.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Payment Gateways</h4>
                  <p className="text-green-700 text-xs sm:text-sm">
                    Connect Stripe, PayPal, or other payment processors to accept payments.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Billing Preferences</h4>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Set default payment terms, currency, and tax settings for your invoices.
                  </p>
                </div>
              </div>
            </div>

            {/* Branding Settings */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Branding Settings</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Customize the appearance of your invoices and communications.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <Palette className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Invoice Templates</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Choose from pre-designed templates or create custom invoice designs.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start">
                    <Globe className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 mb-2 text-sm sm:text-base">Company Branding</h4>
                      <p className="text-amber-700 text-xs sm:text-sm">
                        Upload your logo, set brand colors, and customize email signatures.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Tips */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 mb-2 text-sm sm:text-base">Security Best Practices</p>
                  <ul className="text-yellow-700 text-xs sm:text-sm space-y-1">
                    <li>• Enable two-factor authentication for enhanced security</li>
                    <li>• Use strong, unique passwords for your account</li>
                    <li>• Regularly review your account activity log</li>
                    <li>• Keep your contact information updated for account recovery</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsGuide;
