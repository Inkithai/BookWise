"use client";

import { Button } from "@/components/ui/button";

interface IncomeToolbarProps {
  onCreateIncome: () => void;
}

export function IncomeToolbar({ onCreateIncome }: IncomeToolbarProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button onClick={onCreateIncome} className="bg-primary text-primary-foreground">
        Add Income
      </Button>
    </div>
  );
}