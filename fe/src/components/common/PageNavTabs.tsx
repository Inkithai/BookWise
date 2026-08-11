'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LucideIcon, Menu } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export interface PageNavTab {
    id?: string;
    name: string;
    href?: string;
    icon?: keyof typeof LucideIcons;
    color?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'default';
    onClick?: () => void;
}

export const usersTabs: PageNavTab[] = [
    { name: 'Users', href: '/users', icon: 'Users', color: 'blue' },
    { name: 'Roles & Permissions', href: '/roles', icon: 'Key', color: 'purple' }
];

export const settingsTabs: PageNavTab[] = [
    { name: 'Profile', href: '/profile', icon: 'User', color: 'blue' },
    { name: 'Settings', href: '/settings', icon: 'Settings', color: 'purple' },
    { name: 'Pricing', href: '/upgrade-plan', icon: 'DollarSign', color: 'emerald' },
    { name: 'Customer Support', href: '/customer-support', icon: 'LifeBuoy', color: 'amber' }
];

export const analyticsTabs: PageNavTab[] = [
    { name: 'Admin Dashboard', href: '/analytics', icon: 'Activity', color: 'blue' },
    { name: 'Google Analytics', href: '/google-analytics', icon: 'BarChart', color: 'purple' }
];

interface PageHeaderTabsProps {
    title?: string;
    description?: string;
    tabs: PageNavTab[];
    mobileMenuOpen?: boolean;
    onMobileMenuToggle?: () => void;
    actions?: React.ReactNode;
    activeTabId?: string;
}

export function PageHeaderTabs({
    title,
    description,
    tabs,
    mobileMenuOpen,
    onMobileMenuToggle,
    actions,
    activeTabId
}: PageHeaderTabsProps) {
    const pathname = usePathname();
    const showHeaderRow = Boolean(title || description || actions || onMobileMenuToggle);

    return (
        <header className="w-full px-6 pt-6">
            {showHeaderRow && (
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={onMobileMenuToggle}
                            className="lg:hidden p-2 -ml-2 hover:bg-sidebar-accent rounded-lg transition-colors"
                        >
                            <Menu className="w-5 h-5 text-sidebar-foreground" />
                        </button>
                        <div>
                            {title && <h1 className="text-4xl font-bold text-primary dark:text-white">{title}</h1>}
                            {description && <p className="text-gray-600 dark:text-gray-400 mt-2">{description}</p>}
                        </div>
                    </div>
                    {actions && <div className="flex items-center gap-3">{actions}</div>}
                </div>
            )}
            {tabs && tabs.length > 0 && (
                <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-1.5 shadow-sm backdrop-blur-sm">
                    <nav className="flex gap-1.5 overflow-x-auto scrollbar-hide no-scrollbar">
                        {tabs.map((tab) => {
                            const isActive = tab.href
                                ? pathname.startsWith(tab.href)
                                : activeTabId === tab.id;
                            const Icon = tab.icon ? (LucideIcons[tab.icon] as LucideIcon) : null;

                            const activeClass = isActive
                                ? 'bg-white text-primary border border-primary/20 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900';

                            const className = cn(
                                'group flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 whitespace-nowrap',
                                activeClass
                            );

                            if (tab.href) {
                                return (
                                    <Link key={tab.href} href={tab.href} className={className}>
                                        {Icon && <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />}
                                        {tab.name}
                                    </Link>
                                );
                            }

                            return (
                                <button
                                    key={tab.id || tab.name}
                                    type="button"
                                    onClick={tab.onClick}
                                    className={className}
                                >
                                    {Icon && <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />}
                                    {tab.name}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            )}
        </header>
    );
}
