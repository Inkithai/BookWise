// src/components/property/sections/PropertyHighlights.tsx
"use client"

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "./icons";
import { Property } from "./PropertyTypes";

interface PropertyHighlightsProps {
  property: Property;
  setProperty: React.Dispatch<React.SetStateAction<Property>>;
  readOnly?: boolean;
}

interface CustomHighlightState {
  text: string;
  enabled: boolean;
}

export const PropertyHighlights = ({ property, setProperty, readOnly = false }: PropertyHighlightsProps) => {
  const [newHighlight, setNewHighlight] = useState("");
  const [customHighlightStates, setCustomHighlightStates] = useState<CustomHighlightState[]>(
    property.highlights.customHighlights.map(text => ({ text, enabled: true }))
  );

  useEffect(() => {
    setProperty(prev => ({
      ...prev,
      highlights: {
        ...prev.highlights,
        parkingAvailable: false,
        fullyFurnished: true,
        fullyEquippedModernKitchen: true,
        convenientLocation: true,
        privateGarden: false,
        spaciousTerrace: true,
        closeToPublicTransport: true,
        bedLinensProvided: true,
        freeWifi: true,
        security24_7: true,
        customHighlights: prev.highlights.customHighlights
      }
    }));
  }, []);

  const handleSwitchChange = (field: keyof Property['highlights'], checked: boolean) => {
    setProperty(prev => ({
      ...prev,
      highlights: {
        ...prev.highlights,
        [field]: checked
      }
    }));
  };

  const addCustomHighlight = () => {
    if (newHighlight.trim()) {
      const newHighlightText = newHighlight.trim();
      setProperty(prev => ({
        ...prev,
        highlights: {
          ...prev.highlights,
          customHighlights: [...prev.highlights.customHighlights, newHighlightText]
        }
      }));
      setCustomHighlightStates(prev => [...prev, { text: newHighlightText, enabled: true }]);
      setNewHighlight("");
    }
  };

  const toggleCustomHighlight = (index: number, checked: boolean) => {
    setCustomHighlightStates(prev => 
      prev.map((h, i) => i === index ? { ...h, enabled: checked } : h)
    );
  };

  const removeCustomHighlight = (index: number) => {
    setProperty(prev => ({
      ...prev,
      highlights: {
        ...prev.highlights,
        customHighlights: prev.highlights.customHighlights.filter((_, i) => i !== index)
      }
    }));
    setCustomHighlightStates(prev => prev.filter((_, i) => i !== index));
  };

  const HighlightItem = ({ 
    id, 
    checked, 
    onCheckedChange, 
    label, 
    onRemove, 
    isCustom = false 
  }: {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
    onRemove?: () => void;
    isCustom?: boolean;
  }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg min-h-[72px]">
      <div className="flex items-center space-x-3 flex-1">
        {readOnly ? (
          <Switch
            id={id}
            checked={checked}
            onCheckedChange={() => {}}
            disabled
            className="opacity-100"
          />
        ) : (
          <Switch
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
          />
        )}
        <Label htmlFor={id} className="break-words leading-tight">
          {label}
        </Label>
      </div>
      {isCustom && !readOnly && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive/80 p-1 h-8 w-8 ml-2"
          onClick={onRemove}
        >
          <TrashIcon className="h-2 w-2" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Standard Highlights */}
        <HighlightItem
          id="parking-available"
          checked={property.highlights.parkingAvailable}
          onCheckedChange={(checked) => handleSwitchChange("parkingAvailable", checked)}
          label="Parking Available"
        />
        
        <HighlightItem
          id="fully-furnished"
          checked={property.highlights.fullyFurnished}
          onCheckedChange={(checked) => handleSwitchChange("fullyFurnished", checked)}
          label="Fully Furnished"
        />
        
        <HighlightItem
          id="modern-kitchen"
          checked={property.highlights.fullyEquippedModernKitchen}
          onCheckedChange={(checked) => handleSwitchChange("fullyEquippedModernKitchen", checked)}
          label="Fully Equipped Modern Kitchen"
        />
        
        <HighlightItem
          id="convenient-location"
          checked={property.highlights.convenientLocation}
          onCheckedChange={(checked) => handleSwitchChange("convenientLocation", checked)}
          label="Convenient Location"
        />
        
        <HighlightItem
          id="private-garden"
          checked={property.highlights.privateGarden}
          onCheckedChange={(checked) => handleSwitchChange("privateGarden", checked)}
          label="Private Garden"
        />

        <HighlightItem
          id="spacious-terrace"
          checked={property.highlights.spaciousTerrace}
          onCheckedChange={(checked) => handleSwitchChange("spaciousTerrace", checked)}
          label="Spacious Terrace"
        />
        
        <HighlightItem
          id="public-transport"
          checked={property.highlights.closeToPublicTransport}
          onCheckedChange={(checked) => handleSwitchChange("closeToPublicTransport", checked)}
          label="Close to Public Transport"
        />
        
        <HighlightItem
          id="bed-linens"
          checked={property.highlights.bedLinensProvided}
          onCheckedChange={(checked) => handleSwitchChange("bedLinensProvided", checked)}
          label="Bed linens provided"
        />
        
        <HighlightItem
          id="free-wifi"
          checked={property.highlights.freeWifi}
          onCheckedChange={(checked) => handleSwitchChange("freeWifi", checked)}
          label="Free Wifi"
        />
        
        <HighlightItem
          id="security"
          checked={property.highlights.security24_7}
          onCheckedChange={(checked) => handleSwitchChange("security24_7", checked)}
          label="24/7 Security"
        />

        {/* Custom Highlights */}
        {customHighlightStates.map((highlight, index) => (
          <HighlightItem
            key={index}
            id={`custom-highlight-${index}`}
            checked={highlight.enabled}
            onCheckedChange={(checked) => toggleCustomHighlight(index, checked)}
            label={highlight.text}
            onRemove={() => removeCustomHighlight(index)}
            isCustom={true}
          />
        ))}
      </div>

      {/* Add Custom Highlight Input */}
      {!readOnly && (
        <div className="space-y-2">
          <Label>Add Custom Highlight</Label>
          <div className="flex space-x-2">
            <Input
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              placeholder="Enter new highlight"
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addCustomHighlight()}
            />
            <Button onClick={addCustomHighlight}>
              <PlusIcon className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};