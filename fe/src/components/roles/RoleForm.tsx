// components/roles/RoleForm.tsx
// components/roles/RoleForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/slices/store";
import { createNewRole, fetchRoleById, updateExistingRole } from "@/slices/roleSlice";
import { ApiErrorResponse } from "@/services/interface/Role";

const roleFormSchema = z.object({
  name: z.string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    }),
});

interface RoleFormProps {
  defaultValues?: z.infer<typeof roleFormSchema>;
  isEdit?: boolean;
  roleId?: number;
}

export function RoleForm({ defaultValues, isEdit = false, roleId }: RoleFormProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof roleFormSchema>>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: defaultValues || {
      name: "",
    },
  });

  useEffect(() => {
    if (isEdit && roleId) {
      const fetchRole = async () => {
        setLoading(true);
        try {
          const result = await dispatch(fetchRoleById(roleId)).unwrap();

          form.reset({
            name: result.data.name,
          });
        } catch (error) {
          toast.error("Failed to fetch role");
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      fetchRole();
    }
  }, [isEdit, roleId, form, dispatch, router]);

  async function onSubmit(values: z.infer<typeof roleFormSchema>) {
    setLoading(true);

    try {
      if (isEdit && roleId) {
        await dispatch(updateExistingRole({ id: roleId, payload: values })).unwrap();
        toast.success("Role updated successfully");
      } else {
        await dispatch(createNewRole(values)).unwrap();
        toast.success("Role created successfully");
      }
      router.push("/roles");
      router.refresh();
    } catch (error: unknown) {
      // Properly type and handle the error
      const apiError = error as ApiErrorResponse;
      
      console.error("Role creation/update error:", apiError);
      
      if (apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            form.setError(field as keyof z.infer<typeof roleFormSchema>, {
              type: "manual",
              message: messages.join(", "),
            });
            toast.error(`${field}: ${messages.join(", ")}`);
          }
        });
      } else {
        const errorMessage = apiError.message || "An error occurred while saving the role";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-primary">{isEdit ? "Edit Role" : "Create Role"}</h1>
        <Button
          variant="outline"
          type="button"
          onClick={() => router.push("/roles")}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Back to Roles
        </Button>
      </div>
      
      <div className="bg-card border rounded-lg p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Role name" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col justify-end">
                <div className="space-y-2">
                  <FormLabel>Status</FormLabel>
                  <p className="text-sm text-muted-foreground">Role will be active and available for assignment</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Processing..." : isEdit ? "Update Role" : "Create Role"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}