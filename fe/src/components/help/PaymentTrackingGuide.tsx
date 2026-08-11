"use client";

import React from "react";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  Bell,
  Download,
} from "lucide-react";

const PaymentTrackingGuide = () => {
  return (
    <div className="w-full">
      <div className="bg-white shadow rounded-lg mx-2 sm:mx-4 lg:mx-6 mb-4 sm:mb-6 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-teal-50">
          <div className="flex items-center">
            <div className="bg-teal-100 p-2 sm:p-3 rounded-lg">
              <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Tracking Guide</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Track payments and manage your receivables effectively
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6 sm:space-y-8">
            {/* Payment Overview */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Payment Overview</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Monitor all incoming payments, pending amounts, and overdue invoices from a centralized dashboard.
              </p>
              
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200 mb-4">
                <h4 className="font-medium text-teal-800 mb-3 text-sm sm:text-base">Key Payment Metrics</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-teal-700 text-xs sm:text-sm">
                  <li className="flex items-center"><DollarSign className="h-4 w-4 mr-2" /> Total revenue collected</li>
                  <li className="flex items-center"><Clock className="h-4 w-4 mr-2" /> Pending payments</li>
                  <li className="flex items-center"><AlertCircle className="h-4 w-4 mr-2" /> Overdue amounts</li>
                  <li className="flex items-center"><TrendingUp className="h-4 w-4 mr-2" /> Payment trends</li>
                </ul>
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Payment Status</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Track the status of each payment through its lifecycle.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-yellow-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-yellow-800 text-sm sm:text-base">Pending</h4>
                      <p className="text-yellow-700 text-xs sm:text-sm">Payment is expected but not yet received</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-teal-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-teal-800 text-sm sm:text-base">Processing</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">Payment is being processed by payment gateway</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-green-800 text-sm sm:text-base">Completed</h4>
                      <p className="text-green-700 text-xs sm:text-sm">Payment has been successfully received</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-red-800 text-sm sm:text-base">Failed</h4>
                      <p className="text-red-700 text-xs sm:text-sm">Payment transaction failed or was declined</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Payment Methods</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Accept payments through multiple channels to provide flexibility to your clients.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Credit/Debit Cards</h4>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Accept all major credit and debit cards through secure payment gateways.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Bank Transfers</h4>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Enable direct bank transfers for larger payments and corporate clients.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Online Payment Links</h4>
                  <p className="text-green-700 text-xs sm:text-sm">
                    Generate secure payment links for clients to pay invoices online.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2 text-sm sm:text-base">Docusign Integration</h4>
                  <p className="text-amber-700 text-xs sm:text-sm">
                    Collect payments through signed Docusign agreements and contracts.
                  </p>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Payment Notifications</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Stay informed about payment activities with automated notifications.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <Bell className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Payment Received</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Instant notification when a payment is successfully received.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800 mb-2 text-sm sm:text-base">Overdue Alerts</h4>
                      <p className="text-red-700 text-xs sm:text-sm">
                        Automatic alerts when payments become overdue.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reports */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 mb-2 text-sm sm:text-base">Payment Reports</p>
                  <ul className="text-yellow-700 text-xs sm:text-sm space-y-1">
                    <li>• Generate detailed payment reports for accounting purposes</li>
                    <li>• Export payment data to CSV or PDF formats</li>
                    <li>• Track payment trends and client payment patterns</li>
                    <li>• Reconcile payments with bank statements automatically</li>
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

export default PaymentTrackingGuide;
