// components/profile/Profile.tsx
'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAppDispatch, useAppSelector } from '@/slices/hooks';
import { changeCompanyDetails, ChangeCompanyDetailsPayload, createCompanyAccount, deleteCompany, getCurrentUser, resetPassword, switchAccountContext, toggleCompanyStatus, updateUser, validateImageFile } from '@/services/service';
import { toast } from 'sonner';
import { setAuthUser, setAuthUserFromRawData, setFullUser } from '@/slices/authSlice';
import { clearAll } from '@/slices/invoiceSlice';
import { User, mapUser, RawUserData } from '@/services/interface/User';
import { UpdateAdminUserPayload } from '@/services/interface/AdminUser';
import { CURRENCY_OPTIONS } from '@/services/interface/invoice';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, Trash2, Settings } from 'lucide-react';
import { getResolvedActiveCompanyId, getResolvedContextType, isSubUser, normalizeAvailableCompanies } from '@/utils/account-context';
import { formatImageUrl } from '@/utils/image-url';
import { SidebarColorPicker, themeNameToHex, resolveThemeName } from '@/components/common/sidebar/SidebarColorPicker';
import { changeUserTheme } from '@/services/service';
import { useRouter } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Profile() {
  const { theme } = useTheme();
  const router = useRouter();
  const [changePassword, setChangePassword] = useState(false);
  const [loading, setLoading] = useState({ page: true, submit: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<string>('personal')
  const [currentContextType, setCurrentContextType] = useState<'personal' | 'company'>('personal')
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null)
  const [linkedCompanies, setLinkedCompanies] = useState<Array<{ id: number; company_name: string; is_active: boolean }>>([])
  const [switchingCompanyId, setSwitchingCompanyId] = useState<number | null>(null)
  const [togglingCompanyId, setTogglingCompanyId] = useState<number | null>(null)
  const [isRemove, setIsRemove] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deletingCompanyId, setDeletingCompanyId] = useState<number | null>(null)
  const [addCompanyOpen, setAddCompanyOpen] = useState(false)
  const [addCompanyLoading, setAddCompanyLoading] = useState(false)
  const [userIsSubUser, setUserIsSubUser] = useState(false)
  const [sidebarTheme, setSidebarTheme] = useState('white')
  const [sidebarThemeDraft, setSidebarThemeDraft] = useState('white')
  const [sidebarThemeSaving, setSidebarThemeSaving] = useState(false)
  const [addCompanySetup, setAddCompanySetup] = useState({
    company_name: '',
    business_email: '',
    company_address: '',
    company_currency: 'LKR',
  })
  // Form state with all user fields from API
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneNumber: '',
    userName: '',
    location: '',
    companyDesignation: '',
    shortBio: '',
    isActive: '1',
    roles: [] as number[],
    company: {
      company_name: '',
      company_currency: '',
    },
    socialLinks: {
      facebook: '',
      instagram: '',
      linkedin: '',
      twitter: ''
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    password_confirmation: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(state => state.auth.user);
  const userId = currentUser?.id;

  // Theme-based styling
  const textColor = theme === 'dark' ? 'text-white' : 'text-primary';
  const labelColor = theme === 'dark' ? 'text-gray-300' : '';
  const inputClasses = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : '';
  const buttonOutlineClasses = theme === 'dark' ? 'border-gray-700 hover:bg-gray-800' : '';

  // Sidebar theme helper functions
  const getSidebarThemeStorageKey = (
    contextType: 'personal' | 'company',
    companyId?: number | null,
    userData?: any
  ) => {
    const resolvedUserId = Number(userData?.id ?? currentUser?.id)
    const userScope = Number.isFinite(resolvedUserId) && resolvedUserId > 0 ? `user:${resolvedUserId}` : 'user:unknown'
    if (contextType === 'company' && companyId) return `sidebarTheme:${userScope}:company:${companyId}`
    return `sidebarTheme:${userScope}:personal`
  }

  const getScopedSidebarTheme = (
    contextType: 'personal' | 'company',
    companyId?: number | null,
    userData?: any
  ) => {
    const scopedKey = getSidebarThemeStorageKey(contextType, companyId, userData)
    const fromLocalStorage = localStorage.getItem(scopedKey)
    if (fromLocalStorage) return fromLocalStorage
    // Sub-users should not inherit the parent sidebar color implicitly.
    // If they haven't chosen a color yet, keep a neutral default.
    if (isSubUser(userData)) return 'white'
    if (userData?.theme_color) {
      return resolveThemeName(userData.theme_color)
    }
    return 'white'
  }

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await getCurrentUser();

        if (response?.data) {
          const userData = mapUser(response.data);
          setAccountType(response.data.account_type)
          setUserIsSubUser(isSubUser(response.data))
          const contextType = getResolvedContextType(response?.data)
          setCurrentContextType(contextType)
          setActiveCompanyId(getResolvedActiveCompanyId(response?.data))
          
          // Initialize sidebar theme
          const scopedSidebar = getScopedSidebarTheme(contextType, getResolvedActiveCompanyId(response?.data), response.data)
          setSidebarTheme(scopedSidebar)
          setSidebarThemeDraft(scopedSidebar)
          
          const companies = normalizeAvailableCompanies(
            Array.isArray(response?.data?.available_companies) ? response.data.available_companies : []
          ).map((c) => ({
            id: c.id,
            company_name: c.company_name,
            is_active: c.is_active ?? false,
          }))
          setLinkedCompanies(companies)

          // Get role IDs from current user - ensure they're numbers
          let userRoleIds: number[] = [];
          if (response.data.roles && response.data.roles.length > 0) {
            userRoleIds = response.data.roles.map((role: any) => {
              if (typeof role === 'object' && role.id) {
                return Number(role.id);
              }
              return typeof role === 'string' ? Number(role) : Number(role);
            }).filter((id: any) => !isNaN(id));
          }

          // Ensure is_active is a string that can be converted to number
          const isActiveValue = userData.is_active === '1' || userData.is_active === 'Active' ? '1' : '0';

          setFormData({
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            phoneNumber: userData.phone_number || userData.phone || '',
            userName: userData.user_name || '',
            location: userData.location || '',
            companyDesignation: userData.company_designation || '',
            shortBio: userData.short_bio || '',
            isActive: isActiveValue,
            roles: userRoleIds.length > 0 ? userRoleIds : [2], // Default to user role (2)
            company: {
              company_name: userData.company?.company_name || '',
              company_currency: 'LKR'
            },
            socialLinks: {
              facebook: userData.social_links?.facebook || '',
              instagram: userData.social_links?.instagram || '',
              linkedin: userData.social_links?.linkedin || '',
              twitter: userData.social_links?.twitter || ''
            }
          });

          // Set profile image preview if available, or clear it if removed
          if (userData.profile_img) {
            const formattedUrl = formatImageUrl(userData.profile_img);
            setProfileImagePreview(formattedUrl ? formattedUrl + '?t=' + Date.now() : userData.profile_img);
          } else {
            setProfileImagePreview(null);
          }

          dispatch(setAuthUser(userData));
        } else {
          toast.error('Unexpected response format from server');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to fetch user data.');
      } finally {
        setLoading(prev => ({ ...prev, page: false }));
      }
    };

    fetchCurrentUser();
  }, [dispatch]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
      setIsRemove(false)
    }
  };

  const handleRemoveImage = () => {
    setIsRemove(true)
    setProfileImage(null);
    setProfileImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;

    // Handle nested fields (company and socialLinks)
    if (id.startsWith('company.')) {
      const field = id.split('.')[1];
      setFormData(prev => ({
        ...prev,
        company: {
          ...prev.company,
          [field]: value
        }
      }));
    } else if (id.startsWith('socialLinks.')) {
      const field = id.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }

    if (errors[id]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPasswordData(prev => ({ ...prev, [id]: value }));

    if (errors[id]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, submit: true }));
    setErrors({});

    // Validate phone number if provided (7-15 digits)
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
      if (phoneDigits.length < 7) {
        setErrors({ phone_number: 'Phone number must be at least 7 digits' });
        setLoading(prev => ({ ...prev, submit: false }));
        return;
      }
      if (phoneDigits.length > 15) {
        setErrors({ phone_number: 'Phone number must not exceed 15 digits' });
        setLoading(prev => ({ ...prev, submit: false }));
        return;
      }
    }

    try {
      // First handle password change if needed
      if (changePassword) {
        // Password validation
        if (passwordData.newPassword !== passwordData.password_confirmation) {
          setErrors({ password_confirmation: 'Passwords do not match' });
          setLoading(prev => ({ ...prev, submit: false }));
          return;
        }

        if (passwordData.newPassword.length < 8) {
          setErrors({ newPassword: 'Password must be at least 8 characters' });
          setLoading(prev => ({ ...prev, submit: false }));
          return;
        }

        await resetPassword(
          formData.email,
          passwordData.newPassword,
          passwordData.password_confirmation
        );

        toast.success('Password updated successfully');
        setChangePassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          password_confirmation: ''
        });
      }

      // Then update user profile using the same API as admin users
      if (userId) {
        // Prepare payload matching UpdateAdminUserPayload interface
        // Ensure roles and active are numbers
        const updatePayload: UpdateAdminUserPayload = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          user_name: formData.userName,
          phone_number: formData.phoneNumber || null,
          company_designation: formData.companyDesignation || null,
          short_bio: formData.shortBio || null,
          location: formData.location || null,
          is_remove: isRemove,
          ...(profileImage ? { profile_img: profileImage } : {}),
          _method: 'PUT'
        };

        if (accountType.toLowerCase() == "personal" && formData.company.company_currency) {
          const companyPayload: ChangeCompanyDetailsPayload = {
            company_currency: formData.company.company_currency,
            company_name: formData.company.company_name
          }
          let res = await changeCompanyDetails(companyPayload)
          if (res.success) {
            localStorage.setItem('company_currency', formData.company.company_currency || 'LKR')
          }

        }

        const response = await updateUser(userId, updatePayload);

        if (response.success) {
          // Update the user in Redux store with the API response
          let updatedUserData = response.data as RawUserData;
          // Cache-bust profile_img in Redux so sidebar/avatar updates immediately
          if (updatedUserData.profile_img) {
            const formattedUrl = formatImageUrl(updatedUserData.profile_img);
            updatedUserData = { ...updatedUserData, profile_img: formattedUrl ? formattedUrl + '?t=' + Date.now() : updatedUserData.profile_img };
          }
          dispatch(setAuthUserFromRawData(updatedUserData));

          toast.success('Profile updated successfully');

          // Reset image state after successful upload
          if (profileImage) {
            setProfileImage(null);
            // Keep the preview as it's now the server URL
            if (response.data.profile_img) {
              const formattedUrl = formatImageUrl(response.data.profile_img);
              setProfileImagePreview(formattedUrl ? formattedUrl + '?t=' + Date.now() : response.data.profile_img);
            }
          }

          // Clear preview when image was removed
          if (isRemove && !response.data.profile_img) {
            setProfileImagePreview(null);
            setIsRemove(false);
          }
        } else {
          throw new Error(response.message || 'Failed to update profile');
        }
      }
    } catch (error: unknown) {
      console.error('Profile update error:', error);

      // Handle API errors
      if (error instanceof Error) {
        // Check if it's a validation error with specific messages
        if (error.message.includes('Validation failed:')) {
          const errorMessages = error.message.split('Validation failed: ')[1];
          toast.error(`Validation failed: ${errorMessages}`);
        } else if (error.message.includes('Session expired')) {
          toast.error('Session expired. Please login again.');
        } else {
          toast.error(error.message || 'Failed to update profile');
        }
      } else {
        toast.error('Failed to update profile');
      }
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const handleCancel = () => {
    // Reset form to original user data
    if (currentUser) {
      // Get role IDs from current user - ensure they're numbers
      let userRoleIds: number[] = [];
      if (currentUser.roles && currentUser.roles.length > 0) {
        userRoleIds = currentUser.roles.map((role: any) => {
          if (typeof role === 'object' && role.id) {
            return Number(role.id);
          }
          return typeof role === 'string' ? Number(role) : Number(role);
        }).filter(id => !isNaN(id));
      }

      // Ensure is_active is a string that can be converted to number
      const isActiveValue = currentUser.is_active === '1' || currentUser.is_active === 'Active' ? '1' : '0';
      setFormData({
        firstName: currentUser.first_name || '',
        lastName: currentUser.last_name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        phoneNumber: currentUser.phone_number || currentUser.phone || '',
        userName: currentUser.user_name || '',
        location: currentUser.location || '',
        companyDesignation: currentUser.company_designation || '',
        shortBio: currentUser.short_bio || '',
        isActive: isActiveValue,
        roles: userRoleIds.length > 0 ? userRoleIds : [2],
        company: {
          company_name: currentUser.company?.company_name || '',
          company_currency: currentUser.company.company_currency || '',
        },
        socialLinks: {
          facebook: currentUser.social_links?.facebook || '',
          instagram: currentUser.social_links?.instagram || '',
          linkedin: currentUser.social_links?.linkedin || '',
          twitter: currentUser.social_links?.twitter || ''
        }
      });

      setProfileImage(null);
      setProfileImagePreview(currentUser.profile_img || null);
      setIsRemove(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }

    setChangePassword(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      password_confirmation: ''
    });
    setErrors({});
  };

  const waitForContext = async (target: { type: 'personal' | 'company'; companyId?: number | null }) => {
    for (let i = 0; i < 4; i++) {
      const me = await getCurrentUser();
      const userData = (me as any)?.data ?? me;
      const ctxType = getResolvedContextType(userData);
      const activeCompanyId = getResolvedActiveCompanyId(userData);
      const companyMatches = target.type === 'personal' ? true : activeCompanyId === (target.companyId ?? null);
      if (ctxType === target.type && companyMatches) return userData;
      await new Promise((resolve) => setTimeout(resolve, 140));
    }
    return null;
  };

  const handleSwitchToLinkedCompany = async (companyId: number) => {
    try {
      setSwitchingCompanyId(companyId)
      toast.info('Switching to selected company account...')
      await switchAccountContext({ type: 'company', company_id: companyId })
      const confirmedUser = await waitForContext({ type: 'company', companyId })
      const fallbackResponse = confirmedUser ? null : await getCurrentUser()
      const userData = confirmedUser ?? ((fallbackResponse as any)?.data ?? fallbackResponse)
      if (userData?.id) {
        dispatch(setAuthUser(userData))
        dispatch(setFullUser(userData))
      }
      toast.success('Switched to company account. Opening dashboard...')
      dispatch(clearAll())
      window.dispatchEvent(new CustomEvent('account-context-changed', { detail: { type: 'company', companyId } }))
      window.location.assign('/dashboard')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to switch company account')
    } finally {
      setSwitchingCompanyId(null)
    }
  }

  const handleToggleLinkedCompany = async (companyId: number, nextActive: boolean) => {
    try {
      setTogglingCompanyId(companyId)
      toast.info(nextActive ? 'Activating company account...' : 'Deactivating company account...')
      await toggleCompanyStatus({ company_id: companyId, is_active: nextActive })
      const refreshed = await getCurrentUser()
      const companies = normalizeAvailableCompanies(
        Array.isArray(refreshed?.data?.available_companies) ? refreshed.data.available_companies : []
      ).map((c) => ({
        id: c.id,
        company_name: c.company_name,
        is_active: c.is_active ?? false,
      }))
      setLinkedCompanies(companies)
      toast.success(nextActive ? 'Company account activated' : 'Company account deactivated')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update company status')
    } finally {
      setTogglingCompanyId(null)
    }
  }

  const handleDeleteCompany = async (companyId: number) => {
    try {
      setDeletingCompanyId(companyId)
      await deleteCompany({ company_id: companyId })
      const refreshed = await getCurrentUser()
      const companies = normalizeAvailableCompanies(
        Array.isArray(refreshed?.data?.available_companies) ? refreshed.data.available_companies : []
      ).map((c) => ({
        id: c.id,
        company_name: c.company_name,
        is_active: c.is_active ?? false,
      }))
      setLinkedCompanies(companies)
      toast.success('Company deleted successfully')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete company')
    } finally {
      setDeletingCompanyId(null)
      setDeleteConfirmId(null)
    }
  }

  const handleAddCompany = async () => {
    if (userIsSubUser) {
      toast.error('Sub-users cannot create company profiles.')
      return
    }
    if (currentContextType === 'company') {
      toast.error('Company accounts cannot create other companies.')
      return
    }
    if (!addCompanySetup.company_name.trim()) return toast.error('Business name is required')
    if (!addCompanySetup.business_email.trim()) return toast.error('Business email is required')
    try {
      setAddCompanyLoading(true)
      toast.info('Creating company profile...')
      const created = await createCompanyAccount({
        company_name: addCompanySetup.company_name.trim(),
        business_email: addCompanySetup.business_email.trim(),
        company_currency: 'LKR',
        company_address: addCompanySetup.company_address.trim() || undefined,
      })
      const parseId = (v: any) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null }
      const createdId = parseId(
        created?.data?.current_context?.company_id ??
        created?.data?.active_company_id ??
        created?.data?.available_companies?.[0]?.id
      )
      if (createdId) {
        await switchAccountContext({ type: 'company', company_id: createdId })
        await waitForContext({ type: 'company', companyId: createdId })
      }
      const refreshed = await getCurrentUser()
      const userData = (refreshed as any)?.data ?? refreshed
      if (userData?.id) {
        dispatch(setAuthUser(userData))
        dispatch(setFullUser(userData))
      }
      toast.success('Company created. Opening company details...')
      setAddCompanyOpen(false)
      window.location.assign('/company?mode=company&setup_roles=1')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create company')
    } finally {
      setAddCompanyLoading(false)
    }
  }

  const handleSwitchToPersonalContext = async () => {
    try {
      setSwitchingCompanyId(-1)
      toast.info('Switching to personal account...')
      await switchAccountContext({ type: 'personal' })
      const confirmedUser = await waitForContext({ type: 'personal' })
      const fallbackResponse = confirmedUser ? null : await getCurrentUser()
      const userData = confirmedUser ?? ((fallbackResponse as any)?.data ?? fallbackResponse)
      if (userData?.id) {
        dispatch(setAuthUser(userData))
        dispatch(setFullUser(userData))
      }
      toast.success('Switched to personal account')
      dispatch(clearAll())
      window.dispatchEvent(new CustomEvent('account-context-changed', { detail: { type: 'personal' } }))
      window.location.assign('/dashboard')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to switch to personal account')
    } finally {
      setSwitchingCompanyId(null)
    }
  }

  const saveSidebarTheme = async (theme: string) => {
    const scopedKey = getSidebarThemeStorageKey(currentContextType, activeCompanyId, currentUser)
    localStorage.setItem(scopedKey, theme)
    window.dispatchEvent(
      new CustomEvent('sidebarThemeChanged', {
        detail: { theme, key: scopedKey },
      })
    )
    const themeColor = await changeUserTheme({ theme_color: themeNameToHex(theme) })
    if (themeColor?.success) toast.success(themeColor.message)
  }

  const handleSidebarThemeDraftChange = (theme: string) => {
    setSidebarThemeDraft(theme)
  }

  const handleSidebarThemeSave = async () => {
    if (sidebarThemeDraft === sidebarTheme) return
    try {
      setSidebarThemeSaving(true)
      await saveSidebarTheme(sidebarThemeDraft)
      setSidebarTheme(sidebarThemeDraft)
      router.refresh()
      toast.success('Sidebar color saved')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save sidebar color')
    } finally {
      setSidebarThemeSaving(false)
    }
  }

  if (loading.page) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-100% space-y-8">
      {switchingCompanyId !== null && (
        <div className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-xl bg-background border border-border shadow-xl px-6 py-5 min-w-[280px]">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9">
                <img src="/logo.png" alt="Loading" className="w-9 h-9 rounded-md object-contain animate-pulse" />
                <div className="absolute -right-2 -bottom-2 w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Switching...</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Image Section */}
        <section className="space-y-6 p-6 bg-card rounded-lg shadow">
          <h2 className={`text-xl font-semibold text-primary`}>Profile Image</h2>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {profileImagePreview ? (
                  <img
                    src={profileImagePreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-4xl">
                    {formData.firstName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <Label htmlFor="profile_img" className={labelColor}>Upload New Photo</Label>
                <Input
                  id="profile_img"
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageChange}
                  className={`${inputClasses} cursor-pointer`}
                  disabled={loading.submit}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  JPEG or PNG only. Max size 2MB.
                </p>
              </div>
              {profileImagePreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={loading.submit}
                  className={buttonOutlineClasses}
                >
                  Remove Image
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Personal Information Section */}
        <section className="space-y-6 p-6 bg-card rounded-lg shadow">
          <h2 className={`text-xl font-semibold ${textColor}`}>Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName" className={labelColor}>First Name *</Label>
              <Input
                id="firstName"
                type="text"
                className={inputClasses}
                value={formData.firstName}
                onChange={handleChange}
                disabled={loading.submit}
                required
              />
              {errors.first_name && <p className="text-sm text-red-500">{errors.first_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className={labelColor}>Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                className={inputClasses}
                value={formData.lastName}
                onChange={handleChange}
                disabled={loading.submit}
                required
              />
              {errors.last_name && <p className="text-sm text-red-500">{errors.last_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="userName" className={labelColor}>Username *</Label>
              <Input
                id="userName"
                type="text"
                className={inputClasses}
                value={formData.userName}
                onChange={handleChange}
                disabled={loading.submit}
                required
              />
              {errors.user_name && <p className="text-sm text-red-500">{errors.user_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className={labelColor}>Email *</Label>
              <Input
                id="email"
                type="email"
                className={inputClasses}
                value={formData.email}
                onChange={handleChange}
                disabled={loading.submit}
                required
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className={labelColor}>Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                className={inputClasses}
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={loading.submit}
                placeholder="+1234567890"
              />
              {errors.phone_number && <p className="text-sm text-red-500">{errors.phone_number}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className={labelColor}>Location</Label>
              <Input
                id="location"
                type="text"
                className={inputClasses}
                value={formData.location}
                onChange={handleChange}
                disabled={loading.submit}
                placeholder="City, Country"
              />
            </div>
          </div>
          {accountType.toLowerCase() == "personal" && (
            <div className="space-y-2">
              {/*
  <Label htmlFor="companyCurrency" className={labelColor}>
    Currency
  </Label>

  <select
    id="company.company_currency"
    className={inputClasses}
    value={formData.company.company_currency || 'LKR'}
    onChange={handleChange}
    disabled={loading.submit}
  >
    <option value="" disabled>
      Select currency
    </option>

    {CURRENCY_OPTIONS.map((currency) => (
      <option key={currency.value} value={currency.value}>
        {currency.symbol} {currency.value} — {currency.label.split(" - ")[1]}
      </option>
    ))}
  </select>
  */}
            </div>)}


          <div className="space-y-2">
            <Label htmlFor="companyDesignation" className={labelColor}>Company Designation</Label>
            <Input
              id="companyDesignation"
              type="text"
              className={inputClasses}
              value={formData.companyDesignation}
              onChange={handleChange}
              disabled={loading.submit}
              placeholder="e.g., CEO, Developer, Manager"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortBio" className={labelColor}>Short Bio</Label>
            <Textarea
              id="shortBio"
              className={`min-h-[100px] ${inputClasses}`}
              value={formData.shortBio}
              onChange={handleChange}
              disabled={loading.submit}
              placeholder="Tell us a little about yourself..."
            />
          </div>
        </section>



        {/* Password Change Section */}
        <section className="space-y-6 p-6 bg-card rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${textColor}`}>Password Settings</h2>
            <Switch
              checked={changePassword}
              onCheckedChange={setChangePassword}
              disabled={loading.submit}
            />
          </div>

          {changePassword && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className={labelColor}>Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  className={inputClasses}
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  disabled={loading.submit}
                />
                {errors.currentPassword && <p className="text-sm text-red-500">{errors.currentPassword}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className={labelColor}>New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  className={inputClasses}
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  disabled={loading.submit}
                />
                {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirmation" className={labelColor}>Confirm Password</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  placeholder="Confirm new password"
                  className={inputClasses}
                  value={passwordData.password_confirmation}
                  onChange={handlePasswordChange}
                  disabled={loading.submit}
                />
                {errors.password_confirmation && (
                  <p className="text-sm text-red-500">{errors.password_confirmation}</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6">
          <Button
            variant="outline"
            className={buttonOutlineClasses}
            type="button"
            disabled={loading.submit}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading.submit}>
            {loading.submit ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : 'Save Changes'}
          </Button>
        </div>
      </form>

    </div>
  );
}