// CustomerSupportForm.tsx
"use client"
import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CountryCode {
  code: string;
  country: string;
  dialCode: string;
}

const countryCodes: CountryCode[] = [
  { code: 'US', country: 'United States', dialCode: '+1' },
  { code: 'GB', country: 'United Kingdom', dialCode: '+44' },
  { code: 'LK', country: 'Sri Lanka', dialCode: '+94' },
  { code: 'IN', country: 'India', dialCode: '+91' },
  { code: 'AU', country: 'Australia', dialCode: '+61' },
  { code: 'CA', country: 'Canada', dialCode: '+1' },
  { code: 'DE', country: 'Germany', dialCode: '+49' },
  { code: 'FR', country: 'France', dialCode: '+33' },
  { code: 'IT', country: 'Italy', dialCode: '+39' },
  { code: 'ES', country: 'Spain', dialCode: '+34' },
  { code: 'JP', country: 'Japan', dialCode: '+81' },
  { code: 'CN', country: 'China', dialCode: '+86' },
  { code: 'BR', country: 'Brazil', dialCode: '+55' },
  { code: 'MX', country: 'Mexico', dialCode: '+52' },
  { code: 'ZA', country: 'South Africa', dialCode: '+27' },
  { code: 'AE', country: 'United Arab Emirates', dialCode: '+971' },
  { code: 'SG', country: 'Singapore', dialCode: '+65' },
  { code: 'NZ', country: 'New Zealand', dialCode: '+64' },
  { code: 'MY', country: 'Malaysia', dialCode: '+60' },
  { code: 'PK', country: 'Pakistan', dialCode: '+92' },
];

const problemCategories = [
  'Invoice creation',
  'Payment issues',
  'Account access',
  'Technical support',
  'Billing inquiry',
  'Feature request',
  'Other'
];

interface FormData {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  problem_category: string;
  specify_others: string;
  description: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
  problem_category?: string;
  specify_others?: string;
  description?: string;
}

const OTHER_CATEGORY = 'Other';

const CustomerSupportForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    problem_category: '',
    specify_others: '',
    description: ''
  });

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('+44');
  const [showCountryDropdown, setShowCountryDropdown] = useState<boolean>(false);
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState<string>('');

  const filteredCountries = countryCodes.filter(country =>
    country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.dialCode.includes(countrySearch)
  );

  const handleResultDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSubmitStatus((prev) => {
        if (prev === 'success') {
          setFormData({
            first_name: '',
            last_name: '',
            phone_number: '',
            email: '',
            problem_category: '',
            specify_others: '',
            description: '',
          });
          setSelectedCountryCode('+44');
        }
        return 'idle';
      });
      setSubmitMessage('');
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'problem_category') {
        return {
          ...prev,
          problem_category: value,
          specify_others: value === OTHER_CATEGORY ? prev.specify_others : '',
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });

    setErrors((prev) => {
      const next: FormErrors = { ...prev };
      if (prev[name as keyof FormErrors]) {
        delete next[name as keyof FormErrors];
      }
      if (name === 'problem_category' && value !== OTHER_CATEGORY && prev.specify_others) {
        delete next.specify_others;
      }
      return next;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.problem_category.trim()) {
      newErrors.problem_category = 'Problem category is required';
    } else if (formData.problem_category === OTHER_CATEGORY && !formData.specify_others.trim()) {
      newErrors.specify_others = 'Please specify your issue category';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Prepare JSON payload instead of FormData
      const payload: any = {
        email: formData.email,
      };

      // Add optional fields only if they have values
      if (formData.first_name?.trim()) payload.first_name = formData.first_name.trim();
      if (formData.last_name?.trim()) payload.last_name = formData.last_name.trim();

      // Combine country code with phone number
      if (formData.phone_number?.trim()) {
        const cleanPhone = formData.phone_number.trim().replace(/\D/g, '');
        payload.phone_number = `${selectedCountryCode}${cleanPhone}`;
      }

      if (formData.problem_category?.trim()) payload.problem_category = formData.problem_category.trim();
      if (formData.problem_category === OTHER_CATEGORY && formData.specify_others?.trim()) {
        payload.specify_others = formData.specify_others.trim();
      }
      if (formData.description?.trim()) payload.description = formData.description.trim();

      // Log what we're sending
      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Payload:', payload);

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost';
      const endpoint = `${apiBaseUrl}/api/v1/admin/customer-support`;
      console.log('API Endpoint:', endpoint);

      // Get auth token from localStorage
      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('authToken');

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('Request headers:', headers);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      console.log('=== RESPONSE DEBUG ===');
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Try to get response body
      const responseText = await response.text();
      console.log('Response body (first 500 chars):', responseText.substring(0, 500));
      console.log('Response body length:', responseText.length);
      console.log('Is HTML?', responseText.includes('<!DOCTYPE'));

      if (!response.ok) {
        let errorMessage = `Server Error (${response.status}: ${response.statusText})`;

        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            console.error('Parsed error data:', errorData);

            // Try to extract error message from various possible formats
            errorMessage = errorData.message
              || errorData.error
              || errorData.detail
              || errorData.msg
              || (errorData.errors ? JSON.stringify(errorData.errors) : null)
              || JSON.stringify(errorData);
          } catch (e) {
            console.error('Response is not JSON');
            // If response is HTML (common for 500 errors), show a user-friendly message
            if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
              errorMessage = `Server error (500). Please contact support or check server logs.`;
              console.error('HTML error page returned. First 500 chars:', responseText.substring(0, 500));
            } else {
              errorMessage = responseText.substring(0, 200) || errorMessage;
            }
          }
        }

        throw new Error(errorMessage);
      }

      const result = responseText ? JSON.parse(responseText) : {};
      console.log('Success response:', result);

      const successMsg =
        typeof result?.message === 'string' && result.message.trim()
          ? result.message.trim()
          : 'Your support request has been submitted successfully!';
      setSubmitMessage(successMsg);
      setSubmitStatus('success');
    } catch (error) {
      console.error('=== ERROR ===');
      console.error('Error submitting form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit your request. Please try again.';
      setSubmitStatus('error');
      setSubmitMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Form Container */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow duration-300">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name and Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="John"
                  className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border ${errors.first_name
                    ? 'border-red-500 dark:border-red-500 font-medium'
                    : 'border-gray-200 dark:border-gray-700'
                    } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary/80 focus:border-transparent transition-all duration-300`}
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.first_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border ${errors.last_name
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-200 dark:border-gray-700'
                    } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary/80 focus:border-transparent transition-all duration-300`}
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.last_name}
                  </p>
                )}
              </div>
            </div>

            {/* Phone Number and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {/* Country Code Dropdown */}
                  <div className="relative w-32">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary/80 focus:border-transparent transition-all duration-300 text-sm font-medium"
                    >
                      {selectedCountryCode}
                    </button>

                    {showCountryDropdown && (
                      <div className="absolute z-50 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-80 overflow-hidden">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                          <input
                            type="text"
                            placeholder="Search country..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="overflow-y-auto max-h-60">
                          {filteredCountries.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setSelectedCountryCode(country.dialCode);
                                setShowCountryDropdown(false);
                                setCountrySearch('');
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-between"
                            >
                              <span className="text-gray-900 dark:text-white text-sm">
                                {country.country}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                {country.dialCode}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    placeholder="1234567890"
                    className={`flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border ${errors.phone_number
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-200 dark:border-gray-700'
                      } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary/80 focus:border-transparent transition-all duration-300`}
                  />
                </div>
                {errors.phone_number && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.phone_number}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john.doe@gmail.com"
                  className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border ${errors.email
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-200 dark:border-gray-700'
                    } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary/80 focus:border-transparent transition-all duration-300`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Problem Category (+ Specify others only when Other) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={formData.problem_category === OTHER_CATEGORY ? '' : 'md:col-span-2'}>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Problem category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="problem_category"
                    value={formData.problem_category}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border ${errors.problem_category
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-200 dark:border-gray-700'
                      } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary/80 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer pr-12 font-medium hover:border-gray-300 dark:hover:border-gray-600`}
                  >
                    <option value="" className="text-gray-400 dark:text-gray-500">Select a category</option>
                    {problemCategories.map((category) => (
                      <option key={category} value={category} className="text-gray-900 dark:text-white">
                        {category}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                {errors.problem_category && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.problem_category}
                  </p>
                )}
              </div>

              {formData.problem_category === OTHER_CATEGORY && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Specify others <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="specify_others"
                    value={formData.specify_others}
                    onChange={handleInputChange}
                    placeholder="Briefly describe your issue type"
                    className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border ${errors.specify_others
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-200 dark:border-gray-700'
                      } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary/80 focus:border-transparent transition-all duration-300`}
                  />
                  {errors.specify_others && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.specify_others}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Describe your problems <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={5}
                placeholder="Please describe your issue in detail..."
                className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border ${errors.description
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-200 dark:border-gray-700'
                  } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary/80 focus:border-transparent transition-all duration-300 resize-none`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Dialog open={submitStatus !== 'idle'} onOpenChange={handleResultDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              {submitStatus === 'success' ? (
                <>
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
                  Request submitted
                </>
              ) : submitStatus === 'error' ? (
                <>
                  <AlertCircle className="h-6 w-6 shrink-0 text-destructive" />
                  Submission failed
                </>
              ) : null}
            </DialogTitle>
            <DialogDescription className="text-left text-base text-foreground pt-1">
              {submitMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              className="w-full sm:w-auto"
              variant={submitStatus === 'error' ? 'destructive' : 'default'}
              onClick={() => handleResultDialogOpenChange(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerSupportForm;