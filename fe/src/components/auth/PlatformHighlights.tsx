'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  FileText,
  ReceiptText,
  Landmark,
  Wallet,
  BarChart3,
  Coins,
  Users,
  Percent,
  RefreshCw,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

/**
 * PlatformHighlights
 *
 * Compact, teal-themed grid of the accounting capabilities of the platform.
 * Replaces the legacy product-branded marketing grid previously shown here.
 *
 * `tone="dark"`  → for use on the teal brand panel (white on translucent)
 * `tone="light"` → for use on a white/slate background
 */

type Tone = 'dark' | 'light';

interface Capability {
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
}

const capabilities: Capability[] = [
  {
    title: 'General Ledger',
    description: 'A balanced double-entry ledger behind every transaction',
    features: [
      'Seeded, editable chart of accounts',
      'Automatic double-entry journals',
      'Period locking and audit trail',
      'Drill down from report to entry',
    ],
    icon: <BookOpen className="h-6 w-6" />,
  },
  {
    title: 'Invoicing & AR',
    description: 'Issue invoices that post straight to receivables',
    features: [
      'Unlimited invoices and quotations',
      'Automatic numbering and status tracking',
      'Aged receivables at a glance',
      'Send, remind and reconcile in one place',
    ],
    icon: <FileText className="h-6 w-6" />,
  },
  {
    title: 'Bills & AP',
    description: 'Track what you owe and when it is due',
    features: [
      'Supplier bills and credit notes',
      'Purchase orders converted to bills',
      'Payment scheduling',
      'Aged payables reporting',
    ],
    icon: <ReceiptText className="h-6 w-6" />,
  },
  {
    title: 'Bank Reconciliation',
    description: 'Match statement lines to your books',
    features: [
      'Import statements in seconds',
      'Suggested matches for every line',
      'Split and part-payment handling',
      'Reconciliation status per account',
    ],
    icon: <Landmark className="h-6 w-6" />,
  },
  {
    title: 'Expenses',
    description: 'Capture spend with receipts attached',
    features: [
      'Categorised expense claims',
      'Receipt attachments',
      'Approval workflow',
      'Reimbursement tracking',
    ],
    icon: <Wallet className="h-6 w-6" />,
  },
  {
    title: 'Financial Reports',
    description: 'Trial balance, P&L and balance sheet on demand',
    features: [
      'Profit & loss by period',
      'Balance sheet and trial balance',
      'Cash flow overview',
      'Export to PDF or spreadsheet',
    ],
    icon: <BarChart3 className="h-6 w-6" />,
  },
  {
    title: 'Multi-currency',
    description: 'Trade and report across currencies',
    features: [
      'Bill clients in their currency',
      'Exchange-rate aware postings',
      'Realised gain and loss tracking',
      'Consolidated base-currency reporting',
    ],
    icon: <Coins className="h-6 w-6" />,
  },
  {
    title: 'Team & Roles',
    description: 'Give everyone exactly the access they need',
    features: [
      'Granular role-based permissions',
      'Unlimited team members',
      'Full activity log',
      'Per-entity access control',
    ],
    icon: <Users className="h-6 w-6" />,
  },
  {
    title: 'Tax & VAT',
    description: 'Tax handled as part of the posting, not after it',
    features: [
      'Configurable tax rates',
      'Line-level and document-level tax',
      'Tax summary per period',
      'Ready-to-file figures',
    ],
    icon: <Percent className="h-6 w-6" />,
  },
  {
    title: 'Recurring Billing',
    description: 'Set a schedule and let it run',
    features: [
      'Recurring invoices and statements',
      'Flexible billing cycles',
      'Automatic generation and delivery',
      'Subscription management',
    ],
    icon: <RefreshCw className="h-6 w-6" />,
  },
  {
    title: 'Online Payments',
    description: 'Get paid faster, reconciled automatically',
    features: [
      'Card and bank transfer options',
      'Payment links on every invoice',
      'Part payments and installments',
      'Payments matched to the ledger',
    ],
    icon: <CreditCard className="h-6 w-6" />,
  },
  {
    title: 'Multi-entity',
    description: 'Separate books for every business you run',
    features: [
      'Fully isolated tenant data',
      'Switch entities in one click',
      'Per-entity branding',
      'Group-level overview',
    ],
    icon: <ShieldCheck className="h-6 w-6" />,
  },
];

const useOutsideClick = <T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T | null>,
  callback: () => void
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [ref, callback]);
};

const CloseIcon = () => (
  <motion.svg
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.05 } }}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-teal-700"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M18 6l-12 12" />
    <path d="M6 6l12 12" />
  </motion.svg>
);

interface PlatformHighlightsProps {
  tone?: Tone;
  title?: string;
  subtitle?: string;
  /** Limit how many capability tiles are rendered. */
  limit?: number;
  className?: string;
}

export default function PlatformHighlights({
  tone = 'light',
  title = 'Everything your books need',
  subtitle = 'Select a capability to see what it covers',
  limit,
  className = '',
}: PlatformHighlightsProps) {
  const [active, setActive] = useState<Capability | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const items = typeof limit === 'number' ? capabilities.slice(0, limit) : capabilities;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setActive(null);
    }
    if (active) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  useOutsideClick(modalRef, () => setActive(null));

  const isDark = tone === 'dark';

  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const subtitleClass = isDark ? 'text-teal-50/80' : 'text-slate-500';
  const tileClass = isDark
    ? 'border-white/20 bg-white/5 hover:bg-white/15 text-white'
    : 'border-teal-100 bg-white hover:border-teal-300 hover:bg-teal-50/60 text-slate-900';
  const iconClass = isDark ? 'text-teal-100' : 'text-teal-600';

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 h-full w-full bg-slate-900/40 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 z-[100] grid place-items-center">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-4 top-4 z-50 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-teal-50"
              onClick={() => setActive(null)}
              aria-label="Close"
            >
              <CloseIcon />
            </motion.button>

            <motion.div
              ref={modalRef}
              className="mx-4 flex h-full w-full max-w-[500px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl md:h-fit md:max-h-[80%]"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex h-28 w-full items-center justify-center border-b border-teal-100 bg-teal-50">
                <div className="text-teal-700">{active.icon}</div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <h3 className="mb-2 text-xl font-bold text-slate-900">{active.title}</h3>
                  <p className="text-sm text-slate-600">{active.description}</p>

                  <div className="mt-5 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                      What&apos;s included
                    </h4>
                    <ul className="space-y-2">
                      {active.features.map((feature, index) => (
                        <motion.li
                          key={feature}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.06 }}
                          className="flex items-start gap-2 text-sm text-slate-700"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-500" />
                          <span className="flex-1">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <div className={`w-full ${className}`}>
        <header className="mb-4 text-center">
          <h2 className={`text-lg font-semibold ${headingClass}`}>{title}</h2>
          <p className={`mt-1 text-xs ${subtitleClass}`}>{subtitle}</p>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <motion.button
              key={item.title}
              type="button"
              onClick={() => setActive(item)}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={`group flex min-h-[86px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-2.5 text-center transition-all ${tileClass}`}
            >
              <span className={`transition-transform duration-200 group-hover:scale-110 ${iconClass}`}>
                {item.icon}
              </span>
              <span className="text-[11px] font-semibold leading-tight">{item.title}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );
}
