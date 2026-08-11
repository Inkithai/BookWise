import { Mail, Shield, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Information We Collect",
      icon: Shield,
      subsections: [
        {
          subtitle: "1.1 Personal Information",
          content: "We may collect personal information that you voluntarily provide, including: Name, Email address, Phone number, Business name and address, Billing and invoicing details, and Login credentials."
        },
        {
          subtitle: "1.2 Business & Invoice Data",
          content: "When you use our Service, we may collect and store: Customer names and contact details, Invoice details (items, amounts, taxes, notes), Payment status and history, and Business financial records related to invoicing."
        },
        {
          subtitle: "1.3 Usage & Technical Information",
          content: "We may automatically collect: IP address, Device type, operating system, and browser, App usage data and interaction logs, and Cookies and similar tracking technologies (for website)."
        }
      ]
    },
    {
      title: "2. How We Use Your Information",
      icon: Lock,
      subsections: [
        {
          subtitle: null,
          content: "We use the collected information to: Provide, operate, and maintain the Service, Create and manage invoices and customer records, Process payments and transactions, Improve app functionality and user experience, Communicate updates, service-related notices, and support responses, Detect, prevent, and address technical or security issues, and Comply with legal obligations."
        }
      ]
    },
    {
      title: "3. Cookies and Tracking Technologies",
      subsections: [
        {
          subtitle: null,
          content: "Our website may use cookies and similar technologies to: Enhance website performance, Analyze traffic and usage patterns, and Remember user preferences. You can control or disable cookies through your browser settings."
        }
      ]
    },
    {
      title: "4. Data Sharing and Disclosure",
      subsections: [
        {
          subtitle: null,
          content: "We do not sell or rent your personal data. We may share information only: With trusted third-party service providers (hosting, payment processing, analytics) under confidentiality agreements, When required by law, regulation, or legal process, To protect our rights, property, or user safety, and In connection with a business transfer, merger, or acquisition."
        }
      ]
    },
    {
      title: "5. Data Security",
      subsections: [
        {
          subtitle: null,
          content: "We implement reasonable administrative, technical, and physical safeguards to protect your information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure."
        }
      ]
    },
    {
      title: "6. Data Retention",
      subsections: [
        {
          subtitle: null,
          content: "We retain your information only for as long as necessary to: Provide our services, Comply with legal, accounting, or reporting requirements, and Resolve disputes and enforce agreements. You may request deletion of your account and associated data, subject to legal obligations."
        }
      ]
    },
    {
      title: "7. Your Rights",
      subsections: [
        {
          subtitle: null,
          content: "Depending on your jurisdiction, you may have the right to: Access the personal data we hold about you, Request correction or deletion of your data, Object to or restrict certain data processing, and Withdraw consent at any time. To exercise these rights, contact us using the details below."
        }
      ]
    },
    {
      title: "8. Third-Party Links",
      subsections: [
        {
          subtitle: null,
          content: "Our Service may contain links to third-party websites or services. We are not responsible for the privacy practices of those third parties."
        }
      ]
    },
    {
      title: "9. Children's Privacy",
      subsections: [
        {
          subtitle: null,
          content: "BookWise Invoicing is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from children."
        }
      ]
    },
    {
      title: "10. Changes to This Privacy Policy",
      subsections: [
        {
          subtitle: null,
          content: "We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. Continued use of the Service after changes constitutes acceptance of the revised policy."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b-4" style={{ backgroundColor: '#0F766E', borderColor: '#0F766E' }}>
        <div className="max-w-5xl mx-auto px-8 py-14">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg px-2 py-1">
              <ArrowLeft className="w-5 h-5" />
         Back to Home
            </Link>
           
          </div>
          <h1 className="text-5xl font-bold text-white">Privacy Policy</h1>
          <p className="text-gray-200 mt-3 text-lg">BookWise Invoicing</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-8 py-16">
        {/* Introduction */}
        <div className="mb-16 border-l-4 pl-8 bg-white p-8 rounded-lg" style={{ borderColor: '#0F766E' }}>
          <p className="text-gray-700 leading-relaxed mb-6 text-lg">
            BookWise Invoicing ("BookWise," "we," "our," or "us") respects your privacy and is committed to protecting it through this Privacy Policy. This policy explains how we collect, use, disclose, and safeguard your information when you use our invoicing application and website (collectively, the "Service").
          </p>
          <p className="text-gray-800 leading-relaxed text-lg font-semibold">
            By accessing or using BookWise Invoicing, you agree to the collection and use of information in accordance with this Privacy Policy.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={idx} className="group">
                <div className="flex items-start gap-4 mb-6">
                  {Icon && (
                    <div className="p-3 rounded-lg group-hover:shadow-lg transition-all flex-shrink-0" style={{ backgroundColor: '#0F766E' }}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <h2 className="text-3xl font-bold text-black mt-1">{section.title}</h2>
                </div>
                
                <div className="space-y-6 ml-0">
                  {section.subsections.map((subsection, subIdx) => (
                    <div key={subIdx} className="bg-white p-8 rounded-lg border border-gray-300 hover:border-gray-400 hover:shadow-md transition-all">
                      {subsection.subtitle && (
                        <h3 className="text-xl font-bold text-black mb-4">{subsection.subtitle}</h3>
                      )}
                      <p className="text-gray-700 leading-relaxed text-base">{subsection.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Section */}
        <div className="mt-20 pt-16 border-t-2 border-gray-300">
          <div className="flex items-start gap-4 mb-8">
            <div className="p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: '#0F766E' }}>
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-black mt-1">11. Contact Us</h2>
          </div>
          
          <p className="text-gray-700 leading-relaxed text-lg mb-8">
            If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
          </p>
          
          <div className="text-white rounded-lg p-8 border-2" style={{ backgroundColor: '#0F766E', borderColor: '#0F766E' }}>
            <p className="text-xl font-semibold mb-3">BookWise Invoicing</p>
            <a 
              href="mailto:support@bookwise.lk" 
              className="text-gray-100 hover:text-white hover:underline inline-flex items-center gap-2 text-lg transition-colors"
            >
              <Mail className="w-5 h-5" />
              support@bookwise.lk
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-16 pt-8 border-t border-gray-300 text-center">
          <p className="text-gray-600 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}