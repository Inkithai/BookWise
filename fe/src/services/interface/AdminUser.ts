// services/interface/AdminUser.ts
import { Role } from './Role';
import type { UserSubscription } from './User';

export interface Company {
  company_name?: string | null;
  company_logo?: string | null;
  business_registration_number?: string | null;
  years_in_business?: number | string | null;
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
  invoice_format?: string | null;
  office_hours?: string | null;
  phone_number?: string | null;
  company_website?: string | null;
  business_highlights?: string | null;
  mission_statement?: string | null;
  about_the_company?: string | null;
  bio?: string | null;
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
  secret_key: string | null;
  publish_key: string | null;
  stripe_fee_percentage: number;
  stripe_fixed_fee: number;
}

export interface PlanInfo {
  name?: string | null;
  price?: number | string | null;
  currency?: string | null;
  formatted_price?: string | null;
}

export interface ActivityLog {
  id: number;
  type?: string | null;
  action?: string | null;
  related_id?: number | null;
  details?: string | null;
  created_at?: string | null;
  created_at_human?: string | null;
}

export interface PlanInfo {
  name?: string | null;
  price?: number | string | null;
  currency?: string | null;
  formatted_price?: string | null;
}

export interface ActivityLog {
  id: number;
  type?: string | null;
  action?: string | null;
  related_id?: number | null;
  details?: string | null;
  created_at?: string | null;
  created_at_human?: string | null;
}

export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  team_owner_name?: string | null;
  email: string;
  user_name: string;
  phone?: string;
  phone_number?: string;
  is_active: number | string;
  is_active_label?: string;
  is_otp_verified?: number | string | boolean;
  is_otp_verified_label?: string;
  profile_img?: string | null;
  account_type?: string;
  company?: Company;
  company_name?: string;
  company_id?: number;
  team?: string;
  team_id?: number;
  plan?: PlanInfo | null;
  social_links?: SocialLinks;
  bank?: Bank;
  stripe?: Stripe;
  role?: string;
  role_name?: string;
  roles?: (Role | string | number)[];
  created_at?: string;
  created_at_human?: string;
  last_login?: string;
  last_login_human?: string;
  last_activity?: string;
  last_activity_human?: string;
  activity_count?: number;
  activity_logs?: ActivityLog[];
  DT_RowIndex?: number;
  action?: string;

  /** When false (company accounts), UI is read-only for sub-users; primary host user may edit. */
  can_manage_company_profile?: boolean;

  /** Permission strings for sub-users (e.g. "invoice.view", "dashboard.view"). Admins have full access. */
  permissions?: string[];

  /** Billing plan from GET admin/auth/me */
  subscription?: UserSubscription | null;

  // Additional fields for forms
  location?: string;
  company_designation?: string;
  short_bio?: string;
}

export interface AdminUserListResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: AdminUser[];
}

export interface AdminUserDetailResponse {
  success: boolean;
  data: AdminUser;
}

export interface GetUsersApiParams {
  search?: string;
  per_page?: number;
  page?: number;
  is_active?: number;
  account_type?: string;
}

// CREATE payload - UPDATED: Removed account_type and company for sub-users
export interface CreateAdminUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  user_name: string;
  phone_number?: string | null;
  // Removed: account_type and company - not required for sub-users
  roles: number;
  /** Spatie role name — used to resolve the matching role on BookWise when syncing */
  role_name?: string;
  active: number;
}

// UPDATE payload - matches POST /api/v1/admin/users/{id} with _method=PUT
export interface UpdateAdminUserPayload {
  first_name: string;
  last_name: string;
  email?: string;
  user_name: string;
  phone_number?: string | null;
  account_type?: 'company' | 'personal';
  company_designation?: string | null;
  short_bio?: string | null;
  location?: string | null;
  profile_img?: File | null;
  roles?: number;
  is_remove?: boolean;
  active?: number;
  _method?: string;
}

// COMPANY DETAILS payload - remains the same
export interface ChangeCompanyDetailsPayload {
  company_name: string;
  company_address: string;
  business_email: string;

  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
  company_logo?: File | null;
  business_registration_number?: string | null;
  years_in_business?: number | null;
  partnerships?: string | null;
  service_areas?: string | null;
  office_hours?: string | null;
  company_address_nr?: string | null;
  company_address_street?: string | null;
  company_address_city?: string | null;
  company_address_town?: string | null;
  company_address_postcode?: string | null;
  company_address_county?: string | null;
  company_address_country?: string | null;
  company_website?: string | null;
  social_media_links_facebook?: string | null;
  social_media_links_instagram?: string | null;
  social_media_links_linkedin?: string | null;
  social_media_links_twitter?: string | null;
  business_highlights?: string | null;
  mission_statement?: string | null;
  about_the_company?: string | null;
  stripe_secret_key?: string | null;
  stripe_published_key?: string | null;
  vat_no?: string | null;
}

export interface CreateAdminUserResponse {
  success: boolean;
  message: string;
  data: AdminUser;
}

export interface UpdateAdminUserResponse {
  success: boolean;
  message: string;
  data: AdminUser;
}

export interface DeleteAdminUserResponse {
  success: boolean;
  message: string;
}

export interface DeleteUserParams {
  id: number;
  action: 'delete' | 'deactivate';
}

export interface ChangeCompanyDetailsResponse {
  success: boolean;
  message: string;
  data: AdminUser;
}

export interface ApiErrorResponse {
  error: boolean;
  message: string;
  code: number;
  errors?: {
    [key: string]: string[];
  };
  timestamp: string;
}