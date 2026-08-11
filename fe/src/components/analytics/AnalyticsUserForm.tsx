// components/analytics/AnalyticsUserForm.tsx
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
import { formatImageUrl } from '@/utils/image-url';
import { Separator } from '@/components/ui/separator';
import { Upload, X, Loader2 } from 'lucide-react';
import {
  CreateAdminUserPayload,
  UpdateAdminUserPayload
} from '@/services/interface/AdminUser';
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

export function AnalyticsUserForm({ isEdit = false, userId }: { isEdit?: boolean; userId?: number }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<SimpleRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
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
          if (userData.roles && userData.roles.length > 0) {
            const firstRole = userData.roles[0];
            if (typeof firstRole === 'object' && firstRole !== null && 'id' in firstRole) {
              roleId = (firstRole as { id: number }).id;
            } else if (typeof firstRole === 'number') {
              roleId = firstRole;
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
            const formattedImg = formatImageUrl(userData.profile_img);
            if (formattedImg) {
              setProfilePreview(`${formattedImg}?t=${Date.now()}`);
            }
          }

        } catch (error) {
          console.error('Failed to load user data:', error);
          toast.error('User not found or failed to load');
          router.push('/analytics');
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
        const userPayload: CreateAdminUserPayload = {
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          email: values.email.trim(),
          user_name: values.user_name.trim(),
          phone_number: values.phone_number?.trim() || null,
          active: values.active,
          roles: values.roles,
        };

        await createUser(userPayload);
        toast.success('User created successfully!');
      }

      setTimeout(() => {
        router.push('/analytics');
        router.refresh();
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} user:\n ${errorMessage}`, {style: { whiteSpace: "pre-line" }});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">{isEdit ? 'Edit User' : 'Create New User'}</h1>
      </div>

      <Form {...userForm}>
        <form onSubmit={userForm.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Image Upload - Edit Only */}
          {isEdit && (
            <>
              <div>
                <h3 className="text-lg font-medium mb-4 text-primary">Profile Image</h3>
                <div className="flex items-center gap-6">
                  {profilePreview ? (
                    <div className="relative">
                      <img
                        src={profilePreview}
                        alt="Profile"
                        className="h-32 w-32 object-cover rounded-full border-4 border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                        onClick={removeProfileImage}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-32 w-32 border-2 border-dashed rounded-full flex items-center justify-center text-muted-foreground bg-gray-50">
                      <Upload className="h-8 w-8" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleProfileImageChange}
                      className="max-w-xs"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
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
            <h3 className={`text-lg font-medium mb-4 ${textColor}`}>Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <Input {...field} type="email" disabled={isSubmitting} placeholder="user@example.com" />
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
                      onChange={(e) => {
                        const val = e.target.value;
                        const cleaned = val.replace(/(?!^)\+/g, "").replace(/[^0-9+]/g, "");
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
            <h3 className={`text-lg font-medium mb-4 ${textColor}`}>Assign Role *</h3>
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
                          <div key={role.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition">
                            <FormLabel className="text-base font-medium cursor-pointer">
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

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-6">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push('/analytics')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
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
