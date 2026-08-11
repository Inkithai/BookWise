// src/components/property/sections/Connectivity.tsx
"use client"

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Property } from "./PropertyTypes";

interface ConnectivityProps {
  property: Property;
  setProperty: React.Dispatch<React.SetStateAction<Property>>;
  readOnly?: boolean;
}

export const Connectivity = ({ property, setProperty, readOnly = false }: ConnectivityProps) => {
  const handleConnectivityChange = (field: keyof Property['connectivity'], value: string) => {
    setProperty(prev => ({
      ...prev,
      connectivity: {
        ...prev.connectivity,
        [field]: value
      }
    }));
  };

  const connectivityFields = [
    { label: "Airbnb", field: "airbnb" },
    { label: "Booking.com", field: "booking" },
    { label: "Vrbo", field: "vrbo" },
    { label: "Expedia", field: "expedia" },
    { label: "Google Travel", field: "googleTravel" },
    { label: "Agoda Homes", field: "agoda" },
    { label: "Plum Guide", field: "plumGuide" },
    { label: "Sonder", field: "sonder" },
    { label: "Blueground", field: "blueground" },
    { label: "Homestay", field: "homestay" },
    { label: "FlipKey (TripAdvisor)", field: "flipKey" }
  ];

  const renderReadOnlyInput = (value: string) => (
    <Input 
      value={value} 
      readOnly 
      className="w-full bg-muted hover:bg-muted cursor-default"
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        {connectivityFields.map(({ label, field }) => (
          <div key={field} className="space-y-2">
            <Label>{label}</Label>
            {readOnly ? (
              renderReadOnlyInput(property.connectivity[field as keyof Property['connectivity']])
            ) : (
              <Input
                value={property.connectivity[field as keyof Property['connectivity']]}
                onChange={(e) => handleConnectivityChange(field as keyof Property['connectivity'], e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};