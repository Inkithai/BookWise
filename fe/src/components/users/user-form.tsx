// components/users/user-form-simplified.tsx - REMOVED Actions button
'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  getUserById, 
  createUser, 
  updateUser,
  validateImageFile,
  http
} from '@/services/service';
import { Separator } from '@/components/ui/separator';
import { Upload, X, Loader2 } from 'lucide-react';
import { 
  CreateAdminUserPayload,
  UpdateAdminUserPayload 
} from '@/services/interface/AdminUser';
import BookWiseExistingAccountAlert from '@/components/auth/BookWiseExistingAccountAlert';
import {
  getExistingAccountFromError,
  type ExistingAccountField,
} from '@/lib/bookwise-existing-account';
import { useTheme } from 'next-themes';

interface SimpleRole {
  id: number;
  name: string;
}

interface RoleResponse {
  id?: number;
  name: string;
  action?: string;
}

interface ApiRolesResponse {
  data: {
    data: RoleResponse[];
  };
}

const formSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  user_name: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().optional()
  .refine(
    (val: any) => !val || val.length >= 6,
    { message: "Phone number must be at least 6 digits" }
  ),
  company_designation: z.string().optional().or(z.literal('')).or(z.null()),
  short_bio: z.string().optional().or(z.literal('')).or(z.null()),
  location: z.string().optional().or(z.literal('')).or(z.null()),
  active: z.number().min(0).max(1),
  roles: z.number().min(1, "Please select a role"),
});

type FormValues = z.infer<typeof formSchema>;

export function UserForm({ isEdit = false, userId }: { isEdit?: boolean; userId?: number }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<SimpleRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [existingAccount, setExistingAccount] = useState<ExistingAccountField | null>(null);
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? 'text-white' : 'text-primary';

  const userForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone_number: '',
      email: '',
      user_name: '',
      company_designation: '',
      short_bio: '',
      location: '',
      active: 1,
      roles: 1,
    }
  });

  // Load roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setRolesLoading(true);
        const response = await http.get('admin/roles') as ApiRolesResponse;
        
        if (response?.data?.data && Array.isArray(response.data.data)) {
          const rolesData: SimpleRole[] = response.data.data.map((role: RoleResponse, index: number) => {
            let roleId = role.id;
            if (!roleId && role.action) {
              const idMatch = role.action.match(/data-id="(\d+)"/);
              if (idMatch) roleId = parseInt(idMatch[1]);
            }
            if (!roleId) roleId = index + 1;
            
            return { id: roleId, name: role.name };
          });
          
          // Remove duplicates based on role name (same role name = same role)
          const uniqueRoles = rolesData.filter((role, index, self) => 
            index === self.findIndex((r) => r.name === role.name)
          );
          
          setAvailableRoles(uniqueRoles);
          
          if (!isEdit && uniqueRoles.length > 0) {
            userForm.setValue('roles', uniqueRoles[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load roles:', error);
        toast.error('Failed to load roles from server.');
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, [isEdit, userForm]);

  // Load user data for editing
  useEffect(() => {
    if (isEdit && userId && !rolesLoading && availableRoles.length > 0) {
      const loadUserData = async () => {
        try {
          setIsSubmitting(true);
          const userData = await getUserById(userId);

          let roleId: number = availableRoles[0].id;
          const normalizeRoleName = (s: string) => String(s).trim().toLowerCase().replace(/\s+/g, '-');
          if (userData.roles && userData.roles.length > 0) {
            const firstRole = userData.roles[0];
            if (typeof firstRole === 'object' && firstRole !== null && firstRole !== undefined) {
              const obj = firstRole as { id?: number; name?: string };
              if (typeof obj.id === 'number') {
                roleId = obj.id;
              } else if (typeof obj.name === 'string') {
                const byName = availableRoles.find((r) => normalizeRoleName(r.name) === normalizeRoleName(obj.name!));
                if (byName) roleId = byName.id;
              }
            } else if (typeof firstRole === 'number') {
              roleId = firstRole;
            } else if (typeof firstRole === 'string') {
              // API returns role names e.g. ["team-member"]; match by name (case-insensitive, normalize spaces/hyphens)
              const byName = availableRoles.find((r) => normalizeRoleName(r.name) === normalizeRoleName(firstRole));
              if (byName) roleId = byName.id;
            }
          }

          let activeValue = 1;
          if (typeof userData.is_active === 'string') {
            activeValue = userData.is_active.toLowerCase() === 'active' ? 1 : 0;
          } else if (typeof userData.is_active === 'number') {
            activeValue = userData.is_active;
          }

          const userFormData: FormValues = {
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            phone_number: userData.phone || userData.phone_number || '',
            email: userData.email || '',
            user_name: userData.user_name || '',
            company_designation: userData.company_designation || '',
            short_bio: userData.short_bio || userData.company?.bio || '',
            location: userData.location || '',
            active: activeValue,
            roles: roleId,
          };

          userForm.reset(userFormData);

          if (userData.profile_img) {
            setProfilePreview(`${userData.profile_img}?t=${Date.now()}`);
          }
          
        } catch (error) {
          console.error('Failed to load user data:', error);
          toast.error('User not found or failed to load');
          router.push('/users');
        } finally {
          setIsSubmitting(false);
        }
      };
      
      loadUserData();
    }
  }, [isEdit, userId, userForm, router, rolesLoading, availableRoles]);

  // Handle profile image change
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      e.target.value = '';
      return;
    }

    setProfileFile(file);
    
    if (profilePreview && profilePreview.startsWith('blob:')) {
      URL.revokeObjectURL(profilePreview);
    }
    
    const previewUrl = URL.createObjectURL(file);
    setProfilePreview(previewUrl);
  };

  const removeProfileImage = () => {
    if (profilePreview && profilePreview.startsWith('blob:')) {
      URL.revokeObjectURL(profilePreview);
    }
    setProfileFile(null);
    setProfilePreview(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (profilePreview && profilePreview.startsWith('blob:')) {
        URL.revokeObjectURL(profilePreview);
      }
    };
  }, [profilePreview]);

  // Submit user form
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      setIsSubmitting(true);
      setExistingAccount(null);
      console.log('Submitting user form with values:', values);
      
      if (!values.roles) {
        toast.error('Please select a role');
        setIsSubmitting(false);
        return;
      }
      
      if (isEdit && userId) {
        const userPayload: UpdateAdminUserPayload = {
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          email: values.email.trim(),
          user_name: values.user_name.trim(),
          phone_number: values.phone_number?.trim() || null,
          company_designation: values.company_designation?.trim() || null,
          short_bio: values.short_bio?.trim() || null,
          location: values.location?.trim() || null,
          active: values.active,
          roles: values.roles,
        };

        if (profileFile) {
          userPayload.profile_img = profileFile;
        }

        await updateUser(userId, userPayload);
        toast.success('User updated successfully!');
        
      } else {
        const selectedRole = availableRoles.find((r) => r.id === values.roles);

        const userPayload: CreateAdminUserPayload = {
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          email: values.email.trim(),
          user_name: values.user_name.trim(),
          phone_number: values.phone_number?.trim() || null,
          active: values.active,
          roles: values.roles,
          role_name: selectedRole?.name,
        };

        await createUser(userPayload);
        toast.success('User created successfully!');
      }
      
      setTimeout(() => {
        router.push('/users');
        router.refresh();
      }, 1000);
      
    } catch (error) {
      const err = error as Error & {
        fieldErrors?: Record<string, string[]>;
        existingAccount?: ExistingAccountField;
      };
      const existingAccount =
        err.existingAccount || getExistingAccountFromError(err);

      if (existingAccount && !isEdit) {
        setExistingAccount(existingAccount);
        return;
      }

      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        for (const [field, msgs] of Object.entries(err.fieldErrors)) {
          userForm.setError(field as keyof FormValues, { message: msgs[0] });
        }
        const first =
          err.fieldErrors.email?.[0] ||
          err.fieldErrors.user_name?.[0] ||
          err.fieldErrors.phone_number?.[0] ||
          err.message;
        toast.error(first || 'Could not save user. Please fix the highlighted fields.');
      } else {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';
        toast.error(
          isEdit
            ? errorMessage || 'Failed to update user.'
            : errorMessage || 'Failed to create user.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">{isEdit ? 'Edit User' : 'Create New User'}</h1>
        {/* REMOVED: Actions button - all user management is done from the users table */}
      </div>

      <Form {...userForm}>
        <form onSubmit={userForm.handleSubmit(onSubmit)} className="space-y-6">
          {existingAccount && !isEdit && (
            <BookWiseExistingAccountAlert
              field={existingAccount}
              featureName="Invoice"
            />
          )}
          {/* Profile Image Upload - Edit Only */}
          {isEdit && (
            <>
              <div>
                <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-primary">Profile Image</h3>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {profilePreview ? (
                    <div className="relative">
                      <img 
                        src={profilePreview} 
                        alt="Profile" 
                        className="h-24 w-24 object-cover rounded-full border-4 border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={removeProfileImage}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 border-2 border-dashed rounded-full flex items-center justify-center text-muted-foreground bg-gray-50">
                      <Upload className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 w-full">
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleProfileImageChange}
                      className="w-full max-w-full sm:max-w-xs min-h-[44px]"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      JPEG/PNG only. Max 2MB. {profileFile ? `Current: ${Math.round(profileFile.size / 1024)}KB` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Personal Information */}
          <div>
            <h3 className={`text-base sm:text-lg font-medium mb-3 sm:mb-4 ${textColor}`}>Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={userForm.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} placeholder="e.g., Max" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} placeholder="e.g., Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" inputMode="email" disabled={isSubmitting} placeholder="user@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="user_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} placeholder="e.g., max-doe123" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                      {...field} 
                      disabled={isSubmitting} 
                      placeholder="+1234567890" 
                      inputMode="tel"
                      onChange={(e) => {
                        const val = e.target.value;
                        const cleaned = val.replace(/(?!^)\+/g,"") .replace(/[^0-9+]/g, ""); 
                        field.onChange(cleaned);
                      }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEdit && (
                <>
                  <FormField
                    control={userForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} disabled={isSubmitting} placeholder="e.g., New York" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="company_designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Designation</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} disabled={isSubmitting} placeholder="e.g., Manager" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {isEdit && (
              <div className="mt-4">
                <FormField
                  control={userForm.control}
                  name="short_bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Bio</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} rows={3} disabled={isSubmitting} placeholder="Brief description about the user" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Role Selection */}
          <div>
            <h3 className={`text-base sm:text-lg font-medium mb-3 sm:mb-4 ${textColor}`}>Assign Role *</h3>
            {rolesLoading ? (
              <div className="p-4 rounded-lg border flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm text-gray-500">Loading roles...</p>
              </div>
            ) : (
              <FormField
                control={userForm.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-3">
                      {availableRoles && availableRoles.length > 0 ? (
                        availableRoles.map((role: SimpleRole) => (
                          <div key={role.id} className="flex items-center justify-between rounded-lg border p-3 sm:p-4 hover:bg-muted dark:hover:bg-muted/50 transition min-h-[44px]">
                            <FormLabel className="text-sm sm:text-base font-medium cursor-pointer">
                              {role.name}
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value === role.id}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange(role.id);
                                  }
                                }}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-lg border bg-yellow-50">
                          <p className="text-sm text-yellow-900">No roles available</p>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <Separator />

          {/* Form Actions - Sticky on mobile */}
          <div className="sticky bottom-4 bg-background/95 backdrop-blur-sm rounded-lg p-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 mt-8 z-10 shadow-lg border">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => router.push('/users')}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? 'Save User Changes' : 'Create User'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}