"use client";

import React from "react";
import {
  BookOpen,
  FileText,
  PenTool,
  CheckCircle,
  Clock,
  AlertCircle,
  Info,
  Link,
  Shield,
  Send,
} from "lucide-react";

const DocusignIntegrationGuide = () => {
  return (
    <div className="w-full">
      <div className="bg-white shadow rounded-lg mx-2 sm:mx-4 lg:mx-6 mb-4 sm:mb-6 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-teal-50">
          <div className="flex items-center">
            <div className="bg-teal-100 p-2 sm:p-3 rounded-lg">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Docusign Integration Guide</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Setup and use Docusign for document signing and contract management
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6 sm:space-y-8">
            {/* Overview */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Integration Overview</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Seamlessly integrate Docusign with BookWise to send, sign, and manage documents 
                directly from your invoicing platform.
              </p>
              
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200 mb-4">
                <h4 className="font-medium text-teal-800 mb-3 text-sm sm:text-base">Key Benefits</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-teal-700 text-xs sm:text-sm">
                  <li className="flex items-center"><Send className="h-4 w-4 mr-2" /> Send contracts directly from invoices</li>
                  <li className="flex items-center"><PenTool className="h-4 w-4 mr-2" /> Electronic signatures</li>
                  <li className="flex items-center"><Shield className="h-4 w-4 mr-2" /> Secure document storage</li>
                  <li className="flex items-center"><Clock className="h-4 w-4 mr-2" /> Real-time status tracking</li>
                </ul>
              </div>
            </div>

            {/* Setup Process */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Setup Process</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Connect your Docusign account to BookWise in just a few simple steps.
              </p>
              
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200 mb-4">
                <h4 className="font-medium text-teal-800 mb-3 text-sm sm:text-base">Connection Steps</h4>
                <ol className="list-decimal list-inside space-y-2 text-teal-700 text-xs sm:text-sm">
                  <li>Navigate to Settings &gt; Integrations &gt; Docusign</li>
                  <li>Click &quot;Connect Docusign Account&quot;</li>
                  <li>Authorize BookWise to access your Docusign account</li>
                  <li>Configure default signing settings and templates</li>
                  <li>Test the integration with a sample document</li>
                </ol>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">API Key Setup</h4>
                  <p className="text-green-700 text-xs sm:text-sm">
                    Enter your Docusign API key or use OAuth for secure authentication.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Template Configuration</h4>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Import Docusign templates or create new ones within BookWise.
                  </p>
                </div>
              </div>
            </div>

            {/* Sending Documents */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Sending Documents for Signature</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Send contracts, agreements, and other documents for electronic signature directly from your workflow.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <FileText className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">From Invoice</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Attach a contract to any invoice and send it for signature before or after payment.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start">
                    <Send className="h-5 w-5 text-teal-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Direct Send</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">
                        Send documents directly to clients from the CRM or client management section.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Status */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Document Status Tracking</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Monitor the status of all your sent documents in real-time.
              </p>
              
              <div className="space-y-3">
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-yellow-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-yellow-800 text-sm sm:text-base">Sent</h4>
                      <p className="text-yellow-700 text-xs sm:text-sm">Document has been sent to recipient</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-center">
                    <PenTool className="h-5 w-5 text-teal-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-teal-800 text-sm sm:text-base">In Progress</h4>
                      <p className="text-teal-700 text-xs sm:text-sm">Recipient is viewing or signing the document</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-green-800 text-sm sm:text-base">Completed</h4>
                      <p className="text-green-700 text-xs sm:text-sm">Document has been fully signed and executed</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-red-800 text-sm sm:text-base">Declined/Expired</h4>
                      <p className="text-red-700 text-xs sm:text-sm">Document was declined or signing period expired</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Security & Compliance</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Your documents are protected with enterprise-grade security and compliance standards.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Encryption</h4>
                  <p className="text-green-700 text-xs sm:text-sm">
                    All documents are encrypted in transit and at rest using AES-256 encryption.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Audit Trail</h4>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Complete audit trail for all document activities and signature events.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">Authentication</h4>
                  <p className="text-teal-700 text-xs sm:text-sm">
                    Multi-factor authentication options for signers to verify identity.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2 text-sm sm:text-base">Compliance</h4>
                  <p className="text-amber-700 text-xs sm:text-sm">
                    Compliant with eIDAS, ESIGN Act, and other electronic signature regulations.
                  </p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 mb-2 text-sm sm:text-base">Best Practices</p>
                  <ul className="text-yellow-700 text-xs sm:text-sm space-y-1">
                    <li>• Use templates for frequently sent documents to save time</li>
                    <li>• Set automatic reminders for documents awaiting signature</li>
                    <li>• Configure signing order for multi-signer documents</li>
                    <li>• Enable notifications to stay updated on document status changes</li>
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

export default DocusignIntegrationGuide;
