import React from "react";
import {
  Home,
  FileText,
  Users,
  Settings,
  CreditCard,
  BarChart3,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

interface SidebarProps {
  isOpen: boolean;
  onLinkClick?: () => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: {
    title: string;
    path?: string;
  }[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onLinkClick }) => {
  const menuItems: MenuItem[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <Home className="h-5 w-5" />,
      items: [{ title: "Getting Started", path: "/help/getting-started" }],
    },
    {
      id: "dashboard",
      title: "Dashboard",
      icon: <BarChart3 className="h-5 w-5" />,
      items: [{ title: "Dashboard", path: "/help/dashboard" }],
    },
    {
      id: "invoice-management",
      title: "Invoice Management",
      icon: <FileText className="h-5 w-5" />,
      items: [{ title: "Invoice Management", path: "/help/invoice-management" }],
    },
    {
      id: "client-management",
      title: "Client Management",
      icon: <Users className="h-5 w-5" />,
      items: [{ title: "Client Management", path: "/help/client-management" }],
    },
    {
      id: "payment-tracking",
      title: "Payment Tracking",
      icon: <CreditCard className="h-5 w-5" />,
      items: [{ title: "Payment Tracking", path: "/help/payment-tracking" }],
    },
    {
      id: "crm-features",
      title: "CRM Features",
      icon: <MessageSquare className="h-5 w-5" />,
      items: [{ title: "CRM Features", path: "/help/crm-features" }],
    },
    {
      id: "settings",
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      items: [{ title: "Settings", path: "/help/settings" }],
    },
    {
      id: "docusign-integration",
      title: "Docusign Integration",
      icon: <BookOpen className="h-5 w-5" />,
      items: [{ title: "Docusign Integration", path: "/help/docusign-integration" }],
    },
  ];

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <aside
      className={`${
        isOpen ? "block" : "hidden"
      } lg:w-72 bg-gray-50 lg:border-r border-gray-200 h-full lg:h-screen lg:sticky lg:top-0 overflow-y-auto overflow-x-hidden`}
    >
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((section) => (
            <Link
              key={section.id}
              href={section.items[0]?.path || "#"}
              onClick={handleLinkClick}
              className="w-full flex items-center px-3 py-3 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-teal-600 transition-colors"
            >
              <span className="text-gray-500 mr-3">{section.icon}</span>
              {section.title}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
