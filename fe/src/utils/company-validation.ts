// utils/company-validation.ts
import { AdminUser } from '@/services/interface/AdminUser';
import { User } from '@/services/interface/User';

export const isCompanyDetailsComplete = (user: AdminUser | User | null): boolean => {
  if (!user || !user.company) {
    return false;
  }

  const { company } = user;

  // Check if at least 3 address fields are filled
  const addressFields = [
    company.company_address,
    company.company_address_nr,
    company.company_address_street,
    company.company_address_city,
    company.company_address_town,
    company.company_address_postcode,
    company.company_address_county,
    company.company_address_country,
  ];

  const filledAddressFields = addressFields.filter(
    field => field && typeof field === 'string' && field.trim() !== ''
  );

  const hasAddress = filledAddressFields.length >= 3;

  // Check required fields: logo, name, email, address (at least 3 fields required)
  const requiredFields = [
    company.company_logo,
    company.company_name,
    company.business_email,
    hasAddress
  ];

  // Return false if any required field is empty, null, or undefined
  return requiredFields.every(field => {
    if (field === null || field === undefined) return false;
    if (typeof field === 'string') {
      // Check if string is not just whitespace
      return field.trim() !== '';
    }
    return true; // For non-string types (like logo URL)
  });
};

// Helper to get missing fields
export const getMissingCompanyFields = (user: AdminUser | User | null): string[] => {
  if (!user || !user.company) {
    return ['All company details'];
  }

  const { company } = user;
  const missingFields: string[] = [];

  if (!company.company_logo || (typeof company.company_logo === 'string' && company.company_logo.trim() === '')) {
    missingFields.push('Company Logo');
  }

  if (!company.company_name || company.company_name.trim() === '') {
    missingFields.push('Company Name');
  }

  if (!company.business_email || company.business_email.trim() === '') {
    missingFields.push('Business Email');
  }

  // Check if at least 3 address fields are filled
  const addressFields = [
    company.company_address,
    company.company_address_nr,
    company.company_address_street,
    company.company_address_city,
    company.company_address_town,
    company.company_address_postcode,
    company.company_address_county,
    company.company_address_country,
  ];

  const filledAddressFields = addressFields.filter(
    field => field && typeof field === 'string' && field.trim() !== ''
  );

  const hasAddress = filledAddressFields.length >= 3;

  if (!hasAddress) {
    missingFields.push('Company Address');
  }

  return missingFields;
};

// UPDATED: Check account type FIRST before showing banner
export const shouldShowBanner = (user: AdminUser | User | null): boolean => {
  if (!user) {
    console.log('❌ No user data - banner should NOT show');
    return false;
  }

  // CRITICAL: If personal account, NEVER show banner
  const accountType = (user as any).account_type;
  if (accountType === 'personal') {
    console.log('📝 Personal account detected - banner should NOT show');
    return false;
  }

  // For company accounts, check if details are complete
  if (!user.company) {
    console.log('⚠️ Company account with no company data - banner SHOULD show');
    return true;
  }

  // Check if company is actually complete
  const isComplete = isCompanyDetailsComplete(user);
  if (!isComplete) {
    // Company is incomplete - check if we need to show banner
    const companyHash = btoa(
      JSON.stringify({
        logo: user.company.company_logo,
        name: user.company.company_name,
        email: user.company.business_email,
        address: user.company.company_address,
        address_nr: user.company.company_address_nr,
        address_street: user.company.company_address_street,
        address_city: user.company.company_address_city,
        address_town: user.company.company_address_town,
        address_postcode: user.company.company_address_postcode,
        address_county: user.company.company_address_county,
        address_country: user.company.company_address_country,
        account_name: user.bank?.account_name || null,
        account_number: user.bank?.account_number || null,
        sort_code: user.bank?.sort_code || null,
      })
    );

    const savedHash = localStorage.getItem('companyDetailsHash');
    const wasPreviouslyCompleted = localStorage.getItem('companyDetailsCompleted') === 'true';

    if (wasPreviouslyCompleted && savedHash === companyHash) {
      // Same incomplete state as before - don't show banner
      console.log('🔄 Same incomplete state - banner should NOT show');
      return false;
    }

    // New incomplete state or first time - show banner
    console.log('✨ New incomplete state - banner SHOULD show');
    return true;
  }

  // Company is complete - mark it and don't show banner
  markCompanyAsCompleted(user);
  console.log('✅ Company details complete - banner should NOT show');
  return false;
};

// Mark company as completed in localStorage
export const markCompanyAsCompleted = (user: AdminUser | User | null) => {
  if (typeof window !== 'undefined' && user && user.company) {
    // Create a hash of the company details to track changes
    const companyHash = btoa(
      JSON.stringify({
        logo: user.company.company_logo,
        name: user.company.company_name,
        email: user.company.business_email,
        address: user.company.company_address,
        address_nr: user.company.company_address_nr,
        address_street: user.company.company_address_street,
        address_city: user.company.company_address_city,
        address_town: user.company.company_address_town,
        address_postcode: user.company.company_address_postcode,
        address_county: user.company.company_address_county,
        address_country: user.company.company_address_country,
        account_name: user.bank?.account_name || null,
        account_number: user.bank?.account_number || null,
        sort_code: user.bank?.sort_code || null,
      })
    );

    localStorage.setItem('companyDetailsCompleted', 'true');
    localStorage.setItem('companyDetailsCompletedAt', Date.now().toString());
    localStorage.setItem('companyDetailsHash', companyHash);

    console.log('✅ Company marked as completed with hash:', companyHash);
  }
};

// Clear company completion mark
export const clearCompanyCompletionMark = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('companyDetailsCompleted');
    localStorage.removeItem('companyDetailsCompletedAt');
    localStorage.removeItem('companyDetailsHash');

    console.log('✅ Company completion mark cleared');
  }
};
