"use client";

import React from "react";
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Building,
  MapPin,
  Info,
  Search,
  Edit,
  Trash2,
  FileText,
  CreditCard,
} from "lucide-react";

const ClientManagementGuide = () => {
  return (
    <div className="w-full">
      <div className="bg-white shadow rounded-lg mx-2 sm:mx-4 lg:mx-6 mb-4 sm:mb-6 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-teal-50">
          <div className="flex items-center">
            <div className="bg-teal-100 p-2 sm:p-3 rounded-lg">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Client Management Guide</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Manage your clients and build strong customer relationships
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6 sm:space-y-8">
            {/* Adding Clients */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Adding New Clients</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Build your client database by adding new clients with comprehensive contact and business information.
              </p>
              
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200 mb-4">
                <h4 className="font-medium text-teal-800 mb-3 text-sm sm:text-base">Required Client Information</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-teal-700 text-xs sm:text-sm">
                  <li className="flex items-center"><UserPlus className="h-4 w-4 mr-2" /> Client name (individual or company)</li>
                  <li className="flex items-center"><Mail className="h-4 w-4 mr-2" /> Email address</li>
                  <li className="flex items-center"><Phone className="h-4 w-4 mr-2" /> Phone number</li>
                  <li className="flex items-center"><Building className="h-4 w-4 mr-2" /> Company name (if applicable)</li>
                  <li className="flex items-center"><MapPin className="h-4 w-4 mr-2" /> Billing address</li>
                  <li className="flex items-center"><Users className="h-4 w-4 mr-2" /> Contact person details</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Individual Clients</h4>
                  <p className="text-green-700 text-xs sm:text-sm">
                    Add individual clients with personal contact details for freelance or service-based businesses.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Business Clients</h4>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Add business clients with company information for B2B invoicing and corporate accounts.
                  </p>
                </div>
              </div>
            </div>

            {/* Client Organization */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Organizing Clients</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Keep your client database organized with tags, groups, and custom fields.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <Users className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Client Groups</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Organize clients into groups based on industry, location, or service type for easier management.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <Search className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Search & Filter</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Quickly find clients using search functionality and filter by various criteria.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Actions */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Client Actions</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Perform various actions on client profiles to manage your relationships effectively.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-center mb-2">
                    <Edit className="h-4 w-4 text-teal-600 mr-2" />
                    <h4 className="font-medium text-teal-800 text-sm sm:text-base">Edit Profile</h4>
                  </div>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Update client information, contact details, and billing addresses.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center mb-2">
                    <FileText className="h-4 w-4 text-green-600 mr-2" />
                    <h4 className="font-medium text-green-800 text-sm sm:text-base">View Invoices</h4>
                  </div>
                  <p className="text-green-700 text-xs sm:text-sm">
                    Access all invoices associated with a specific client.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center mb-2">
                    <CreditCard className="h-4 w-4 text-amber-600 mr-2" />
                    <h4 className="font-medium text-amber-800 text-sm sm:text-base">Payment History</h4>
                  </div>
                  <p className="text-amber-700 text-xs sm:text-sm">
                    Review payment history and track client payment patterns.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center mb-2">
                    <Trash2 className="h-4 w-4 text-red-600 mr-2" />
                    <h4 className="font-medium text-red-800 text-sm sm:text-base">Archive/Delete</h4>
                  </div>
                  <p className="text-red-700 text-xs sm:text-sm">
                    Archive inactive clients or delete client profiles when necessary.
                  </p>
                </div>
              </div>
            </div>

            {/* CRM Features */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 mb-2 text-sm sm:text-base">CRM Integration</p>
                  <ul className="text-yellow-700 text-xs sm:text-sm space-y-1">
                    <li>• Track client interactions and communication history</li>
                    <li>• Set reminders for follow-ups and important dates</li>
                    <li>• Add notes and documents to client profiles</li>
                    <li>• Monitor client engagement and satisfaction levels</li>
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

export default ClientManagementGuide;
