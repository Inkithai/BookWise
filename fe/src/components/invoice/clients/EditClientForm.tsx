// components/invoice/clients/EditClientForm.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, SubmitHandler, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft } from "lucide-react"
import { getInvoiceClient, getInvoiceClients, updateInvoiceClient } from "@/services/invoice.service"
import { Client, nullableClientField } from "@/services/interface/invoice"
import { getCurrentUser, switchAccountContext } from "@/services/service"

// Zod schema - using literal union for required enum
const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  telephone: z
  .string()
  .optional()
  .nullable()
  .refine(
    (v) => !v || /^\+?\d{7,15}$/.test(v),
    "Invalid phone number"
  ),
  address_no: z.string().optional().nullable(),
  address_street: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_town: z.string().optional().nullable(),
  address_postcode: z.string().optional().nullable(),
  address_county: z.string().optional().nullable(),
  address_country: z.string().optional().nullable(),
  client_type: z.literal("Personal").or(z.literal("Business")),
  company_registration_number: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
  utr: z.string().optional().nullable(),
})
// .refine(
//   (data) => {
//     if (data.client_type === "Business") {
//       return (
//         data.company_registration_number?.trim() &&
//         data.vat_number?.trim() &&
//         data.utr?.trim()
//       );
//     }
//     return true;
//   },
//   {
//     message: "Business clients require company registration number, VAT number, and UTR",
//     path: ["company_registration_number"],
//   }
// );

type ClientFormValues = z.infer<typeof clientSchema>;

interface ApiError {
  message?: string;
}

interface EditClientFormProps {
  clientId: string;
}

export function EditClientForm({ clientId }: EditClientFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const contextType = searchParams.get("context");
  const contextCompanyId = Number(searchParams.get("company_id"));

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const switchAndConfirmContext = async (target: { type: 'personal' | 'company'; companyId: number | null }) => {
    if (target.type === "company" && target.companyId) {
      await switchAccountContext({ type: "company", company_id: target.companyId });
    } else {
      await switchAccountContext({ type: "personal" });
    }

    for (let i = 0; i < 6; i++) {
      const meResponse = await getCurrentUser();
      const me = (meResponse as any)?.data ?? meResponse;
      const currentType: 'personal' | 'company' =
        me?.current_context?.type === 'company' ? 'company' : 'personal';
      const rawCompanyId = Number(me?.current_context?.company_id ?? me?.active_company_id);
      const currentCompanyId = Number.isFinite(rawCompanyId) && rawCompanyId > 0 ? rawCompanyId : null;

      const companyMatches = target.type === 'personal' ? true : currentCompanyId === target.companyId;
      if (currentType === target.type && companyMatches) return;
      await wait(120);
    }
  };

  const resolveOwnerContext = async (
    candidates: Array<{ type: 'personal' | 'company'; companyId: number | null }>,
    targetClientId: number
  ): Promise<{ type: 'personal' | 'company'; companyId: number | null } | null> => {
    for (const candidate of candidates) {
      try {
        await switchAndConfirmContext(candidate);
        const clients = await getInvoiceClients();
        if (clients.some((c) => Number(c?.id) === targetClientId)) {
          return candidate;
        }
      } catch {
        // Continue with next candidate
      }
    }
    return null;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
  });

  const clientType = watch("client_type");
  const isBusinessClient = clientType === "Business";

  const withResolvedContext = async <T,>(fn: () => Promise<T>): Promise<T> => {
    const meResponse = await getCurrentUser();
    const me = (meResponse as any)?.data ?? meResponse;
    const originalType: 'personal' | 'company' =
      me?.current_context?.type === 'company' ? 'company' : 'personal';
    const originalCompanyIdRaw = Number(me?.current_context?.company_id ?? me?.active_company_id);
    const originalCompanyId = Number.isFinite(originalCompanyIdRaw) && originalCompanyIdRaw > 0
      ? originalCompanyIdRaw
      : null;

    const targetClientId = parseInt(clientId);
    const candidates: Array<{ type: 'personal' | 'company'; companyId: number | null }> = [];
    const pushCandidate = (candidate: { type: 'personal' | 'company'; companyId: number | null }) => {
      const exists = candidates.some(
        (item) => item.type === candidate.type && item.companyId === candidate.companyId
      );
      if (!exists) candidates.push(candidate);
    };

    if (contextType === "company" && Number.isFinite(contextCompanyId) && contextCompanyId > 0) {
      pushCandidate({ type: "company", companyId: contextCompanyId });
    } else if (contextType === "personal") {
      pushCandidate({ type: "personal", companyId: null });
    }
    pushCandidate({ type: originalType, companyId: originalCompanyId });
    pushCandidate({ type: "personal", companyId: null });
    (Array.isArray(me?.available_companies) ? me.available_companies : [])
      .map((c: any) => Number(c?.id ?? c?.company_id))
      .filter((cid: number) => Number.isFinite(cid) && cid > 0)
      .forEach((cid: number) => pushCandidate({ type: "company", companyId: cid }));

    try {
      const ownerContext = Number.isFinite(targetClientId) && targetClientId > 0
        ? await resolveOwnerContext(candidates, targetClientId)
        : null;

      if (ownerContext) {
        await switchAndConfirmContext(ownerContext);
      } else if (contextType === "company" && Number.isFinite(contextCompanyId) && contextCompanyId > 0) {
        await switchAndConfirmContext({ type: "company", companyId: contextCompanyId });
      } else {
        await switchAndConfirmContext({ type: "personal", companyId: null });
      }

      return await fn();
    } finally {
      if (originalType === 'company' && originalCompanyId) {
        await switchAndConfirmContext({ type: 'company', companyId: originalCompanyId });
      } else {
        await switchAndConfirmContext({ type: 'personal', companyId: null });
      }
    }
  };

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setIsLoading(true);
        const foundClient = await withResolvedContext(() => getInvoiceClient(parseInt(clientId)));

        if (!foundClient) {
          toast.error("Client not found");
          router.push("/invoice/clients");
          return;
        }

        setClient(foundClient);
        
        // Normalize client_type: empty string or undefined defaults to "Personal"
        let normalizedType: "Personal" | "Business" = "Personal";
        if (foundClient.client_type === "Business") {
          normalizedType = "Business";
        }

        reset({
          name: foundClient.name,
          email: foundClient.email || "",
          telephone: foundClient.telephone || "",
          address_no: foundClient.address_no || "",
          address_street: foundClient.address_street || "",
          address_city: foundClient.address_city || "",
          address_town: foundClient.address_town || "",
          address_postcode: foundClient.address_postcode || "",
          address_county: foundClient.address_county || "",
          address_country: foundClient.address_country || "",
          client_type: normalizedType,
          company_registration_number: foundClient.company_registration_number || null,
          vat_number: foundClient.vat_number || null,
          utr: foundClient.utr || null,
        });
      } catch (error: unknown) {
        const apiError = error as ApiError;
        toast.error("Failed to load client: " + (apiError?.message || "Unknown error"));
        router.push("/invoice/clients");
      } finally {
        setIsLoading(false);
      }
    };

    if (clientId) {
      fetchClient();
    }
  }, [clientId, router, reset, contextType, contextCompanyId]);

  const onSubmit: SubmitHandler<ClientFormValues> = async (data) => {
    try {
      setIsLoading(true);

      // Send null for cleared optional fields (undefined is omitted and leaves old DB values)
      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        telephone: nullableClientField(data.telephone),
        address_no: nullableClientField(data.address_no),
        address_street: nullableClientField(data.address_street),
        address_city: nullableClientField(data.address_city),
        address_town: nullableClientField(data.address_town),
        address_postcode: nullableClientField(data.address_postcode),
        address_county: nullableClientField(data.address_county),
        address_country: nullableClientField(data.address_country),
        client_type: data.client_type,
        utr: nullableClientField(data.utr),
        company_registration_number: isBusinessClient
          ? nullableClientField(data.company_registration_number)
          : null,
        vat_number: isBusinessClient ? nullableClientField(data.vat_number) : null,
      };

      await withResolvedContext(() => updateInvoiceClient(parseInt(clientId), payload));
      toast.success("Client updated successfully");
      router.push("/invoice/clients");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(`Failed to update client:\n${(apiError?.message || "Unknown error")}`,{style: { whiteSpace: "pre-line" }});
    } finally {
      setIsLoading(false);
    }
  };

  if (!client) {
    return <div className="flex items-center justify-center h-64">Loading client...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/invoice/clients")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
        <h1 className="text-2xl font-bold text-primary">Edit Client</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <div className="space-y-4">
          {/* Client Type Selection */}
          <div>
            <Label htmlFor="client_type">Client Type</Label>
            <Controller
              name="client_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Personal">Personal</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.client_type && (
              <p className="text-red-500 text-sm mt-1">{errors.client_type.message}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Enter client name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          {/* Telephone */}
          <div>
            <Label htmlFor="telephone">Phone</Label>
            <Input
              id="telephone"
              {...register("telephone")}
              placeholder="Enter phone number"
            />
            {errors.telephone && (
              <p className="text-red-500 text-sm mt-1">{errors.telephone.message}</p>
            )}
          </div>

          {/* Address Fields */}
          <div className="space-y-4">
            <Label className="pb-2 block font-semibold">Address</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="address_nr" className="pb-2 block text-sm">No./Flat</Label>
                <Input
                  id="address_nr"
                  {...register("address_no")}
                  placeholder="123"
                />
                {errors.address_no && <p className="text-red-500 text-sm mt-1">{errors.address_no.message}</p>}
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="address_street" className="pb-2 block text-sm">Street *</Label>
                <Input
                  id="address_street"
                  {...register("address_street")}
                  placeholder="Main Street"
                />
                {errors.address_street && <p className="text-red-500 text-sm mt-1">{errors.address_street.message}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address_city" className="pb-2 block text-sm">City *</Label>
                <Input
                  id="address_city"
                  {...register("address_city")}
                  placeholder="London"
                />
                {errors.address_city && <p className="text-red-500 text-sm mt-1">{errors.address_city.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="address_town" className="pb-2 block text-sm">Town/Area</Label>
                <Input
                  id="address_town"
                  {...register("address_town")}
                  placeholder="Westminster"
                />
                {errors.address_town && <p className="text-red-500 text-sm mt-1">{errors.address_town.message}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="address_postcode" className="pb-2 block text-sm">Postcode *</Label>
                <Input
                  id="address_postcode"
                  {...register("address_postcode")}
                  placeholder="SW1A 1AA"
                />
                {errors.address_postcode && <p className="text-red-500 text-sm mt-1">{errors.address_postcode.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="address_county" className="pb-2 block text-sm">County</Label>
                <Input
                  id="address_county"
                  {...register("address_county")}
                  placeholder="Greater London"
                />
                {errors.address_county && <p className="text-red-500 text-sm mt-1">{errors.address_county.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="address_country" className="pb-2 block text-sm">Country *</Label>
                <Input
                  id="address_country"
                  {...register("address_country")}
                  placeholder="United Kingdom"
                />
                {errors.address_country && <p className="text-red-500 text-sm mt-1">{errors.address_country.message}</p>}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="utr">UTR</Label>
            <Input
              id="utr"
              {...register("utr")}
              placeholder="e.g., 1234567890"
            />
            {errors.utr && <p className="text-red-500 text-sm mt-1">{errors.utr.message}</p>}
          </div>

          {/* Business Client Fields */}
          {isBusinessClient && (
            <div className="space-y-4 border-t pt-4 mt-4">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Business Information
              </h3>

              <div>
                <Label htmlFor="company_registration_number">
                  Company Registration Number
                </Label>
                <Input
                  id="company_registration_number"
                  {...register("company_registration_number")}
                  placeholder="e.g., SC123456"
                />
                {errors.company_registration_number && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.company_registration_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="vat_number">VAT Number *</Label>
                <Input
                  id="vat_number"
                  {...register("vat_number")}
                  placeholder="e.g., GB123456789"
                />
                {errors.vat_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.vat_number.message}</p>
                )}
              </div>

            </div>
          )}
        </div>

        {/* General validation error */}
        {errors.root && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">{errors.root.message}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/invoice/clients")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Client"}
          </Button>
        </div>
      </form>
    </div>
  );
}