"use client";

import React from "react";
import {
  Home,
  FileText,
  Users,
  Settings,
  CreditCard,
  BarChart3,
  MessageSquare,
  PlusCircle,
  Clock,
  BookOpen,
} from "lucide-react";
import Footer from "@/components/landing/Footer";

const HelpPage = () => {
  // Dashboard card data
  const helpCards = [
    {
      title: "Getting Started",
      description: "Create user account or Login to existing account",
      icon: <Home className="h-8 w-8" />,
      link: "/help/getting-started",
      color: "bg-green-500",
    },
    {
      title: "Dashboard",
      description: "Navigate and understand your main dashboard",
      icon: <BarChart3 className="h-8 w-8" />,
      link: "/help/dashboard",
      color: "bg-teal-900",
    },
    {
      title: "Invoice Management",
      description: "Create, send, and manage your invoices",
      icon: <FileText className="h-8 w-8" />,
      link: "/help/invoice-management",
      color: "bg-teal-500",
    },
    {
      title: "Client Management",
      description: "Manage your clients and customer relationships",
      icon: <Users className="h-8 w-8" />,
      link: "/help/client-management",
      color: "bg-teal-500",
    },
    {
      title: "Payment Tracking",
      description: "Track payments and manage receivables",
      icon: <CreditCard className="h-8 w-8" />,
      link: "/help/payment-tracking",
      color: "bg-teal-500",
    },
    {
      title: "CRM Features",
      description: "Utilize CRM tools for business growth",
      icon: <MessageSquare className="h-8 w-8" />,
      link: "/help/crm-features",
      color: "bg-amber-500",
    },
    {
      title: "Settings",
      description: "Configure your account and preferences",
      icon: <Settings className="h-8 w-8" />,
      link: "/help/settings",
      color: "bg-pink-500",
    },
    {
      title: "Docusign Integration",
      description: "Setup and use Docusign for document signing",
      icon: <BookOpen className="h-8 w-8" />,
      link: "/help/docusign-integration",
      color: "bg-teal-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Welcome Banner - Responsive */}
        <div className="bg-gradient-to-r from-teal-900 to-teal-900 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                Welcome to the Help Center!
              </h2>
              <p className="opacity-90 text-white text-sm sm:text-base">
                This is your comprehensive guide to using BookWise for invoicing and CRM
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Cards Grid - Responsive layout */}
        {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {helpCards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300"
            >
              <a href={card.link} className="block p-4 sm:p-6">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className={`${card.color} p-2 rounded-lg text-white`}>
                    {React.cloneElement(card.icon, { 
                      className: "h-6 w-6 sm:h-8 sm:w-8" 
                    })}
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  {card.title}
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                  {card.description}
                </p>
              </a>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HelpPage;
