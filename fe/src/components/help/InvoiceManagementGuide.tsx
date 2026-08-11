"use client";

import React from "react";
import {
  FileText,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Info,
  Download,
  Printer,
  Mail,
  Plus,
} from "lucide-react";

const InvoiceManagementGuide = () => {
  return (
    <div className="w-full">
      <div className="bg-white shadow rounded-lg mx-2 sm:mx-4 lg:mx-6 mb-4 sm:mb-6 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-pink-50">
          <div className="flex items-center">
            <div className="bg-teal-100 p-2 sm:p-3 rounded-lg">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Invoice Management Guide</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Create, send, and manage your invoices efficiently
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6 sm:space-y-8">
            {/* Creating Invoices */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Creating Invoices</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Create professional invoices with our easy-to-use invoice builder. 
                Customize your invoices with your branding and detailed line items.
              </p>
              
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200 mb-4">
                <h4 className="font-medium text-teal-800 mb-3 text-sm sm:text-base">Invoice Creation Steps</h4>
                <ol className="list-decimal list-inside space-y-2 text-teal-700 text-xs sm:text-sm">
                  <li>Click &quot;Create Invoice&quot; from the dashboard or invoice section</li>
                  <li>Select or add a client from your database</li>
                  <li>Add line items with descriptions, quantities, and rates</li>
                  <li>Set payment terms and due dates</li>
                  <li>Add any applicable taxes or discounts</li>
                  <li>Preview and customize the invoice design</li>
                  <li>Save as draft or send directly to client</li>
                </ol>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Line Items</h4>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Add multiple line items with descriptions, quantities, unit prices, and tax rates.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Payment Terms</h4>
                  <p className="text-green-700 text-xs sm:text-sm">
                    Set standard payment terms like Net 30, Net 15, or custom due dates.
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice Status */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Invoice Status Tracking</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Track your invoices through their lifecycle from creation to payment completion.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-800 text-sm sm:text-base">Draft</h4>
                      <p className="text-gray-600 text-xs sm:text-sm">Invoice is saved but not yet sent to client</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-center">
                    <Send className="h-5 w-5 text-teal-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-teal-800 text-sm sm:text-base">Sent</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">Invoice has been sent to client, awaiting response</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-teal-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-teal-800 text-sm sm:text-base">Viewed</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">Client has opened and viewed the invoice</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-green-800 text-sm sm:text-base">Paid</h4>
                      <p className="text-green-700 text-xs sm:text-sm">Payment has been received and processed</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-red-800 text-sm sm:text-base">Overdue</h4>
                      <p className="text-red-700 text-xs sm:text-sm">Payment due date has passed without payment</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sending Invoices */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Sending Invoices</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Send invoices directly to clients via email or generate shareable links.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-center mb-2">
                    <Mail className="h-4 w-4 text-teal-600 mr-2" />
                    <h4 className="font-medium text-teal-800 text-sm sm:text-base">Email Delivery</h4>
                  </div>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Send invoices directly to client email with professional email templates.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-center mb-2">
                    <Download className="h-4 w-4 text-teal-600 mr-2" />
                    <h4 className="font-medium text-teal-800 text-sm sm:text-base">PDF Download</h4>
                  </div>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Download invoices as PDF files for manual distribution or archiving.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center mb-2">
                    <Printer className="h-4 w-4 text-amber-600 mr-2" />
                    <h4 className="font-medium text-amber-800 text-sm sm:text-base">Print Invoices</h4>
                  </div>
                  <p className="text-amber-700 text-xs sm:text-sm">
                    Print invoices directly for physical delivery or record keeping.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <div className="flex items-center mb-2">
                    <Plus className="h-4 w-4 text-pink-600 mr-2" />
                    <h4 className="font-medium text-pink-800 text-sm sm:text-base">Shareable Link</h4>
                  </div>
                  <p className="text-pink-700 text-xs sm:text-sm">
                    Generate a secure link for clients to view and pay invoices online.
                  </p>
                </div>
              </div>
            </div>

            {/* Automation */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 mb-2 text-sm sm:text-base">Invoice Automation</p>
                  <ul className="text-yellow-700 text-xs sm:text-sm space-y-1">
                    <li>• Set up recurring invoices for regular billing cycles</li>
                    <li>• Automate payment reminders for overdue invoices</li>
                    <li>• Configure automatic thank-you emails upon payment</li>
                    <li>• Use invoice templates for consistent branding</li>
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

export default InvoiceManagementGuide;
