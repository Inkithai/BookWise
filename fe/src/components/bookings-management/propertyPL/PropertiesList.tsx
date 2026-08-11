"use client";

import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

const properties = [
  'Southampton Street, RG1 2QW',
  'Apt 2, Lingmell Court, Seascale, Cumbria, CA20 1HQ',
  '49A Saint Clement\'s Street, Oxfordshire, OX4 1AG',
  'Flat 2, 18 Dalkeith Road, Newington, Edinburgh, EH16 5BP'
];

export function PropertiesList() {
  return (
    <div className="border rounded-lg shadow-sm bg-background overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Properties</h3>
          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
            View all
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-3">
          {properties.map((address, index) => (
            <div 
              key={index}
              className="px-3 py-2 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer flex items-center group"
            >
              <p className="text-sm font-medium text-foreground group-hover:text-primary whitespace-nowrap">
                {address}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}