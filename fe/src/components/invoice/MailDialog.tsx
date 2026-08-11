// components/invoices/MailDialog.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextEditor } from "@/components/elements/TextEditor";
import { Client, Invoice, InvoiceType } from "@/services/interface/invoice";
import { sendInvoiceEmail, SendInvoiceMailRequest } from "@/services/invoice.service";
import { updateInvoice as updateInvoiceInState } from "@/slices/invoiceSlice";
import { AppDispatch } from "@/slices/store";
import { Mail, X, Send, Loader2, Plus, Trash2, FileText, Receipt, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/slices/hooks";
import { getCurrentUser } from "@/services/service";
import { setAuthUser } from "@/slices/authSlice";
import { User } from "@/services/interface/User";

/** Omit empty, null, undefined, and literal "null" from mail sender lines. */
function senderField(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "" || s.toLowerCase() === "null") return null;
  return s;
}

interface MailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  clients: Client[];
  invoiceTypes: InvoiceType[];
}

export function MailDialog({ open, onOpenChange, invoice, clients, invoiceTypes }: MailDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [isSending, setIsSending] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [clientName, setClientName] = useState("");
  const [recipientEmails, setRecipientEmails] = useState<string[]>([""]);
  const [documentType, setDocumentType] = useState<'invoice' | 'receipt'>('invoice');
  const [attachments, setAttachments] = useState<File[]>([]);

  const [paymentLinkEnabled, setPaymentLinkEnabled] = useState(false);
  const [tempUser, setTempUser] = useState<User>();
  const wasOpenRef = useRef(false);

  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const getClientDetails = useCallback(() => {
    if (!invoice) return null;

    let client: Client | undefined;

    if (invoice.client_object && typeof invoice.client_object === 'object') {
      client = invoice.client_object as Client;
    } else if (invoice.client_id && clients.length > 0) {
      client = clients.find(c => c.id === invoice.client_id);
    } else if (typeof invoice.client === 'string') {
      client = clients.find(c => c.name === invoice.client);
    }

    return client;
  }, [invoice, clients]);

  const getInvoiceTypeName = useCallback(() => {
    if (!invoice) return "N/A";

    if (invoice.type_id && invoiceTypes.length > 0) {
      const type = invoiceTypes.find(t => t.id === invoice.type_id);
      return type?.name || invoice.invoice_type || "N/A";
    }

    return invoice.invoice_type || "N/A";
  }, [invoice, invoiceTypes]);

  const resolveSenderIdentity = useCallback(() => {
    const sourceUser: any = tempUser ?? user ?? {};
    const availableCompanies = Array.isArray(sourceUser?.available_companies)
      ? sourceUser.available_companies
      : [];
    const rawInvoiceCompanyId = Number((invoice as any)?.company_id);
    const invoiceCompanyId = Number.isFinite(rawInvoiceCompanyId) && rawInvoiceCompanyId > 0
      ? rawInvoiceCompanyId
      : null;
    const rawPersonalCompanyId = Number(
      sourceUser?.personal_company_id ??
      sourceUser?.host_id ??
      (sourceUser?.current_context?.type === "personal" ? sourceUser?.current_context?.host_id : null) ??
      sourceUser?.id
    );
    const personalCompanyId =
      Number.isFinite(rawPersonalCompanyId) && rawPersonalCompanyId > 0
        ? rawPersonalCompanyId
        : null;
    const treatAsPersonal = !!invoiceCompanyId && !!personalCompanyId && invoiceCompanyId === personalCompanyId;
    const effectiveInvoiceCompanyId = treatAsPersonal ? null : invoiceCompanyId;

    const mappedCompany = effectiveInvoiceCompanyId
      ? availableCompanies.find((c: any) => {
        const id = Number(c?.id ?? c?.company_id);
        const hostId = Number(c?.host_id);
        return id === effectiveInvoiceCompanyId || hostId === effectiveInvoiceCompanyId;
      })
      : null;
    const fullName = `${sourceUser?.first_name ?? ""} ${sourceUser?.last_name ?? ""}`.trim();
    const fallbackName = senderField(fullName || sourceUser?.first_name);
    const invoiceCompanyName = senderField((invoice as any)?.company_name);
    const fallbackCompany = effectiveInvoiceCompanyId
      ? senderField(
        invoiceCompanyName ??
        mappedCompany?.company_name ??
        mappedCompany?.name ??
        sourceUser?.company?.company_name
      )
      : senderField(
        fullName ||
        sourceUser?.first_name ||
        "Personal"
      );
    const fallbackEmail = senderField(
      (effectiveInvoiceCompanyId ? mappedCompany?.business_email : null) ??
      sourceUser?.email
    );
    const fallbackPhone = senderField(
      effectiveInvoiceCompanyId
        ? (
          mappedCompany?.phone_number ??
          sourceUser?.company?.phone_number ??
          sourceUser?.phone ??
          sourceUser?.phone_number
        )
        : (
          sourceUser?.phone ??
          sourceUser?.phone_number ??
          sourceUser?.company?.phone_number
        )
    );

    if (effectiveInvoiceCompanyId) {
      return {
        senderName: fallbackName ?? "BookWise",
        senderCompany: fallbackCompany,
        senderEmail: fallbackEmail,
        senderPhone: fallbackPhone,
      };
    }

    return {
      senderName: fallbackName ?? "BookWise",
      senderCompany: fallbackCompany,
      senderEmail: fallbackEmail,
      senderPhone: fallbackPhone,
    };
  }, [invoice, tempUser, user]);

  // The frontend should not pre-populate email body content that duplicates backend-rendered email text.
  // Leave the editor blank so the backend can be fully authoritative over email rendering.
  // const generateDefaultEmailContent = useCallback(() => {
  //   return "";
  // }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function getUser() {
      try {
        const response = await getCurrentUser();
        const me = (response as any)?.data ?? response;
        if (cancelled) return;
        setTempUser(me as User);
        dispatch(setAuthUser(me as User));
      } catch (e) {
        console.error("Error fetching current user:", e);
      }
    }

    getUser();
    return () => {
      cancelled = true;
    };
  }, [open, dispatch]);

  // Initialize dialog values only once per open action.
  // This prevents recipient rows from being reset while user is editing.
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    if (justOpened && invoice) {
      const client = getClientDetails();
      setClientName(client?.name || invoice.client?.toString() || "");

      const initialEmail = client?.email || "";
      setRecipientEmails(initialEmail ? [initialEmail] : [""]);
      setAttachments([]);
    }
    wasOpenRef.current = open;
  }, [open, invoice, getClientDetails]);

  // Keep subject fresh and leave message content blank to avoid duplicate backend rendering.
  useEffect(() => {
    if (!open || !invoice) return;
    setEmailSubject(
      `${documentType === 'invoice' ? 'Invoice' : 'Receipt'} ${invoice.code} - ${getInvoiceTypeName()}`
    );
    setEmailContent("");
  }, [open, invoice, documentType, getInvoiceTypeName]);

  const addEmailRecipient = () => {
    setRecipientEmails([...recipientEmails, ""]);
  };

  const removeEmailRecipient = (index: number) => {
    if (recipientEmails.length > 1) {
      const newEmails = recipientEmails.filter((_, i) => i !== index);
      setRecipientEmails(newEmails);
    }
  };

  const updateEmailRecipient = (index: number, value: string) => {
    const newEmails = [...recipientEmails];
    newEmails[index] = value;
    setRecipientEmails(newEmails);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateEmails = (emails: string[]): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every(email => email.trim() && emailRegex.test(email.trim()));
  };

  const handleSendEmail = async () => {
    if (!invoice) {
      toast.error("No invoice selected");
      return;
    }

    const validEmails = recipientEmails
      .filter(email => email.trim())
      .map(email => email.trim());

    if (validEmails.length === 0) {
      toast.error("Please enter at least one valid email address");
      return;
    }

    if (!validateEmails(validEmails)) {
      toast.error("Please enter valid email addresses");
      return;
    }

    if (!clientName.trim()) {
      toast.error("Please enter the client name");
      return;
    }

    setIsSending(true);

    try {
      const payload: SendInvoiceMailRequest = {
        id: invoice.id,
        name: clientName.trim(),
        type: documentType,
        email: validEmails,
        subject: emailSubject.trim(),
        additional_info: emailContent.trim(),
        files: attachments.length > 0 ? attachments : undefined,
        payment_link_enabled: paymentLinkEnabled
      };

      console.log('Sending email with payload:', payload);

      const result = await sendInvoiceEmail(payload);

      console.log('Email send result:', result);

      if (result.success) {
        if (result.status && result.status !== invoice.status) {
          const updatedInvoice = { ...invoice, status: result.status as Invoice['status'] };
          dispatch(updateInvoiceInState(updatedInvoice));
          console.log('Updated invoice status to:', result.status);
        }

        const successMessage = result.message || `${documentType === 'invoice' ? 'Invoice' : 'Receipt'} sent successfully!`;
        toast.success(successMessage);

        if (result.emails && result.emails.length > 0) {
          console.log('Email sent to:', result.emails);
        }

        onOpenChange(false);
      } else {
        throw new Error(result.message || 'Email sending failed - no success confirmation');
      }

    } catch (error) {
      console.error("Email sending failed:", error);

      let errorMessage = "Failed to send email. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast.error(errorMessage);

    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setRecipientEmails([""]);
    setAttachments([]);
    setEmailContent("");
    onOpenChange(false);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[90vw] !h-[90vh] !max-w-[90vw] !max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl text-primary">
            <Mail className="h-6 w-6" />
            Send {documentType === 'invoice' ? 'Invoice' : 'Receipt'} via Email
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-6 py-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-primary">Document Settings</h3>

              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Document Type</Label>
                  <Select value={documentType} onValueChange={(value: 'invoice' | 'receipt') => setDocumentType(value)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Invoice PDF
                        </div>
                      </SelectItem>
                      <SelectItem value="receipt">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Receipt PDF
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-name" className="text-sm font-medium">Client Name *</Label>
                  <Input
                    id="client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter client name"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Invoice Details</Label>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p><strong>Invoice:</strong> {invoice.code}</p>
                    <p><strong>Type:</strong> {getInvoiceTypeName()}</p>
                    <p><strong>Amount:</strong>${invoice.items[0] ? invoice.items[0].currency : ""}{invoice.final_amount?.toFixed(2) || '0.00'}</p>
                    <p><strong>Status:</strong> {invoice.status}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-primary">Recipients</h3>

              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                {recipientEmails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmailRecipient(index, e.target.value)}
                      placeholder="Enter email address"
                      className="flex-1 h-9"
                    />
                    {recipientEmails.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEmailRecipient(index)}
                        className="px-2 h-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addEmailRecipient}
                  className="w-full h-9"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-primary">Additional Attachments</h3>

              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <Label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center justify-center h-9 px-4 border rounded-md bg-background hover:bg-muted text-sm"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Add Files
                  </Label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                        <span className="text-xs truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Supported: PDF, DOC, DOCX, JPG, PNG
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Email Content</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-subject" className="text-sm font-medium">Subject *</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Custom Message (optional)</Label>
                <div className="border rounded-lg overflow-visible">
                  <TextEditor
                    value={emailContent}
                    onChange={setEmailContent}
                    placeholder="Add an optional custom note for the invoice email"
                    className="min-h-[350px]"
                  />
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-teal-50 dark:bg-teal-950 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
              <p className="font-medium mb-2">📧 Email Information:</p>
              <ul className="space-y-1 text-xs">
                <li>• The {documentType} PDF will be automatically attached</li>
                <li>• Additional files can be attached if needed</li>
                <li>• The invoice status will be updated to &quot;Mail Sent&quot; after sending</li>
                <li>• Multiple recipients can be added</li>
              </ul>
            </div>
          </div>

          {/* <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Include Payment Link
              </Label>
              <p className="text-xs text-muted-foreground">
                Add Stripe payment link inside the email
              </p>
            </div>

            <Switch
              checked={paymentLinkEnabled}
              onCheckedChange={setPaymentLinkEnabled}
            />
          </div> */}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
            className="sm:mr-auto h-11 px-6"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>

          <Button
            onClick={handleSendEmail}
            disabled={isSending || recipientEmails.filter(e => e.trim()).length === 0}
            className="gap-2 h-11 px-8"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send {documentType === 'invoice' ? 'Invoice' : 'Receipt'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
