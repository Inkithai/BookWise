<!DOCTYPE html>
<html>

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <link rel="stylesheet" type="text/css" href="/admin/fonts/roboto.css">
    <style>
        body {
            font-family: 'Roboto', sans-serif;
        }

        .page_break {
            page-break-before: always;
        }

        footer {
            position: fixed;
            bottom: 0cm;
            left: 0cm;
            right: 0cm;
            height: 2cm;
            text-align: center;
            font-size: small;
            font-weight: bold;
        }
    </style>
    @php
        use Modules\User\Models\User as InvoicePdfUser;

        $pdfUserResolved = $pdfUser ?? auth()->user();
        $pdfAuthUserMaster = auth()->user();
        $pdfIsMasterRootless = is_null($pdfAuthUserMaster?->host_id);
        $pdfHostId = isset($invoice) && $invoice
            ? (int) ($invoice->host_id ?? 0)
            : (int) ($pdfUserResolved?->host_id ?? 0);
        if ($pdfHostId <= 0 && isset($invoice) && $invoice && !empty($invoice->company_id)) {
            $companyHostId = (int) (\App\Models\Company::query()
                ->where('id', (int) $invoice->company_id)
                ->value('host_id') ?? 0);
            if ($companyHostId > 0) {
                $pdfHostId = $companyHostId;
            }
        }
        if ($pdfHostId <= 0 && isset($invoice) && $invoice) {
            $pdfHostId = (int) ($invoice->user?->host_id ?? 0);
        }
        // Super-admin (rootless) fallback: resolve to first real host when host_id is still 0.
        if ($pdfHostId <= 0 && $pdfIsMasterRootless) {
            $pdfHostId = (int) (\App\Models\Host::orderBy('id')->value('id') ?? 0);
        }

        // Rootless users (super-admin) must use their own user record so companyDetails()
        // returns their logo, not the first real host owner's logo.
        $billingUserForPdf = $pdfIsMasterRootless
            ? ($pdfAuthUserMaster instanceof InvoicePdfUser
                ? $pdfAuthUserMaster
                : InvoicePdfUser::find($pdfAuthUserMaster?->id) ?? $pdfUserResolved)
            : ($pdfHostId > 0
                ? (InvoicePdfUser::primaryBillingUserForHost($pdfHostId) ?? $pdfUserResolved)
                : $pdfUserResolved);

        $hostDetails = [];
        if ($pdfHostId > 0) {
            foreach (\App\Models\HostUserDetail::where('host_id', $pdfHostId)
                ->where('type', 'company_details')
                ->orderBy('user_id')
                ->get() as $row) {
                if (!array_key_exists($row->name, $hostDetails)) {
                    $hostDetails[$row->name] = ['values' => $row->values, 'files' => $row->files];
                }
            }
        }

        $pdfMasterCompanyName = trim((string) (data_get($hostDetails, 'company_name.values') ?? ''));
        if (strcasecmp($pdfMasterCompanyName, 'null') === 0) {
            $pdfMasterCompanyName = '';
        }
        $pdfMasterHasCompanyName = $pdfMasterCompanyName !== '';

        $companyLogoPath = trim((string) (data_get($hostDetails, 'company_logo.files') ?? ''));
        $personalLogoPath = trim((string) ($billingUserForPdf?->profile_img ?? ''));
        $resolvedLogoPath = '';

        if ($companyLogoPath !== '' && \Illuminate\Support\Facades\Storage::disk('public')->exists($companyLogoPath)) {
            $resolvedLogoPath = \Illuminate\Support\Facades\Storage::disk('public')->path($companyLogoPath);
        }
        if ($resolvedLogoPath === '' && $personalLogoPath !== ''
            && (int) ($billingUserForPdf?->host_id ?? 0) === $pdfHostId
            && \Illuminate\Support\Facades\Storage::disk('public')->exists($personalLogoPath)) {
            $resolvedLogoPath = \Illuminate\Support\Facades\Storage::disk('public')->path($personalLogoPath);
        }
    @endphp
    <title>{{ $pdfMasterHasCompanyName ? $pdfMasterCompanyName : 'Invoice' }}</title>
    @yield('custom-css')
</head>

<body>
    <header>
        <div style="background: {{ $invoiceThemeColor ?? '#000000' }}; height: 8px;">
        </div>
    </header>

    @yield('content')

    <footer>
        <div style="font-size: 11px; padding-bottom: 2px;">
            - THANK YOU FOR YOUR BUSINESS
            @if (isset($company))
                WITH {{ $company->account_name }}
            @endif -
        </div>

        @if (isset($pdfUser))
            @php
                $pdfFooterCrn = trim((string) (data_get($hostDetails, 'business_registration_number.values') ?? ''));
                $pdfFooterVat = trim((string) (data_get($hostDetails, 'vat_no.values') ?? ''));
                $pdfFooterLocation = trim((string) ($billingUserForPdf?->HostUser?->location ?? ''));
                $pdfFooterAddress = trim((string) ($invoice->company_address ?? data_get($hostDetails, 'company_address.values') ?? ''));
                $pdfFooterBizEmail = isset($footerEmail) ? trim((string) $footerEmail) : trim((string) (data_get($hostDetails, 'business_email.values') ?? ''));
                $pdfFooterPhone = isset($number) ? trim((string) $number) : trim((string) (data_get($hostDetails, 'phone_number.values') ?? ''));
                $stripNullLabel = function (string $v): string {
                    return strcasecmp($v, 'null') === 0 ? '' : $v;
                };
                $pdfFooterCrn = $stripNullLabel($pdfFooterCrn);
                $pdfFooterVat = $stripNullLabel($pdfFooterVat);
                $pdfFooterLocation = $stripNullLabel($pdfFooterLocation);
                $pdfFooterAddress = $stripNullLabel($pdfFooterAddress);
                $pdfFooterBizEmail = $stripNullLabel($pdfFooterBizEmail);
                $pdfFooterPhone = $stripNullLabel($pdfFooterPhone);

                $pdfFooterLineRegParts = [];
                if ($pdfMasterHasCompanyName) {
                    $pdfFooterLineRegParts[] = $pdfMasterCompanyName;
                }
                $regTail = [];
                if ($pdfFooterLocation !== '') {
                    $regTail[] = 'Registered in '.$pdfFooterLocation;
                }
                if ($pdfFooterCrn !== '') {
                    $regTail[] = 'CRN: '.$pdfFooterCrn;
                }
                if ($pdfFooterVat !== '') {
                    $regTail[] = 'VAT: '.$pdfFooterVat;
                }
                if ($pdfFooterLineRegParts !== [] || $regTail !== []) {
                    $pdfFooterLineRegParts = array_merge($pdfFooterLineRegParts, $regTail);
                }
                $pdfFooterLineReg = implode(' | ', array_filter($pdfFooterLineRegParts));
            @endphp

            @if ($pdfFooterLineReg !== '')
                <div style="font-size: 11px; padding: 2px 0px; font-weight: normal; color: dimgrey">
                    {{ $pdfFooterLineReg }}
                </div>
            @endif
            @if ($pdfFooterAddress !== '')
                <div style="font-size: 11px; padding: 2px 0px; font-weight: normal; color: dimgrey">
                    {{ $pdfFooterAddress }}
                </div>
            @endif
            @if ($pdfFooterBizEmail !== '' || $pdfFooterPhone !== '')
                <div style="font-size: 11px; padding: 2px 0px; font-weight: normal; color: dimgrey">
                    @if ($pdfFooterBizEmail !== '')
                        {{ $pdfFooterBizEmail }}
                    @endif
                    @if ($pdfFooterBizEmail !== '' && $pdfFooterPhone !== '')
                        |
                    @endif
                    @if ($pdfFooterPhone !== '')
                        {{ $pdfFooterPhone }}
                    @endif
                </div>
            @endif
        @endif
    </footer>
</body>

</html>
