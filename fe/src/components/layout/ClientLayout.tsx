'use client';

import { useTokenExpiry } from "@/hooks/useTokenExpiry";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useTokenExpiry();
  return <>{children}</>;
}
