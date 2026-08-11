// services/interface/User.ts
// Local interface definitions

import { formatCompanyAddress } from '@/utils/format-address';

export interface AvailableCompany {
  id: number;
  host_id?: number;
  account_type?: string;
  company_name?: string | null;
  business_email?: string | null;
  company_address?: string | null;
  company_currency?: string | null;
  company_logo?: string | null;
  invoice_format?: string | null;
  vat_no?: string | null;
  phone_number?: string | null;
  is_active?: boolean;
}

export interface Company {
  company_name?: string | null;
  company_logo?: string | null;
  business_registration_number?: string | null;
  years_in_business?: number | null;
  vat_no?: string | null;
  partnerships?: string | null;
  service_areas?: string | null;
  company_address?: string | null;
  company_address_nr?: string | null;
  company_address_street?: string | null;
  company_address_city?: string | null;
  company_address_town?: string | null;
  company_address_postcode?: string | null;
  company_address_county?: string | null;
  company_address_country?: string | null;
  business_email?: string | null;
  office_hours?: string | null;
  phone_number?: string | null;
  company_website?: string | null;
  business_highlights?: string | null;
  mission_statement?: string | null;
  about_the_company?: string | null;
  search_properties?: string | null;
  bio?: string | null;
  company_currency?: string | null;
}

export interface SocialLinks {
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
}

export interface Bank {
  account_name: string | null;
  account_number: string | null;
  sort_code: string | null;
}

export interface Stripe {
  status: 'connected' | 'disconnected' | 'incomplete' | 'not_connected' | 'permanently_disconnected' | null;
  secret_key: string | null;
  publish_key: string | null;
  stripe_fee_percentage: number;
  stripe_fixed_fee: number;
}

export interface Onboarding {
  first_login: boolean | null;
  has_seen_pricing: boolean | null;
}

export interface UserSubscription {
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'inactive' | 'trial_end' | null;
  plan_type: 'monthly' | 'yearly' | 'trial' | 'forever';
  plan_name: string;
  plan_id?: number | null;
  plan_slug?: string | null;
  trial_ends_at: string | null;
  next_payment_at: string | null;
  amount: number;
  available_days?: number;
  trial_days_total?: number;
  features?: Record<string, unknown>;
  limits?: Record<string, number>;
  templates_access?: string;
  allowed_templates?: string[];
  full_trial_access?: boolean;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_name: string;
  phone: string | null;
  phone_number?: string | null;
  is_active: string;
  profile_img?: string | null;
  company: Company;
  social_links: SocialLinks;
  bank: Bank;
  stripe: Stripe;
  roles: string[];

  // ADDED: account_type field
  account_type?: 'personal' | 'company' | 'super-admin' | null;
  
  // ADDED: host_id for multi-tenant support
  host_id?: number | null;
  team_id?: number | null;

  // Additional fields
  location?: string | null;
  company_designation?: string | null;
  short_bio?: string | null;
  created_at?: string;
  DT_RowIndex?: number;
  action?: string;
  theme_color?: string | null;
  invoice_theme_color?: string | null;

  onboarding?: Onboarding;
  subscription?: UserSubscription;

  // Multi-company context fields
  available_companies?: AvailableCompany[];
  current_context?: {
    type?: 'personal' | 'company';
    company_id?: number | null;
    host_id?: number | null;
    company_name?: string | null;
  };
  active_company_id?: number | null;
  active_context_type?: 'personal' | 'company' | null;
  can_manage_company_profile?: boolean;
}

// Define the raw API response structure
export interface RawUserData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_name: string;
  phone?: string | null;
  phone_number?: string | null;
  is_active?: string;
  profile_img?: string | null;
  location?: string | null;
  company_designation?: string | null;
  theme_color?: string | null;
  invoice_theme_color?: string | null;
  short_bio?: string | null;

  // ADDED: account_type field
  account_type?: 'personal' | 'company' | 'super-admin' | null;
  
  // ADDED: host_id for multi-tenant support
  host_id?: number | null;
  team_id?: number | null;

  company?: {
    company_name?: string | null;
    company_logo?: string | null;
    business_registration_number?: string | null;
    years_in_business?: number | null;
    vat_no?: string | null;
    partnerships?: string | null;
    service_areas?: string | null;
    company_address?: string | null;
    business_email?: string | null;
    office_hours?: string | null;
    phone_number?: string | null;
    company_website?: string | null;
    business_highlights?: string | null;
    mission_statement?: string | null;
    about_the_company?: string | null;
    search_properties?: string | null;
    bio?: string | null;
    company_currency?: string | null;
  };
  social_links?: {
    facebook?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    twitter?: string | null;
  };
  bank?: {
    account_name?: string | null;
    account_number?: string | null;
    sort_code?: string | null;
  };
  stripe?: {
    status?: 'connected' | 'disconnected' | 'incomplete' | 'not_connected' | 'permanently_disconnected' | null;
    secret_key?: string | null;
    publish_key?: string | null;
    stripe_fee_percentage: number;
    stripe_fixed_fee: number;
  };
  roles?: string[] | { id: number; name: string }[];
  created_at?: string;
  DT_RowIndex?: number;
  action?: string;
  onboarding?: Onboarding;
  subscription?: UserSubscription | null;
}

export function mapUser(data: RawUserData): User {
  // Extract role names if roles is an array of objects
  const roles = Array.isArray(data.roles)
    ? data.roles.map(role => typeof role === 'string' ? role : role.name)
    : [];

  return {
    id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    user_name: data.user_name,
    phone: data.phone ?? null,
    phone_number: data.phone_number ?? null,
    is_active: data.is_active ?? 'Active',
    profile_img: data.profile_img ?? null,
    location: data.location ?? null,
    company_designation: data.company_designation ?? null,
    theme_color: data.theme_color ?? null,
    invoice_theme_color: data.invoice_theme_color ?? null,
    short_bio: data.short_bio ?? null,

    // ADDED: map account_type from API response
    account_type: data.account_type ?? null,
    host_id: data.host_id ?? null,
    team_id: data.team_id ?? null,

    company: {
      company_name: data.company?.company_name ?? null,
      company_logo: data.company?.company_logo ?? null,
      business_registration_number: data.company?.business_registration_number ?? null,
      years_in_business: data.company?.years_in_business ?? null,
      vat_no: data.company?.vat_no ?? null,
      partnerships: data.company?.partnerships ?? null,
      service_areas: data.company?.service_areas ?? null,
      company_address: formatCompanyAddress(data.company) ?? null,
      business_email: data.company?.business_email ?? null,
      office_hours: data.company?.office_hours ?? null,
      phone_number: data.company?.phone_number ?? null,
      company_website: data.company?.company_website ?? null,
      business_highlights: data.company?.business_highlights ?? null,
      mission_statement: data.company?.mission_statement ?? null,
      about_the_company: data.company?.about_the_company ?? null,
      search_properties: data.company?.search_properties ?? null,
      bio: data.company?.bio ?? null,
      company_currency: data.company?.company_currency,
    },
    social_links: {
      facebook: data.social_links?.facebook ?? null,
      instagram: data.social_links?.instagram ?? null,
      linkedin: data.social_links?.linkedin ?? null,
      twitter: data.social_links?.twitter ?? null,
    },
    bank: {
      account_name: data.bank?.account_name ?? null,
      account_number: data.bank?.account_number ?? null,
      sort_code: data.bank?.sort_code ?? null,
    },
    stripe: {
      status: data.stripe?.status ?? 'not_connected',
      secret_key: data.stripe?.secret_key ?? null,
      publish_key: data.stripe?.publish_key ?? null,
      stripe_fee_percentage: data.stripe?.stripe_fee_percentage ?? 0,
      stripe_fixed_fee: data.stripe?.stripe_fixed_fee ?? 0,
    },
    roles: roles,
    created_at: data.created_at,
    DT_RowIndex: data.DT_RowIndex,
    action: data.action,

    // Multi-company context — passed through as-is from raw API
    available_companies: (data as any).available_companies ?? [],
    current_context: (data as any).current_context ?? undefined,
    active_company_id: (data as any).active_company_id ?? null,
    active_context_type: (data as any).active_context_type ?? null,
    can_manage_company_profile: (data as any).can_manage_company_profile ?? false,
    onboarding: data.onboarding ?? { first_login: true, has_seen_pricing: false },
    subscription: data.subscription ?? undefined,
  };
}