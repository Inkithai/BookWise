/**
 * Utility functions for formatting address from individual fields
 */

import { Company } from '@/services/interface/User';
import { Company as AdminCompany } from '@/services/interface/AdminUser';

/**
 * Format company address from individual fields into a single comma-separated string
 * If company_address is already provided as a single field, use that
 * Otherwise, compose from individual address fields
 */
export function formatCompanyAddress(company: Partial<Company | AdminCompany> | null | undefined): string | null {
  if (!company) return null;

  // If single address field is already provided, use it
  if (company.company_address && typeof company.company_address === 'string' && company.company_address.trim()) {
    return company.company_address;
  }

  // Otherwise, compose from individual address fields
  const parts: string[] = [];

  // Combine number and street
  if (company.company_address_nr || company.company_address_street) {
    const streetLine = [company.company_address_nr, company.company_address_street]
      .filter(Boolean)
      .join(' ');
    if (streetLine) parts.push(streetLine);
  }

  // Combine city, town, county
  const cityLine = [company.company_address_city, company.company_address_town, company.company_address_county]
    .filter(Boolean)
    .join(', ');
  if (cityLine) parts.push(cityLine);

  // Add postcode
  if (company.company_address_postcode) {
    parts.push(company.company_address_postcode);
  }

  // Add country
  if (company.company_address_country) {
    parts.push(company.company_address_country);
  }

  // Return formatted address or null if no parts
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Format client/vendor address from individual fields into a single comma-separated string
 */
export function formatClientAddress(clientAddress: {
  address_no?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_town?: string | null;
  address_postcode?: string | null;
  address_county?: string | null;
  address_country?: string | null;
  address?: string | null;
} | null | undefined): string | null {
  if (!clientAddress) return null;

  const parts: string[] = [];

  // Combine number and street
  if (clientAddress.address_no || clientAddress.address_street) {
    const streetLine = [clientAddress.address_no, clientAddress.address_street]
      .filter(Boolean)
      .join(' ');
    if (streetLine) parts.push(streetLine);
  }

  // Combine city, town, county
  const cityLine = [clientAddress.address_city, clientAddress.address_town, clientAddress.address_county]
    .filter(Boolean)
    .join(', ');
  if (cityLine) parts.push(cityLine);

  // Add postcode
  if (clientAddress.address_postcode) {
    parts.push(clientAddress.address_postcode);
  }

  // Add country
  if (clientAddress.address_country) {
    parts.push(clientAddress.address_country);
  }

  // Fallback to old address field if new fields are empty
  if (parts.length === 0 && clientAddress.address) {
    return clientAddress.address;
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Split a free-text address into printable lines.
 * Supports both comma-separated and newline-separated addresses.
 */
export function splitAddressIntoLines(address: string | null | undefined): string[] {
  if (!address || typeof address !== 'string') return [];
  return address
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Build client address lines from structured fields.
 * Falls back to legacy single address field and splits it into lines.
 */
export function getClientAddressLines(clientAddress: {
  address_no?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_town?: string | null;
  address_postcode?: string | null;
  address_county?: string | null;
  address_country?: string | null;
  address?: string | null;
} | null | undefined): string[] {
  if (!clientAddress) return [];

  const lines: string[] = [];

  if (clientAddress.address_no?.trim()) lines.push(clientAddress.address_no.trim());
  if (clientAddress.address_street?.trim()) lines.push(clientAddress.address_street.trim());
  if (clientAddress.address_city?.trim()) lines.push(clientAddress.address_city.trim());
  if (clientAddress.address_town?.trim()) lines.push(clientAddress.address_town.trim());
  if (clientAddress.address_county?.trim()) lines.push(clientAddress.address_county.trim());
  if (clientAddress.address_postcode?.trim()) lines.push(clientAddress.address_postcode.trim());
  if (clientAddress.address_country?.trim()) lines.push(clientAddress.address_country.trim());

  if (lines.length > 0) return lines;
  return splitAddressIntoLines(clientAddress.address);
}
