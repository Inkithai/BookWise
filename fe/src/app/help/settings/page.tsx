"use client";

import React, { Suspense, useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/help/Sidebar";
import SettingsGuide from "@/components/help/SettingsGuide";
import Footer from "@/components/landing/Footer";

const SettingsHelpPage = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile hamburger menu button */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <button
          onClick={toggleMobileSidebar}
          className="flex items-center justify-center w-10 h-10 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Toggle sidebar"
        >
          {isMobileSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`
          lg:hidden fixed inset-y-0 left-0 z-40 w-full bg-white transform transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile header for sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Help Topics</h2>
          <button
            onClick={closeMobileSidebar}
            className="flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar component for mobile */}
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <Sidebar isOpen={true} onLinkClick={closeMobileSidebar} />
        </div>
      </div>

      {/* Desktop Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden lg:block w-64 flex-shrink-0 sticky top-0 h-fit max-h-screen overflow-y-auto overflow-x-hidden">
          <Sidebar isOpen={true} />
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6 lg:px-8">
          <SettingsGuide />
        </div>
      </div>

      {/* Footer */}
      <Suspense>
        <Footer />
      </Suspense>
    </div>
  );
};

export default SettingsHelpPage;
