// src/components/property/sections/PropertySources.tsx
"use client"

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Property } from "./PropertyTypes";

interface PropertySourcesProps {
  property: Property;
  setProperty: React.Dispatch<React.SetStateAction<Property>>;
  readOnly?: boolean;
}

export const PropertySources = ({ property, setProperty, readOnly = false }: PropertySourcesProps) => {
  const handleSwitchChange = (field: keyof Property['sources'], checked: boolean) => {
    setProperty(prev => ({
      ...prev,
      sources: {
        ...prev.sources,
        [field]: checked
      }
    }));
  };

  const renderSource = (label: string, field: keyof Property['sources'], value: boolean) => (
    <div className="flex items-center space-x-2 p-4 border rounded-lg">
      <Label htmlFor={field}>{label}</Label>
      {readOnly ? (
        <Switch
          id={field}
          checked={value}
          onCheckedChange={() => {}}
          disabled
          className="opacity-100"
        />
      ) : (
        <Switch
          id={field}
          checked={value}
          onCheckedChange={(checked) => handleSwitchChange(field, checked)}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {renderSource("Is Live", "isLive", property.sources.isLive)}
        {renderSource("Direct Booking", "directBooking", property.sources.directBooking)}
        {renderSource("Partner Agency", "partnerAgency", property.sources.partnerAgency)}
        {renderSource("BookingsBNB", "bookingsBNB", property.sources.bookingsBNB)}
      </div>
    </div>
  );
};