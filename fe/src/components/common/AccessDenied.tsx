'use client';

import { ShieldOff } from 'lucide-react';

interface AccessDeniedProps {
  message?: string;
}

export default function AccessDenied({ message }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <ShieldOff className="w-16 h-16 text-muted-foreground opacity-50" />
      <h2 className="text-2xl font-semibold text-foreground">Access Denied</h2>
      <p className="text-muted-foreground max-w-sm">
        {message ?? "You don't have permission to view this page. Contact your administrator to request access."}
      </p>
    </div>
  );
}
