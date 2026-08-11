// app/layout.tsx
import { ThemeProvider } from "next-themes";
import Script from "next/script";
import "./globals.css";
import StoreProvider from "@/app/StoreProvider";
import AuthInitializer from "@/app/AuthInitializer";
import AuthHydrator from "@/components/common/AuthHydrator";
import { Toaster } from "sonner";
import ClientLayout from "@/components/layout/ClientLayout";
import IosInputZoomPreventer from "@/components/common/iOSInputZoomPreventer";

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

// Using system font stack — no external font fetch required
const FONT_CLASS = "font-sans";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Viewport configuration for mobile responsiveness */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#0F766E" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#134E4A" media="(prefers-color-scheme: dark)" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.png" type="image/png" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="BookWise" />
        <meta property="og:locale" content="en_LK" />
        <meta property="og:description" content="BookWise — Smart accounting and bookkeeping for Sri Lankan businesses. Invoicing, banking, expenses and financial statements in one platform." />
        <meta property="og:image" content="/logo.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@BookWiseLK" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {/* Analytics scripts can be added here when configured */}
        {/* Google Ads — load gtag script, then inline config */}
        {GOOGLE_ADS_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-ads-config" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GOOGLE_ADS_ID}');`}
            </Script>
          </>
        )}
        <StoreProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <AuthInitializer>
              <AuthHydrator />
              <ClientLayout>
                {children}
              </ClientLayout>
            </AuthInitializer>
            {/* Toast container for subscription success messages */}
            <Toaster
              richColors
              position="top-right"
              expand={false}
              duration={4000}
              closeButton
            />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}