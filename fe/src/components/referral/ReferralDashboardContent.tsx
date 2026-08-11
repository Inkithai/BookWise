"use client";

/**
 * ReferralDashboardContent.tsx
 *
 * Referral Dashboard for the Invoice app.
 * All data is fetched from the BookWise main backend via the
 * referral.service.ts (which uses api-key + email auth headers).
 *
 * Available to all authenticated Invoice users (admin, company owner, sub-user).
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
    Users,
    Copy,
    Check,
    TrendingUp,
    Banknote,
    Gift,
    Clock,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Share2,
    Wallet,
    Edit,
    Link2,
    Users2,
    CreditCard,
    LayoutDashboard,
    Crown,
    BookOpen,
    Mail,
    Facebook,
    Twitter,
    Linkedin,
    MessageCircle,
    Instagram,
    X,
    Upload,
    ChevronLeft,
    ChevronRight,
    Award,
    Menu
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

import {
    getReferralDashboard,
    getReferrals,
    getReferralEarnings,
    getAdminReferralDashboard,
    getGlobalCommissionRate,
    listTeamCommissionRates,
    generateReferralCode,
    updateReferralCode,
    getReferralShareSettings,
    updateReferralShareSettings,
    type ReferralDashboardData,
    type ReferralRecord,
    type ReferralEarningItem,
    type AdminDashboardData,
    type ReferralShareSettings,
} from "@/services/referral.service";
import { usePermissions } from "@/utils/permissions";
import {
    canUseReferralCommission,
    getInvoiceReferralScope,
    filterReferralsForOwnScopeUser,
    mergeReferralRecords,
} from "@/lib/invoice-referral-scope";
import { getInvoiceUserEmail } from "@/lib/invoice-user-email";
import { PageHeaderTabs, PageNavTab } from "@/components/common/PageNavTabs";
import ReferralWithdrawalsSection from "@/components/referral/ReferralWithdrawalsSection";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabType = "overview" | "my-referrals" | "earnings" | "referral-commissions" | "admin" | "referral-settings" | "rules";
interface ReferralPost {
    title: string;
    body: string;
    files: File[];
    imageUrls?: string[];
    removeImages?: boolean;
    removeImageUrls?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getBaseUrl(): string {
    if (typeof window === "undefined") return "";
    return process.env.NEXT_PUBLIC_BOOKWISE_API_URL?.replace(/\/api.*/, "") ||
        "http://127.0.0.1:8000";
}

function getReferralShareBaseUrl(): string {
    if (typeof window === "undefined") return "";
    return (
        process.env.NEXT_PUBLIC_INVOICE_FRONTEND_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        window.location.origin
    );
}

function normalizeReferralImageUrl(url?: string | null): string {
    const raw = String(url || "").trim();
    if (!raw) return "";
    // Keep original URL as primary source; current backend serves images on /api/v1/uploads/...
    return raw;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const MetricCard = ({
    icon: Icon, label, value, sub, accent = "blue",
}: {
    icon: React.ElementType; label: string; value: string | number; sub?: string;
    accent?: "blue" | "green" | "amber" | "purple" | "red";
}) => {
    const accents: Record<string, { bg: string; text: string }> = {
        blue: { bg: "bg-teal-50", text: "text-teal-600" },
        green: { bg: "bg-green-50", text: "text-green-600" },
        amber: { bg: "bg-amber-50", text: "text-amber-600" },
        purple: { bg: "bg-teal-50", text: "text-teal-600" },
        red: { bg: "bg-red-50", text: "text-red-600" },
    };
    return (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg ${accents[accent].bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${accents[accent].text}`} />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
        "paid subscription": "bg-green-50 text-green-700",
        "trial period": "bg-teal-50 text-teal-700",
        inactive: "bg-red-50 text-red-700",
        pending: "bg-amber-50 text-amber-700",
        completed: "bg-green-50 text-green-700",
        rejected: "bg-red-50 text-red-700",
        paid: "bg-green-50 text-green-700",
    };
    const label =
        status === "paid subscription" ? "Paid" :
            status === "trial period" ? "Trial" :
                status.charAt(0).toUpperCase() + status.slice(1);
    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || map.pending}`}>
            {label}
        </span>
    );
};

const SectionCard = ({ title, children, className = "" }: {
    title?: string; children: React.ReactNode; className?: string;
}) => (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
        {title && (
            <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const Loading = ({ message = "Loading…" }: { message?: string }) => (
    <div className="flex items-center justify-center gap-3 py-12">
        <RefreshCw className="w-5 h-5 text-[var(--primary)] animate-spin" />
        <span className="text-sm text-gray-500">{message}</span>
    </div>
);

// ─── Share Platforms ───────────────────────────────────────────────────────────
const PLATFORMS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    email: { label: "Email", icon: Mail, color: "text-teal-600" },
    facebook: { label: "Facebook", icon: Facebook, color: "text-teal-700" },
    twitter: { label: "X (Twitter)", icon: Twitter, color: "text-teal-500" },
    linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-teal-600" },
    whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-green-600" },
    instagram: { label: "Instagram", icon: Instagram, color: "text-pink-500" },
};

function openShare(key: string, post: ReferralPost, code: string) {
    const base = getReferralShareBaseUrl();
    const link = code ? `${base}/auth/register?refercode=${code}` : "";
    const msg = `${post.title}\n\n${post.body}${link ? "\n\n" + link : ""}`;
    if (key === "instagram") { navigator.clipboard.writeText(msg); return; }
    const urls: Record<string, string> = {
        email: `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(msg)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link || base)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(link)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(msg)}`,
    };
    if (urls[key]) window.open(urls[key], "_blank", "noopener");
}

// ─── Referral Code Box ────────────────────────────────────────────────────────
const ReferralCodeBox = ({
    code, onCodeChange, onGenerate, post, onShareClick,
}: {
    code: string;
    onCodeChange: (c: string) => Promise<void>;
    onGenerate?: () => Promise<void>;
    post: ReferralPost;
    onShareClick: () => void;
}) => {
    const [copied, setCopied] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(code);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const base = getReferralShareBaseUrl();
    const referralLink = code ? `${base}/auth/register?refercode=${code}` : "";

    useEffect(() => { setEditValue(code); }, [code]);

    const handleCopyCode = () => { navigator.clipboard.writeText(code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); };
    const handleCopyLink = () => { if (referralLink) { navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
    const handleSave = async () => {
        const v = editValue.trim().toUpperCase();
        if (!v || v === code) { setIsEditing(false); return; }
        if (!/^[A-Z0-9]+$/.test(v)) { setError("Only letters and numbers allowed."); return; }
        setError(""); setSaving(true);
        try { await onCodeChange(v); setIsEditing(false); }
        catch (e: any) { setError(e?.message || "Code may already exist."); }
        finally { setSaving(false); }
    };
    const handleGenerate = async () => {
        if (!onGenerate) return;
        setGenerating(true);
        setError("");
        try {
            await onGenerate();
        } catch (e: unknown) {
            const message =
                e instanceof Error ? e.message : "Failed to generate referral code.";
            setError(message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <SectionCard title="Your Referral Code">
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Code</label>
                    <div className="flex items-center gap-2 mt-1.5">
                        {!code && onGenerate ? (
                            <div className="flex-1 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">No code yet</span>
                                    <button onClick={handleGenerate} disabled={generating}
                                        className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                                        {generating ? "Generating…" : "Generate Code"}
                                    </button>
                                </div>
                                {error && <p className="text-xs text-red-600">{error}</p>}
                            </div>
                        ) : isEditing ? (
                            <div className="flex-1">
                                <input type="text" value={editValue} autoFocus
                                    onChange={e => { setEditValue(e.target.value.toUpperCase()); setError(""); }}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-lg font-mono font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                                {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                            </div>
                        ) : (
                            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                                <span className="text-lg font-mono font-semibold text-gray-900">{code}</span>
                            </div>
                        )}
                        {code && isEditing ? (
                            <>
                                <button onClick={handleSave} disabled={saving}
                                    className="p-2.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50">
                                    {saving ? "…" : <Check className="w-4 h-4" />}
                                </button>
                                <button onClick={() => { setIsEditing(false); setEditValue(code); setError(""); }}
                                    className="p-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </>
                        ) : code ? (
                            <>
                                <button onClick={() => setIsEditing(true)}
                                    className="p-2.5 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors">
                                    <Edit className="w-4 h-4 text-gray-600" />
                                </button>
                                <button onClick={handleCopyCode}
                                    className="p-2.5 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors">
                                    {codeCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                                </button>
                            </>
                        ) : null}
                    </div>
                </div>
                {referralLink && (
                    <>
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Referral Link</label>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 overflow-hidden">
                                    <span className="text-sm text-gray-600 truncate block">{referralLink}</span>
                                </div>
                                <button onClick={handleCopyLink}
                                    className="p-2.5 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity">
                                    {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <button onClick={onShareClick}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">
                            <Share2 className="w-4 h-4" />
                            Share on Social
                        </button>
                    </>
                )}
            </div>
        </SectionCard>
    );
};

// ─── Referred Users Table ─────────────────────────────────────────────────────
const ReferredUsersTable = ({ records }: { records: ReferralRecord[] }) => {
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const total = Math.ceil(records.length / size);
    const paginated = records.slice((page - 1) * size, page * size);

    useEffect(() => { setPage(1); }, [size, records.length]);

    const formatDate = (s: string | null | undefined) =>
        s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <SectionCard title="Referred Users">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            {["Name", "Email", "Status", "Referred By", "Registered"].map(h => (
                                <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 pr-4 first:pl-0 whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginated.length === 0 ? (
                            <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No referrals found</td></tr>
                        ) : paginated.map(r => {
                            const isActive = r.trial_ends_at && new Date(r.trial_ends_at) > new Date();
                            const status = isActive ? "trial period" : r.plan_type === "paid" ? "paid subscription" : "pending";
                            return (
                                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-semibold text-[var(--primary)]">
                                                {(r.referred_user?.full_name || "?")[0].toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-900">{r.referred_user?.full_name || "—"}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4 text-gray-500">{r.referred_user?.email || "—"}</td>
                                    <td className="py-3 pr-4"><StatusBadge status={status} /></td>
                                    <td className="py-3 pr-4 text-gray-500">{r.code_owner?.full_name || "—"}</td>
                                    <td className="py-3 text-gray-500">{formatDate(r.registered_at)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {records.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Show</span>
                        <select title="Page size" value={size} onChange={e => setSize(+e.target.value)}
                            className="px-2 py-1 rounded border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]">
                            {[10, 25, 50].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span>entries · {records.length} total</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-gray-600 px-3">Page {page} of {Math.max(1, total)}</span>
                        <button onClick={() => setPage(p => Math.min(total, p + 1))} disabled={page >= total}
                            className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </SectionCard>
    );
};

// ─── Earnings Table ───────────────────────────────────────────────────────────
const EarningsTable = ({ earnings }: { earnings: ReferralEarningItem[] }) => {
    const formatDate = (s: string | null | undefined) =>
        s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    return (
        <SectionCard title="Earnings History">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            {["Referred User", "Amount", "Status", "Date"].map(h => (
                                <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 pr-4 whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {earnings.length === 0 ? (
                            <tr><td colSpan={4} className="py-8 text-center text-gray-400 text-sm">No earnings yet</td></tr>
                        ) : earnings.map(e => (
                            <tr key={e.id} className="hover:bg-gray-50/50">
                                <td className="py-3 pr-4 font-medium text-gray-900">{e.referred_user?.full_name || "—"}</td>
                                <td className="py-3 pr-4 font-semibold text-green-600">£{Number(e.amount).toFixed(2)}</td>
                                <td className="py-3 pr-4"><StatusBadge status={e.status} /></td>
                                <td className="py-3 text-gray-500">{formatDate(e.paid_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab = ({
    dashboardData, post, onOpenShare, onCodeChange, onGenerate, showAdminSections,
    showReferredUsers, referredUsersRecords,
}: {
    dashboardData: ReferralDashboardData | null;
    post: ReferralPost;
    onOpenShare: () => void;
    onCodeChange: (c: string) => Promise<void>;
    onGenerate?: () => Promise<void>;
    /** Team admins / company owners only — commission rate */
    showAdminSections: boolean;
    /** Team: all recent referrals; non-admin: only when this user was referred */
    showReferredUsers: boolean;
    referredUsersRecords: ReferralRecord[];
}) => {
    const stats = dashboardData?.stats;
    const code = dashboardData?.my_code?.code ?? "";
    const wallet = dashboardData?.wallet;
    const totalEarned = Number(wallet?.total_earned ?? stats?.total_earned ?? 0);
    const pending = Number(stats?.pending ?? 0);
    const balance = Number(wallet?.available_balance ?? Math.max(0, totalEarned - pending));
    const totalWithdrawn = Number(wallet?.total_withdrawn ?? 0);
    const commissionRate = dashboardData?.your_commission_rate;
    const commissionIsCustom = dashboardData?.commission_rate_is_custom;
    return (
        <div className="space-y-6">
            {showAdminSections && (
                <SectionCard title="Your Commission Rate">
                    {commissionRate == null ? (
                        <p className="text-sm text-gray-500">Commission rate not configured for your team.</p>
                    ) : (
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="text-3xl font-semibold text-[var(--primary)]">{commissionRate}%</p>
                            {commissionIsCustom && (
                                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                                    Custom rate
                                </span>
                            )}
                            <p className="text-sm text-gray-500 w-full">
                                Percentage applied to referral earnings for your team.
                            </p>
                        </div>
                    )}
                </SectionCard>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard icon={Users} label="Total Referrals" value={stats?.total_referrals ?? 0} accent="blue" />
                <MetricCard icon={Clock} label="In Trial" value={stats?.in_trial ?? 0} accent="amber" />
                <MetricCard icon={CheckCircle2} label="Trial Ended" value={stats?.trial_ended ?? 0} accent="green" />
            </div>

            {/* Balance summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
                    <p className="text-xs font-medium text-teal-600 mb-1">Total Earned</p>
                    <p className="text-3xl font-semibold text-gray-900">£{totalEarned.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">All referral earnings to date</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                    <p className="text-xs font-medium text-amber-600 mb-1">Pending</p>
                    <p className="text-3xl font-semibold text-gray-900">£{pending.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting clearance</p>
                </div>
                <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Wallet className="w-3.5 h-3.5 text-green-600" />
                        <p className="text-xs font-medium text-green-600">Balance</p>
                    </div>
                    <p className="text-3xl font-semibold text-gray-900">£{balance.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Available (earned minus pending)</p>
                </div>
                <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
                    <p className="text-xs font-medium text-teal-600 mb-1">Total Withdrawn</p>
                    <p className="text-3xl font-semibold text-gray-900">£{totalWithdrawn.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Completed payouts</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {showReferredUsers && (
                    <div className="lg:col-span-2">
                        <ReferredUsersTable records={referredUsersRecords} />
                    </div>
                )}
                <div className={showReferredUsers ? undefined : "lg:col-span-3"}>
                    <ReferralCodeBox
                        code={code}
                        onCodeChange={onCodeChange}
                        onGenerate={onGenerate}
                        post={post}
                        onShareClick={onOpenShare}
                    />
                </div>
            </div>
        </div>
    );
};

// ─── Referral Settings Tab ────────────────────────────────────────────────────
const ReferralSettingsTab = ({
    post, onPostChange, dashboardData,
}: {
    post: ReferralPost;
    onPostChange: React.Dispatch<React.SetStateAction<ReferralPost>>;
    dashboardData?: ReferralDashboardData | null;
}) => {
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const MAX_FILES = 5;

    const handleSave = async () => {
        setSaving(true); setSaveMsg(null);
        try {
            const payload: any = { share_title: post.title, share_body: post.body };
            if (post.files.length > 0) payload.images = post.files;
            if (post.removeImages) payload.remove_images = true;
            if (post.removeImageUrls?.length) payload.remove_image_urls = post.removeImageUrls;
            const res = await updateReferralShareSettings(payload);
            const urls = Array.isArray((res as any).image_urls)
                ? (res as any).image_urls
                : res.image_url ? [res.image_url] : [];
            onPostChange(prev => ({ ...prev, imageUrls: urls, files: [], removeImages: false, removeImageUrls: [] }));
            setSaveMsg({ type: "success", text: "Share settings saved." });
            setTimeout(() => setSaveMsg(null), 3000);
        } catch (e: any) {
            setSaveMsg({ type: "error", text: e?.message || "Failed to save" });
        } finally {
            setSaving(false);
        }
    };

    const handleFiles = (fl: FileList | null) => {
        if (!fl) return;
        const allowed = Array.from(fl).filter(f => f.type.startsWith("image/"));
        const slots = MAX_FILES - (post.imageUrls?.length ?? 0) - post.files.length;
        if (slots <= 0) { setSaveMsg({ type: "error", text: `Max ${MAX_FILES} files.` }); return; }
        onPostChange(prev => ({ ...prev, files: [...prev.files, ...allowed.slice(0, slots)], removeImages: false }));
    };

    const code = dashboardData?.my_code?.code ?? "";
    const base = getReferralShareBaseUrl();
    const referralLink = code ? `${base}/auth/register?refercode=${code}` : "";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
                <SectionCard title="Share Message Title">
                    <input type="text" value={post.title} onChange={e => onPostChange(p => ({ ...p, title: e.target.value }))}
                        placeholder="Write a catchy headline..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                </SectionCard>
                <SectionCard title="Share Message Body">
                    <textarea value={post.body} rows={6} onChange={e => onPostChange(p => ({ ...p, body: e.target.value }))}
                        placeholder="Write your referral message..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none" />
                </SectionCard>
                <SectionCard title="Attachments">
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors"
                        onClick={() => document.getElementById("ref-file-input")?.click()}>
                        <Upload className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 font-medium">Drop images or click to upload</p>
                        <p className="text-xs text-gray-400 mt-0.5">Images only, max {MAX_FILES} files</p>
                        <input id="ref-file-input" type="file" accept="image/*" multiple className="hidden"
                            onChange={e => handleFiles(e.target.files)} />
                    </div>
                    {post.files.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {post.files.map((f, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-10 h-10 rounded object-cover border border-gray-200" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                                        <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button onClick={() => onPostChange(p => ({ ...p, files: p.files.filter((_, idx) => idx !== i) }))}
                                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                                        <X className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {!!(post.imageUrls && post.imageUrls.length > 0) && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-500">
                                    Existing attachments ({post.imageUrls.length})
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onPostChange((p) => ({
                                            ...p,
                                            removeImageUrls: [...(p.removeImageUrls ?? []), ...(p.imageUrls ?? [])],
                                            imageUrls: [],
                                            removeImages: true,
                                        }))
                                    }
                                    className="text-xs text-red-600 hover:text-red-700"
                                >
                                    Remove all
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {post.imageUrls.map((url, i) => (
                                    <div
                                        key={`${url}-${i}`}
                                        className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                                    >
                                        <a href={url} target="_blank" rel="noreferrer" title="Open image">
                                            <img
                                                src={url}
                                                alt={`attachment-${i + 1}`}
                                                className="w-full h-20 object-cover hover:opacity-90 transition-opacity"
                                                onError={(e) => {
                                                    const img = e.currentTarget;
                                                    const raw = String(url || "").trim();
                                                    if (!raw) return;
                                                    const fallback = raw.includes("/uploads/") && !raw.includes("/api/v1/uploads/")
                                                        ? raw.replace("/uploads/", "/api/v1/uploads/")
                                                        : raw;
                                                    if (fallback && img.src !== fallback) {
                                                        img.src = fallback;
                                                    }
                                                }}
                                            />
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onPostChange((p) => ({
                                                    ...p,
                                                    removeImageUrls: [...(p.removeImageUrls ?? []), url],
                                                    imageUrls: (p.imageUrls ?? []).filter((u) => u !== url),
                                                    removeImages: false,
                                                }))
                                            }
                                            className="absolute top-1 right-1 p-1 rounded bg-black/55 hover:bg-black/70 text-white"
                                            title="Remove image"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </SectionCard>
                <div className="flex items-center gap-3">
                    <button onClick={handleSave} disabled={saving}
                        className="px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2">
                        {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        {saving ? "Saving…" : "Save Settings"}
                    </button>
                    {saveMsg && (
                        <span className={`text-sm ${saveMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                            {saveMsg.text}
                        </span>
                    )}
                </div>
            </div>

            {/* Preview */}
            <SectionCard title="Post Preview">
                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="w-full h-32 bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
                        {post.imageUrls?.[0] ? (
                            <img
                                src={post.imageUrls[0]}
                                alt="share-preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const raw = String(post.imageUrls?.[0] || "").trim();
                                    const fallback = raw.includes("/uploads/") && !raw.includes("/api/v1/uploads/")
                                        ? raw.replace("/uploads/", "/api/v1/uploads/")
                                        : raw;
                                    if (fallback && e.currentTarget.src !== fallback) {
                                        e.currentTarget.src = fallback;
                                    }
                                }}
                            />
                        ) : (
                            <Share2 className="w-10 h-10 text-[var(--primary)]/30" />
                        )}
                    </div>
                    <div className="p-4 space-y-2">
                        <p className="font-semibold text-gray-900 text-sm">{post.title || "Your title here…"}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{post.body || "Your message will appear here…"}</p>
                        {referralLink && (
                            <p className="text-xs text-[var(--primary)] font-mono pt-2 border-t border-gray-200 truncate">{referralLink}</p>
                        )}
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-xs font-medium text-gray-400 mb-2">Quick Share</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(PLATFORMS).map(([key, cfg]) => {
                            const Icon = cfg.icon;
                            return (
                                <button key={key} title={cfg.label}
                                    onClick={() => openShare(key, post, code)}
                                    className="p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};

// ─── Admin Tab ────────────────────────────────────────────────────────────────
const AdminTab = ({
    overviewCommissionRate,
    overviewCommissionIsCustom,
}: {
    overviewCommissionRate?: number | null;
    overviewCommissionIsCustom?: boolean;
}) => {
    const { user } = usePermissions();
    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [commissionRate, setCommissionRate] = useState<number | null>(null);
    const [commissionIsCustom, setCommissionIsCustom] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const payload = await getAdminReferralDashboard();
                if (payload) {
                    setData(payload);
                }

                let rate: number | null =
                    typeof payload?.your_commission_rate === "number"
                        ? payload.your_commission_rate
                        : typeof overviewCommissionRate === "number"
                          ? overviewCommissionRate
                          : null;
                let isCustom =
                    payload?.commission_rate_is_custom ??
                    overviewCommissionIsCustom ??
                    false;

                if (rate == null) {
                    const teamId = Number((user as { team_id?: number })?.team_id);
                    if (Number.isFinite(teamId) && teamId > 0) {
                        const teams = await listTeamCommissionRates();
                        const team = teams.find((t) => Number(t.id) === teamId);
                        if (team && typeof team.rate === "number") {
                            rate = team.rate;
                            isCustom = team.is_custom;
                        }
                    }
                }

                if (rate == null) {
                    const globalRate = await getGlobalCommissionRate();
                    if (typeof globalRate === "number") {
                        rate = globalRate;
                        isCustom = false;
                    }
                }

                setCommissionRate(rate);
                setCommissionIsCustom(isCustom);

                if (!payload && rate == null) {
                    setError("Unable to load admin referral dashboard.");
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load admin dashboard");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user, overviewCommissionRate, overviewCommissionIsCustom]);

    if (loading) return <Loading message="Loading admin stats…" />;
    if (error) {
        return (
            <div className="py-8 text-center text-red-600 text-sm">{error}</div>
        );
    }

    const adminStats = data?.stats;
    const totalEarned = adminStats?.total_earned ?? 0;
    const referrersCount = adminStats?.referrers_count ?? 0;
    const avgCommission = referrersCount > 0 ? totalEarned / referrersCount : 0;
    const chartData = data?.commissions_by_month ?? [];
    const topReferrers = data?.top_referrers ?? [];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard icon={Banknote} label="Total Earned (team)" value={`£${Number(totalEarned).toFixed(2)}`} accent="green" />
                <MetricCard icon={Award} label="Total Commissions" value={`£${Number(totalEarned).toFixed(2)}`} accent="amber" />
                <MetricCard icon={Users} label="Total Referrers" value={referrersCount} accent="blue" />
                <MetricCard icon={TrendingUp} label="Avg Commission" value={`£${Number(avgCommission).toFixed(2)}`} accent="purple" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard icon={Users2} label="Total Referrals" value={adminStats?.total_referrals ?? 0} accent="blue" />
                <MetricCard icon={Gift} label="In Trial" value={adminStats?.in_trial ?? 0} accent="amber" />
                <MetricCard icon={CheckCircle2} label="Trial Ended" value={adminStats?.trial_ended ?? 0} accent="green" />
            </div>

            <SectionCard title="Your Commission Percentage (%)">
                {commissionRate == null ? (
                    <p className="text-sm text-gray-500">Not configured</p>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-3xl font-semibold text-[var(--primary)]">{commissionRate}%</p>
                        {commissionIsCustom && (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                                Custom rate
                            </span>
                        )}
                        <p className="text-sm text-gray-500 w-full">
                            Percentage applied to referral earnings for your team.
                        </p>
                    </div>
                )}
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Commissions by month">
                    {chartData.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4">No commission data yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
                                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
                                <Tooltip />
                                <Bar dataKey="commissions" fill="#22c55e" radius={[4, 4, 0, 0]} name="Commissions (£)" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </SectionCard>
                <SectionCard title="Top Referrers (by referral count)">
                    <div className="space-y-2">
                        {topReferrers.length === 0 ? (
                            <p className="text-sm text-gray-500 py-2">No referrer data yet.</p>
                        ) : topReferrers.map((r) => (
                            <div key={r.rank} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900 w-6">{r.rank}.</span>
                                    <span className="text-sm text-gray-700">{r.name}</span>
                                </div>
                                <span className="text-sm font-medium text-[var(--primary)]">{r.referrals} referrals</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
};

// ─── How It Works Tab ─────────────────────────────────────────────────────────
const HowItWorksTab = () => (
    <div className="space-y-4 max-w-2xl">
        <SectionCard title="How the Referral Program Works">
            <div className="space-y-5">
                {[
                    { step: "1", title: "Get Your Referral Code", desc: "Generate your unique code from the Overview tab. Share it with friends, colleagues, or on social media." },
                    { step: "2", title: "They Sign Up", desc: "When someone registers using your referral code, they are linked to your account as a referral." },
                    { step: "3", title: "They Start a Trial", desc: "Your referred users get access to a trial period. Once they convert to a paid subscription, you earn a commission." },
                    { step: "4", title: "You Earn Commission", desc: "A commission percentage of their subscription is credited to your referral earnings balance." },
                    { step: "5", title: "Withdraw Your Earnings", desc: "Request a payout via bank transfer, Stripe, or PayPal from Referral Commissions, or apply commission toward a plan upgrade when you subscribe under Settings → Pricing." },
                ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0 text-sm font-semibold text-[var(--primary)]">
                            {step}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">{title}</p>
                            <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    </div>
);

// ─── Share Dialog ─────────────────────────────────────────────────────────────
const ShareDialog = ({
    post, referralCode, onClose,
}: { post: ReferralPost; referralCode: string; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Share Your Referral</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-2">
                {Object.entries(PLATFORMS).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                        <button key={key} onClick={() => openShare(key, post, referralCode)}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                            <Icon className={`w-5 h-5 shrink-0 ${cfg.color}`} />
                            <span className="text-sm font-medium text-gray-800">{cfg.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReferralDashboardContent() {
    const searchParams = useSearchParams();
    const { user } = usePermissions();
    const showTeamReferrals = getInvoiceReferralScope(user) === "team";
    const showAdminTab = showTeamReferrals;
    const canWithdraw = canUseReferralCommission(user);
    const referralsTabLabel = showTeamReferrals ? "Team Referrals" : "My Referrals";
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const [dashboardData, setDashboardData] = useState<ReferralDashboardData | null>(null);
    const [allReferrals, setAllReferrals] = useState<ReferralRecord[]>([]);
    const [earnings, setEarnings] = useState<ReferralEarningItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showShare, setShowShare] = useState(false);
    const [post, setPost] = useState<ReferralPost>({
        title: "Join BookWise!",
        body: "I've been using BookWise for my invoicing and it's brilliant. Use my code to sign up and get started.",
        files: [],
        removeImageUrls: [],
    });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam === "referral-commissions" && canWithdraw) {
            setActiveTab("referral-commissions");
        } else if (tabParam === "earnings") {
            setActiveTab("earnings");
        }
    }, [searchParams, canWithdraw]);

    useEffect(() => {
        if (!showAdminTab && activeTab === "admin") {
            setActiveTab("overview");
        }
        if (!showTeamReferrals && activeTab === "my-referrals") {
            setActiveTab("overview");
        }
        if (!canWithdraw && activeTab === "referral-commissions") {
            setActiveTab("overview");
        }
    }, [showAdminTab, showTeamReferrals, canWithdraw, activeTab]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [dash, refs, earns] = await Promise.all([
                getReferralDashboard(),
                getReferrals({ per_page: 100 }),
                getReferralEarnings({ per_page: 100 }),
            ]);
            setDashboardData(dash);
            setAllReferrals(refs);
            setEarnings(earns);
        } catch (err) {
            console.error("Failed to load referral data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Load share settings when settings tab is opened
    useEffect(() => {
        if (activeTab === "referral-settings") {
            getReferralShareSettings().then(data => {
                setPost(prev => ({
                    ...prev,
                    title: data.share_title || prev.title,
                    body: data.share_body || prev.body,
                    imageUrls: (Array.isArray((data as any).image_urls)
                        ? (data as any).image_urls
                        : data.image_url ? [data.image_url] : []
                    ),
                    removeImageUrls: [],
                }));
            }).catch(() => { });
        }
    }, [activeTab]);

    const handleCodeChange = async (newCode: string) => {
        const codeRecord = dashboardData?.my_code;
        if (!codeRecord) return;
        const updated = await updateReferralCode(codeRecord.id, newCode);
        setDashboardData(prev => prev ? { ...prev, my_code: updated } : prev);
    };

    const handleGenerate = async () => {
        const generated = await generateReferralCode();
        setDashboardData((prev) =>
            prev ? { ...prev, my_code: generated } : prev
        );
        await loadData();
    };

    const referralCode = dashboardData?.my_code?.code ?? "";

    const mergedReferralRecords = useMemo(
        () =>
            mergeReferralRecords(
                allReferrals,
                dashboardData?.recent_referrals,
                dashboardData?.my_referral ?? undefined
            ),
        [allReferrals, dashboardData?.recent_referrals, dashboardData?.my_referral]
    );

    const ownScopeReferralRecords = useMemo(
        () =>
            filterReferralsForOwnScopeUser(
                mergedReferralRecords,
                user,
                getInvoiceUserEmail()
            ),
        [mergedReferralRecords, user]
    );

    const ownScopeReferredUsersRecords = useMemo(() => {
        const ownerEmail = String(
            dashboardData?.my_code?.user?.email ??
                (user as { email?: string } | null)?.email ??
                getInvoiceUserEmail() ??
                ""
        )
            .trim()
            .toLowerCase();

        if (!ownerEmail) return [];

        // Show only referrals actually owned by this user's referral code/email.
        return ownScopeReferralRecords.filter((r) => {
            const rowOwnerEmail = r.code_owner?.email?.trim().toLowerCase();
            return rowOwnerEmail === ownerEmail;
        });
    }, [ownScopeReferralRecords, user, dashboardData?.my_code?.user?.email]);

    // Overview must show only referrals owned by the logged-in user's referral identity.
    const showReferredUsersOnOverview = ownScopeReferredUsersRecords.length > 0;
    const referredUsersOnOverview = ownScopeReferredUsersRecords;

    const allNavTabs: PageNavTab[] = [
        { id: "overview", name: "Overview", icon: "LayoutDashboard", onClick: () => setActiveTab("overview") },
        { id: "my-referrals", name: referralsTabLabel, icon: "Users", onClick: () => setActiveTab("my-referrals") },
        { id: "earnings", name: "Earnings", icon: "CreditCard", onClick: () => setActiveTab("earnings") },
        { id: "referral-commissions", name: "Referral Commissions", icon: "Wallet", onClick: () => setActiveTab("referral-commissions") },
        { id: "referral-settings", name: "Referral Settings", icon: "Gift", onClick: () => setActiveTab("referral-settings") },
        { id: "admin", name: "Admin Dashboard", icon: "Crown", onClick: () => setActiveTab("admin") },
        { id: "rules", name: "How It Works", icon: "BookOpen", onClick: () => setActiveTab("rules") },
    ];
    const navTabs = allNavTabs.filter((tab) => {
        if (tab.id === "admin") return showAdminTab;
        if (tab.id === "my-referrals") return showTeamReferrals;
        if (tab.id === "referral-commissions") return canWithdraw;
        return true;
    });
    const referralTabCopy: Record<string, { heading: string; subheading: string }> = {
        overview: { heading: "Referrals", subheading: "Complete overview of referral activity and performance" },
        "my-referrals": {
            heading: referralsTabLabel,
            subheading: showTeamReferrals
                ? "All referral sign-ups across your team (admins and sub-users)"
                : "Users you referred with your referral code",
        },
        earnings: { heading: "Earnings", subheading: "Complete overview of your referral earnings" },
        "referral-commissions": { heading: "Referral Commissions", subheading: "View your commission balance and request withdrawals" },
        "referral-settings": { heading: "Referral Settings", subheading: "Complete overview of referral sharing and configuration" },
        admin: { heading: "Admin Dashboard", subheading: "Complete overview of platform referral performance" },
        rules: { heading: "How It Works", subheading: "Complete overview of referral rules and program details" },
    };
    const currentCopy = referralTabCopy[activeTab] ?? referralTabCopy.overview;

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col w-full">
            <PageHeaderTabs
                title={currentCopy.heading}
                description={currentCopy.subheading}
                tabs={navTabs}
                activeTabId={activeTab}
                mobileMenuOpen={mobileMenuOpen}
                onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
                actions={
                    <button onClick={loadData} disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                }
            />

            <div className="flex-1 p-6 w-full max-w-7xl mx-auto space-y-6">
                {/* Tab content */}
                {loading ? (
                    <Loading message="Loading referral data…" />
                ) : (
                    <>
                        {activeTab === "overview" && (
                            <OverviewTab
                                dashboardData={dashboardData}
                                post={post}
                                onOpenShare={() => setShowShare(true)}
                                onCodeChange={handleCodeChange}
                                onGenerate={handleGenerate}
                                showAdminSections={showTeamReferrals}
                                showReferredUsers={showReferredUsersOnOverview}
                                referredUsersRecords={referredUsersOnOverview}
                            />
                        )}
                        {activeTab === "my-referrals" && showTeamReferrals && (
                            <ReferredUsersTable records={allReferrals} />
                        )}
                        {activeTab === "earnings" && (
                            <EarningsTable earnings={earnings} />
                        )}
                        {activeTab === "referral-commissions" && canWithdraw && (
                            <ReferralWithdrawalsSection
                                initialWallet={dashboardData?.wallet ?? null}
                                onRefresh={loadData}
                            />
                        )}
                        {activeTab === "referral-settings" && (
                            <ReferralSettingsTab
                                post={post}
                                onPostChange={setPost}
                                dashboardData={dashboardData}
                            />
                        )}
                        {activeTab === "admin" && (
                            <AdminTab
                                overviewCommissionRate={dashboardData?.your_commission_rate}
                                overviewCommissionIsCustom={dashboardData?.commission_rate_is_custom}
                            />
                        )}
                        {activeTab === "rules" && <HowItWorksTab />}
                    </>
                )}

                {/* Share dialog */}
                {showShare && (
                    <ShareDialog post={post} referralCode={referralCode} onClose={() => setShowShare(false)} />
                )}
            </div>
        </div>
    );
}
