"use client"

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { BasicInformation } from "./BasicInformation";
import { PropertySources } from "./PropertySources";
import { PropertyHighlights } from "./PropertyHighlights";
import { AddressInformation } from "./AddressInformation";
import { CheckInInfo } from "./CheckInInfo";
import { Connectivity } from "./Connectivity";
import { Amenities } from "./Amenities";
import { Property } from "./PropertyTypes";
import { useTheme } from "next-themes";

interface PropertyFormProps {
  property: Property;
  setProperty: React.Dispatch<React.SetStateAction<Property>>;
  readOnly?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

export const PropertyForm = ({ 
  property, 
  setProperty, 
  readOnly = false,
  onSave, 
  onCancel 
}: PropertyFormProps) => {
  const { theme } = useTheme();
  const [defaultOpenSections] = useState<string[]>([]);

  return (
    <div className={`space-y-4 ${theme === 'dark' ? 'dark' : ''}`}>
      <Accordion type="multiple" defaultValue={defaultOpenSections} className="w-full space-y-4">
        
        <AccordionItem value="basic" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gray-50 dark:bg-gray-800 min-h-[52px]">
            <span className="font-medium">Basic Information</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 py-3">
            <BasicInformation 
              property={property} 
              setProperty={setProperty} 
              readOnly={readOnly}
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="sources" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gray-50 dark:bg-gray-800 min-h-[52px]">
            <span className="font-medium">Property Sources</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 py-3">
            <PropertySources 
              property={property} 
              setProperty={setProperty} 
              readOnly={readOnly}
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="highlights" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gray-50 dark:bg-gray-800 min-h-[52px]">
            <span className="font-medium">Property Highlights</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 py-3">
            <PropertyHighlights 
              property={property} 
              setProperty={setProperty} 
              readOnly={readOnly}
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="address" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gray-50 dark:bg-gray-800 min-h-[52px]">
            <span className="font-medium">Address Information</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 py-3">
            <AddressInformation 
              property={property} 
              setProperty={setProperty} 
              readOnly={readOnly}
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="checkin" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gray-50 dark:bg-gray-800 min-h-[52px]">
            <span className="font-medium">Check-In Information</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 py-3">
            <CheckInInfo 
              property={property} 
              setProperty={setProperty} 
              readOnly={readOnly}
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="connectivity" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gray-50 dark:bg-gray-800 min-h-[52px]">
            <span className="font-medium">Connectivity</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 py-3">
            <Connectivity 
              property={property} 
              setProperty={setProperty} 
              readOnly={readOnly}
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="amenities" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gray-50 dark:bg-gray-800 min-h-[52px]">
            <span className="font-medium">Amenities</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 py-3">
            <Amenities 
              property={property} 
              setProperty={setProperty} 
              readOnly={readOnly}
            />
          </AccordionContent>
        </AccordionItem>
        
      </Accordion>

      {!readOnly && (
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto" onClick={onSave}>Save Changes</Button>
        </div>
      )}
    </div>
  );
};