// components/invoice/CreateClientDialog.tsx - UPDATED WITH BUSINESS SUPPORT
"use client"

import { useState } from "react"
import { useForm, SubmitHandler, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createInvoiceClient } from "@/services/invoice.service"
import { parseApiError } from "@/services/service"
import { isPlanRestrictionError } from "@/lib/plan-access"
import { useRouter } from "next/navigation"
import { Client } from "@/services/interface/invoice"

// Zod schema with conditional validation for business clients
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
  address: z.string().optional().nullable(),
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

type ClientFormValues = z.infer<typeof clientSchema>

interface CreateClientDialogProps {
  onClientCreated: (client: Client) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateClientDialog({
  onClientCreated,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: CreateClientDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      telephone: "",
      address: "",
      client_type: "Personal",
      company_registration_number: null,
      vat_number: null,
      utr: null,
    }
  })

  const clientType = form.watch("client_type")
  const isBusinessClient = clientType === "Business"

  const onSubmit: SubmitHandler<ClientFormValues> = async (data) => {
    try {
      setIsLoading(true)

      const payload = {
        name: data.name,
        email: data.email,
        telephone: data.telephone || undefined,
        address: data.address || undefined,
        client_type: data.client_type,
        utr: data.utr || undefined,
        ...(isBusinessClient && {
          company_registration_number: data.company_registration_number || undefined,
          vat_number: data.vat_number || undefined,

        }),
      }

      const newClient = await createInvoiceClient(payload)
      toast.success("Client created successfully")
      onClientCreated(newClient)
      form.reset()
      setOpen(false)
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
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    if (!open) {
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Client</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Client Type Selection */}
            <FormField
              control={form.control}
              name="client_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Type</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Personal">Personal</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {clientType === "Business" ? "Company Name *" : "Name *"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={clientType === "Business" ? "Enter company name" : "Enter client name"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Telephone */}
            <FormField
              control={form.control}
              name="telephone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+1234567890"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cleaned = val
                          .replace(/(?!^)\+/g, "")
                          .replace(/[^0-9+]/g, "");

                        field.onChange(cleaned);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter address" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Business Fields - Only shown for Business clients */}
            {isBusinessClient && (
              <div className="space-y-4 border-t pt-4 mt-4">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Business Information
                </h3>

                <FormField
                  control={form.control}
                  name="company_registration_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Registration Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., SC123456"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vat_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., GB123456789"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* <FormField
                  control={form.control}
                  name="utr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unique Tax Reference (UTR)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 1234567890"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}
              </div>
            )}


            <FormField
              control={form.control}
              name="utr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unique Tax Reference (UTR)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 1234567890"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}