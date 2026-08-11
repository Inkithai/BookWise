"use client"

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Map } from "@/components/elements/Map";
import { Property } from "./PropertyTypes";
import { Utensils, Coffee, Trees, Hospital, School } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddressInformationProps {
  property: Property;
  setProperty: React.Dispatch<React.SetStateAction<Property>>;
  readOnly?: boolean;
}

export const AddressInformation = ({ property, setProperty, readOnly = false }: AddressInformationProps) => {
  const [mapKey, setMapKey] = useState(0);

  const handleAddressChange = (field: keyof Property['address'], value: string) => {
    setProperty(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
    
    if (field === 'latitude' || field === 'longitude') {
      setMapKey(prev => prev + 1);
    }
  };

  const nearbyPlaces = [
    { name: "Restaurants", icon: <Utensils className="h-3 w-3" /> },
    { name: "Cafés", icon: <Coffee className="h-3 w-3" /> },
    { name: "Parks", icon: <Trees className="h-3 w-3" /> },
    { name: "Hospitals", icon: <Hospital className="h-3 w-3" /> },
    { name: "Schools", icon: <School className="h-3 w-3" /> },
  ];

  const countries = [
    "United States",
    "Canada",
    "United Kingdom",
    "Australia",
    "Germany",
    "France",
    "Japan",
    "India",
    "Brazil",
    "Other"
  ];

  const renderReadOnlyInput = (value: string) => (
    <Input 
      value={value} 
      readOnly 
      className="w-full bg-muted hover:bg-muted cursor-default"
    />
  );

  const renderReadOnlySelect = (value: string, options: string[]) => (
    <Select value={value} disabled>
      <SelectTrigger className="w-full bg-muted hover:bg-muted cursor-default">
        <SelectValue>{value || "Not selected"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Address Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Street</Label>
              {readOnly ? (
                renderReadOnlyInput(property.address.street)
              ) : (
                <Input
                  value={property.address.street}
                  onChange={(e) => handleAddressChange("street", e.target.value)}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Suite/Apt</Label>
              {readOnly ? (
                renderReadOnlyInput(property.address.suite)
              ) : (
                <Input
                  value={property.address.suite}
                  onChange={(e) => handleAddressChange("suite", e.target.value)}
                />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              {readOnly ? (
                renderReadOnlyInput(property.address.city)
              ) : (
                <Input
                  value={property.address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Postal Code</Label>
              {readOnly ? (
                renderReadOnlyInput(property.address.postalCode)
              ) : (
                <Input
                  value={property.address.postalCode}
                  onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>State/Region</Label>
              {readOnly ? (
                renderReadOnlyInput(property.address.state)
              ) : (
                <Input
                  value={property.address.state}
                  onChange={(e) => handleAddressChange("state", e.target.value)}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Country</Label>
              {readOnly ? (
                renderReadOnlySelect(property.address.country, countries)
              ) : (
                <Select
                  value={property.address.country}
                  onValueChange={(value) => handleAddressChange("country", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latitude</Label>
              {readOnly ? (
                renderReadOnlyInput(property.address.latitude)
              ) : (
                <Input
                  value={property.address.latitude}
                  onChange={(e) => handleAddressChange("latitude", e.target.value)}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Longitude</Label>
              {readOnly ? (
                renderReadOnlyInput(property.address.longitude)
              ) : (
                <Input
                  value={property.address.longitude}
                  onChange={(e) => handleAddressChange("longitude", e.target.value)}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column - Map */}
        <div className="space-y-4">
          <div className="h-64 rounded-lg overflow-hidden border dark:border-gray-700">
            <Map
              key={mapKey}
              lat={property.address.latitude ? parseFloat(property.address.latitude) : 0}
              lng={property.address.longitude ? parseFloat(property.address.longitude) : 0}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Nearby Places</Label>
            <div className="flex flex-wrap gap-2">
              {nearbyPlaces.map((place) => (
                <div 
                  key={place.name} 
                  className="flex items-center space-x-2 p-3 border rounded-lg dark:border-gray-700 dark:bg-gray-800"
                >
                  {place.icon}
                  <span className="text-sm dark:text-gray-300">{place.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};