// components/invoice/clients/ClientDetail.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Edit, Mail, Phone, MapPin, Building2 } from "lucide-react"
import { toast } from "sonner"
import { getInvoiceClient, getInvoiceClients } from "@/services/invoice.service"
import { Client, isBusinessClient } from "@/services/interface/invoice"
import { getCurrentUser, switchAccountContext } from "@/services/service"
import { getViewScope, ViewScope } from "@/utils/view-scope"
import { usePermissions } from "@/utils/permissions"

interface ClientDetailProps {
  clientId: string;
}

interface ApiError {
  message?: string;
}

export function ClientDetail({ clientId }: ClientDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const contextType = searchParams.get("context");
  const contextCompanyId = Number(searchParams.get("company_id"));
  const { can } = usePermissions();
  const [viewScope, setViewScope] = useState<ViewScope>("current");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => setViewScope(getViewScope());
    apply();
    window.addEventListener("viewScopeChanged", apply as any);
    return () => window.removeEventListener("viewScopeChanged", apply as any);
  }, []);

  const isAllView = viewScope === "all";

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
        setLoading(true);
        const clientData = await withResolvedContext(() => getInvoiceClient(parseInt(clientId)));
        setClient(clientData);
      } catch (error: unknown) {
        const apiError = error as ApiError;
        toast.error("Failed to load client: " + (apiError.message || "Unknown error"));
        router.push("/invoice/clients");
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchClient();
    }
  }, [clientId, router, contextType, contextCompanyId]);

  const handleEdit = () => {
    const query =
      contextType === 'company' && Number.isFinite(contextCompanyId) && contextCompanyId > 0
        ? `?context=company&company_id=${contextCompanyId}`
        : `?context=personal`;
    router.push(`/invoice/clients/${clientId}/edit${query}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading client details...</div>;
  }

  if (!client) {
    return <div className="flex items-center justify-center h-64">Client not found</div>;
  }

  const isBusiness = isBusinessClient(client);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/invoice/clients")}
          className="w-fit"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>

        {/* Title + Edit (always same row) */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-2xl font-bold text-primary truncate">
            Client Details
          </h1>

          <Button
            onClick={handleEdit}
            variant="outline"
            className="h-9 shrink-0"
            disabled={isAllView || !can('invoice-client.edit')}
            title={isAllView ? "Edit is disabled in All-Accounts view" : ""}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Client
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isBusiness && <Building2 className="h-5 w-5 text-teal-600" />}
              <CardTitle className="text-2xl">{client.name}</CardTitle>
            </div>
            {client.client_type && (
              <Badge variant={isBusiness ? "default" : "secondary"}>
                {client.client_type}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-primary">Contact Information</h3>

            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-base">{client.email}</p>
                </div>
              </div>
            )}

            {client.telephone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-base">{client.telephone}</p>
                </div>
              </div>
            )}

            {(client.address_no || client.address_street || client.address_city || client.address_postcode || client.address_country) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <div className="text-base">
                    {client.address_no && <span>{client.address_no}</span>}
                    {client.address_no && client.address_street && <span> </span>}
                    {client.address_street && <span>{client.address_street}</span>}
                    {(client.address_no || client.address_street) && (client.address_city || client.address_postcode || client.address_country) && <br />}
                    {client.address_city && <span>{client.address_city}</span>}
                    {client.address_city && client.address_town && <span>, </span>}
                    {client.address_town && <span>{client.address_town}</span>}
                    {(client.address_city || client.address_town) && client.address_county && <span>, </span>}
                    {client.address_county && <span>{client.address_county}</span>}
                    {(client.address_city || client.address_town || client.address_county) && client.address_postcode && <span>, </span>}
                    {client.address_postcode && <span>{client.address_postcode}</span>}
                    {((client.address_no || client.address_street || client.address_city || client.address_town || client.address_county || client.address_postcode) && client.address_country) && <br />}
                    {client.address_country && <span>{client.address_country}</span>}
                  </div>
                </div>
              </div>
            )}

            {client.utr && (
              <div className="flex items-start gap-3">
                <div className="h-4 w-4 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">UTR</p>
                  <p className="text-base font-mono">{client.utr}</p>
                </div>
              </div>
            )}
          </div>

          {/* Business Information Section */}
          {isBusiness && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-lg">Business Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {client.company_registration_number && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Company Registration Number
                    </p>
                    <p className="text-base mt-1 font-mono bg-muted p-2 rounded">
                      {client.company_registration_number}
                    </p>
                  </div>
                )}

                {client.vat_number && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">VAT Number</p>
                    <p className="text-base mt-1 font-mono bg-muted p-2 rounded">
                      {client.vat_number}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}