"use client";

import React from "react";
import {
  MessageSquare,
  Users,
  Phone,
  Mail,
  Calendar,
  FileText,
  TrendingUp,
  Info,
  Target,
  Activity,
} from "lucide-react";

const CRMFeaturesGuide = () => {
  return (
    <div className="w-full">
      <div className="bg-white shadow rounded-lg mx-2 sm:mx-4 lg:mx-6 mb-4 sm:mb-6 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center">
            <div className="bg-amber-100 p-2 sm:p-3 rounded-lg">
              <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">CRM Features Guide</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Utilize CRM tools to manage customer relationships and grow your business
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6 sm:space-y-8">
            {/* Communication Tracking */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Communication Tracking</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Keep a complete record of all interactions with your clients for better relationship management.
              </p>
              
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4">
                <h4 className="font-medium text-amber-800 mb-3 text-sm sm:text-base">Communication Channels</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-amber-700 text-xs sm:text-sm">
                  <li className="flex items-center"><Mail className="h-4 w-4 mr-2" /> Email communications</li>
                  <li className="flex items-center"><Phone className="h-4 w-4 mr-2" /> Phone call logs</li>
                  <li className="flex items-center"><MessageSquare className="h-4 w-4 mr-2" /> Chat messages</li>
                  <li className="flex items-center"><FileText className="h-4 w-4 mr-2" /> Document sharing</li>
                </ul>
              </div>
            </div>

            {/* Task Management */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Task Management</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Create and manage tasks related to client interactions and follow-ups.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Follow-up Reminders</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Set reminders for follow-up calls, meetings, and important client interactions.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <Target className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Task Prioritization</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Prioritize tasks based on urgency and importance to manage your workflow effectively.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Management */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Pipeline Management</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Track your sales pipeline and manage deals through various stages.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Lead Tracking</h4>
                  <p className="text-green-700 text-xs sm:text-sm">
                    Capture and track leads from various sources and convert them into clients.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Deal Stages</h4>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Visualize deals through custom stages from lead to closed-won.
                  </p>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">CRM Analytics</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Gain insights into your customer relationships and business performance.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <TrendingUp className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Performance Metrics</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Track conversion rates, deal velocity, and customer lifetime value.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <div className="flex items-start">
                    <Activity className="h-5 w-5 text-pink-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-pink-800 mb-2 text-sm sm:text-base">Activity Reports</h4>
                      <p className="text-pink-700 text-xs sm:text-sm">
                        Generate reports on team activities, client engagement, and communication patterns.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Integration */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 mb-2 text-sm sm:text-base">Docusign Integration</p>
                  <ul className="text-yellow-700 text-xs sm:text-sm space-y-1">
                    <li>• Send contracts and agreements directly through CRM</li>
                    <li>• Track document signing status within client profiles</li>
                    <li>• Automate follow-ups based on document status</li>
                    <li>• Store signed documents securely in client records</li>
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

export default CRMFeaturesGuide;
