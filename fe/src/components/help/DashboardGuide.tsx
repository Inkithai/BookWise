"use client";

import React from "react";
import {
  BarChart3,
  FileText,
  Users,
  CreditCard,
  TrendingUp,
  Calendar,
  AlertCircle,
  Info,
  CheckCircle,
} from "lucide-react";

const DashboardGuide = () => {
  return (
    <div className="w-full">
      <div className="bg-white shadow rounded-lg mx-2 sm:mx-4 lg:mx-6 mb-4 sm:mb-6 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-teal-50">
          <div className="flex items-center">
            <div className="bg-teal-100 p-2 sm:p-3 rounded-lg">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Guide</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Navigate and understand your main dashboard features
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6 sm:space-y-8">
            {/* Overview Section */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Dashboard Overview</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                The dashboard is your central hub for monitoring your business performance, managing invoices, 
                tracking payments, and accessing key metrics at a glance.
              </p>
              
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                <h4 className="font-medium text-teal-800 mb-3 text-sm sm:text-base">Key Dashboard Features</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-teal-700 text-xs sm:text-sm">
                  <li className="flex items-center"><BarChart3 className="h-4 w-4 mr-2" /> Revenue analytics</li>
                  <li className="flex items-center"><FileText className="h-4 w-4 mr-2" /> Invoice status overview</li>
                  <li className="flex items-center"><Users className="h-4 w-4 mr-2" /> Client activity tracking</li>
                  <li className="flex items-center"><CreditCard className="h-4 w-4 mr-2" /> Payment monitoring</li>
                  <li className="flex items-center"><TrendingUp className="h-4 w-4 mr-2" /> Performance metrics</li>
                  <li className="flex items-center"><Calendar className="h-4 w-4 mr-2" /> Upcoming deadlines</li>
                </ul>
              </div>
            </div>

            {/* Dashboard Sections */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Dashboard Sections</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start">
                    <TrendingUp className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Revenue Overview</h4>
                      <p className="text-green-700 text-xs sm:text-sm">
                        Track your total revenue, monthly income, and payment trends. View graphical representations 
                        of your financial performance over time.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <FileText className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Invoice Status</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Monitor the status of all your invoices: draft, sent, viewed, paid, or overdue. 
                        Quick access to invoice management actions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <Users className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Client Activity</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        View recent client interactions, new client registrations, and active client count. 
                        Access client profiles directly from the dashboard.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <CreditCard className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Payment Tracking</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Track incoming payments, pending payments, and overdue amounts. 
                        Receive notifications for payment updates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Quick Actions</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Perform common tasks directly from the dashboard with our quick action buttons.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm sm:text-base">Create Invoice</h4>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Quickly create a new invoice and send it to your client.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm sm:text-base">Add Client</h4>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Add a new client to your database and start invoicing.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm sm:text-base">Send Reminder</h4>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Send payment reminders to clients with overdue invoices.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm sm:text-base">View Reports</h4>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Access detailed reports and analytics for your business.
                  </p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 mb-2 text-sm sm:text-base">Pro Tips</p>
                  <ul className="text-yellow-700 text-xs sm:text-sm space-y-1">
                    <li>• Customize your dashboard widgets to show the metrics that matter most to you</li>
                    <li>• Set up alerts for overdue payments and important deadlines</li>
                    <li>• Use the date filter to view specific time periods for your analytics</li>
                    <li>• Export dashboard data for further analysis in spreadsheet applications</li>
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

export default DashboardGuide;
