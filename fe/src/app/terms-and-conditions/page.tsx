import { Mail, FileText, Gavel, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function TermsAndConditions() {
    const sections = [
        {
            title: "1. Acceptance of Terms",
            icon: Gavel,
            subsections: [
                {
                    subtitle: null,
                    content: "By accessing or using BookWise Invoicing (\"the Service\"), you agree to be bound by these Terms and Conditions. If you do not agree to all of these terms, do not use the Service."
                }
            ]
        },
        {
            title: "2. User Accounts",
            icon: Shield,
            subsections: [
                {
                    subtitle: "2.1 Registration",
                    content: "To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process."
                },
                {
                    subtitle: "2.2 Account Security",
                    content: "You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account."
                }
            ]
        },
        {
            title: "3. Use of the Service",
            icon: FileText,
            subsections: [
                {
                    subtitle: "3.1 Licensed Access",
                    content: "Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, and revocable license to access and use the Service for your business invoicing needs."
                },
                {
                    subtitle: "3.2 Prohibited Conduct",
                    content: "You agree not to: Use the Service for any illegal purpose; Attempt to gain unauthorized access to our systems; Interfere with or disrupt the integrity or performance of the Service."
                }
            ]
        },
        {
            title: "4. Fees and Payment",
            subsections: [
                {
                    subtitle: null,
                    content: "Certain features of the Service are provided for a fee. You agree to pay all fees associated with your subscription plan. All fees are non-refundable except as required by law."
                }
            ]
        },
        {
            title: "5. Intellectual Property",
            subsections: [
                {
                    subtitle: null,
                    content: "The Service and its original content, features, and functionality are and will remain the exclusive property of BookWise and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent."
                }
            ]
        },
        {
            title: "6. Data and Privacy",
            subsections: [
                {
                    subtitle: null,
                    content: "Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of information as outlined in the Privacy Policy."
                }
            ]
        },
        {
            title: "7. Termination",
            subsections: [
                {
                    subtitle: null,
                    content: "We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms."
                }
            ]
        },
        {
            title: "8. Limitation of Liability",
            subsections: [
                {
                    subtitle: null,
                    content: "In no event shall BookWise, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses."
                }
            ]
        },
        {
            title: "9. Governing Law",
            subsections: [
                {
                    subtitle: null,
                    content: "These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which BookWise operates, without regard to its conflict of law provisions."
                }
            ]
        },
        {
            title: "10. Changes to Terms",
            subsections: [
                {
                    subtitle: null,
                    content: "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days' notice before any new terms take effect. What constitutes a material change will be determined at our sole discretion."
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
                    <h1 className="text-5xl font-bold text-white">Terms & Conditions</h1>
                    <p className="text-gray-200 mt-3 text-lg">BookWise Invoicing</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-8 py-16">
                {/* Introduction */}
                <div className="mb-16 border-l-4 pl-8 bg-white p-8 rounded-lg" style={{ borderColor: '#0F766E' }}>
                    <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                        Welcome to BookWise Invoicing. These Terms and Conditions govern your use of our service. Please read them carefully before using the application.
                    </p>
                    <p className="text-gray-800 leading-relaxed text-lg font-semibold">
                        By using BookWise Invoicing, you agree to comply with and be bound by these Terms and Conditions.
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
                        If you have any questions about these Terms and Conditions, please contact us:
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
