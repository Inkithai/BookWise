// components/invoice/clients/CreateClientForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { createInvoiceClient } from "@/services/invoice.service"
import { parseApiError } from "@/services/service"
import { isPlanRestrictionError } from "@/lib/plan-access"

// Zod schema - added utr as optional field
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
  //utr: z.string().optional().nullable(), // Added utr field
})

type ClientFormValues = z.infer<typeof clientSchema>;

interface ApiError {
  message?: string;
}

export function CreateClientForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      client_type: "Personal",
    },
  });

  const clientType = watch("client_type");
  const isBusinessClient = clientType === "Business";

  const onSubmit: SubmitHandler<ClientFormValues> = async (data) => {

    console.log('utr', data);
    try {
      setIsLoading(true);

      // Prepare payload - added utr to payload
      const payload = {
        name: data.name,
        email: data.email,
        telephone: data.telephone || undefined,
        address_no: data.address_no || undefined,
        address_street: data.address_street || undefined,
        address_city: data.address_city || undefined,
        address_town: data.address_town || undefined,
        address_postcode: data.address_postcode || undefined,
        address_county: data.address_county || undefined,
        address_country: data.address_country || undefined,
        client_type: data.client_type,
        utr: data.utr || undefined,
        ...(isBusinessClient && {
          company_registration_number: data.company_registration_number || undefined,
          vat_number: data.vat_number || undefined,
        }),
      };

      await createInvoiceClient(payload);
      toast.success("Client created successfully");
      router.push("/invoice/clients");
    } catch (error: unknown) {
      const message = parseApiError(error, 'create client');
      if (isPlanRestrictionError(error)) {
        toast.error(message, {
          action: { label: 'Upgrade', onClick: () => router.push('/settings?tab=upgrade-plan') },
        });
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedClientType = watch("client_type");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-primary">Create New Client</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <div className="space-y-4">
          {/* Client Type Selection */}
          <div>
            <Label htmlFor="client_type" className="pb-2 block">Client Type</Label>
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
            <Label htmlFor="name" className="pb-2 block">{selectedClientType === "Business" ? "Company Name *" : "Name *"}</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder={selectedClientType === "Business" ? "Enter company name" : "Enter client name"}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="pb-2 block">Email *</Label>
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
            <Label htmlFor="telephone" className="pb-2 block">Phone</Label>
            <Input
              id="telephone"
              placeholder="Enter phone number"
              {...register("telephone")}
              onChange={(e) => {
                const value = e.target.value;

                const cleanedValue = value
                  .replace(/(?!^)\+/g, "")
                  .replace(/[^0-9+]/g, "");

                e.target.value = cleanedValue;
                register("telephone").onChange(e);
              }}
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

          {/* UTR Field - Added */}
          <div>
            <Label htmlFor="utr" className="pb-2 block">UTR</Label>
            <Input
              id="utr"
              {...register("utr")}
              placeholder="Enter UTR"
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
                <Label htmlFor="company_registration_number" className="pb-2 block">
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
                <Label htmlFor="vat_number" className="pb-2 block">VAT Number</Label>
                <Input
                  id="vat_number"
                  {...register("vat_number")}
                  placeholder="e.g., GB123456789"
                />
                {errors.vat_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.vat_number.message}</p>
                )}
              </div>

              {/* <div>
                <Label htmlFor="utr" className="pb-2 block">Unique Tax Reference (UTR) </Label>
                <Input
                  id="utr"
                  {...register("utr")}
                  placeholder="e.g., 1234567890"
                />
                {errors.utr && <p className="text-red-500 text-sm mt-1">{errors.utr.message}</p>}
              </div> */}
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
            {isLoading ? "Creating..." : "Create Client"}
          </Button>
        </div>
      </form>
    </div>
  );
}