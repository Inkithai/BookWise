// src/components/property/sections/Amenities.tsx
"use client"

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Property } from "./PropertyTypes";

interface AmenitiesProps {
  property: Property;
  setProperty: React.Dispatch<React.SetStateAction<Property>>;
  readOnly?: boolean;
}

const amenityGroups = [
  {
    title: "Bathroom Amenities",
    key: "bathroom",
    items: [
      "Hair Dryer", "Bath", "Shower Gel", "Towels", "Toilet", "Body Soap",
      "Extra Towels/Sheets", "Free Toiletries", "Conditioner", "Hot Water",
      "Bathtub/Shower", "Shampoo", "Toilet Paper", "Private Bathroom"
    ]
  },
  {
    title: "Bedroom & Laundry",
    key: "bedroomLaundry",
    items: [
      "Washing Machine", "Bed Linen", "Hangers", "Iron",
      "Room-darkening Blinds", "Clothes Storage", "Wardrobe"
    ]
  },
  {
    title: "Kitchen & Dining",
    key: "kitchenDining",
    items: [
      "Coffee", "Coffee Maker", "Cooking Basics", "Cooker", "Dining Table",
      "Dishes & Cutlery", "Dishwasher", "Freezer", "Fridge", "Kettle",
      "Microwave", "Oven", "Toaster", "Waste Compactor", "Wine Glasses",
      "Electric Kettle"
    ]
  },
  {
    title: "Safety & Security",
    key: "safetySecurity",
    items: [
      "Carbon Monoxide Alarm", "Fire Extinguisher", "First Aid Kit",
      "Smoke Alarm", "CCTV in Common Areas", "Key Access", "Safe"
    ]
  },
  {
    title: "Heating & Cooling",
    key: "heatingCooling",
    items: [
      "Heating", "Air Conditioning", "Fan", "Tile/Marble Floor"
    ]
  },
  {
    title: "Entertainment & Connectivity",
    key: "entertainmentConnectivity",
    items: [
      "TV", "Wifi", "Satellite Channels", "Telephone"
    ]
  },
  {
    title: "Outdoor & Parking",
    key: "outdoorParking",
    items: [
      "BBQ Grill", "Free Parking", "Swimming Pool", "Balcony", "Garden",
      "Picnic Area"
    ]
  },
  {
    title: "Accessibility & Convenience",
    key: "accessibilityConvenience",
    items: [
      "Essentials", "Cleaning Products", "Private Entrance",
      "Facilities for Disabled", "Non-Smoking Rooms", "Family Rooms"
    ]
  },
  {
    title: "Long-Term Stays",
    key: "longTermStays",
    items: [
      "Long-Term Stays Allowed"
    ]
  },
  {
    title: "Food & Drink",
    key: "foodDrink",
    items: [
      "Restaurant", "Bar", "Breakfast", "Tea/Coffee Maker",
      "Fruit", "Kid-friendly Buffet", "Kids' Meals",
      "Special Diet Meals", "Breakfast in Room"
    ]
  },
  {
    title: "Activities",
    key: "activities",
    items: [
      "Bike Tours", "Walking Tours", "Water Sports", "Cycling", "Hiking"
    ]
  },
  {
    title: "Living Area",
    key: "livingArea",
    items: [
      "Desk"
    ]
  },
  {
    title: "Room Amenities",
    key: "roomAmenities",
    items: [
      "Drying Rack", "Clothes Rack"
    ]
  },
  {
    title: "Front Desk Services",
    key: "frontDeskServices",
    items: [
      "Invoice Provided", "Tour Desk", "Currency Exchange"
    ]
  },
  {
    title: "Cleaning Services",
    key: "cleaningServices",
    items: [
      "Daily Housekeeping", "Suit Press", "Ironing", "Laundry"
    ]
  },
  {
    title: "Business Facilities",
    key: "businessFacilities",
    items: [
      "Fax/Photocopying", "Meeting/Banquet Facilities"
    ]
  }
];

export const Amenities = ({ property, setProperty, readOnly = false }: AmenitiesProps) => {
  const handleAmenityChange = (group: keyof Property['amenities'], amenity: string, checked: boolean) => {
    setProperty(prev => {
      const currentAmenities = prev.amenities[group] || [];
      const updatedAmenities = checked
        ? [...currentAmenities, amenity]
        : currentAmenities.filter(a => a !== amenity);
      
      return {
        ...prev,
        amenities: {
          ...prev.amenities,
          [group]: updatedAmenities
        }
      };
    });
  };

  const renderAmenityItem = (group: string, amenity: string) => {
    const isChecked = property.amenities[group as keyof Property['amenities']]?.includes(amenity) || false;
    
    return (
      <div className="flex items-center space-x-2">
        {readOnly ? (
          <Checkbox
            id={`${group}-${amenity}`}
            checked={isChecked}
            onCheckedChange={() => {}}
            disabled
            className="opacity-100"
          />
        ) : (
          <Checkbox
            id={`${group}-${amenity}`}
            checked={isChecked}
            onCheckedChange={(checked) => 
              handleAmenityChange(group as keyof Property['amenities'], amenity, checked as boolean)
            }
          />
        )}
        <Label htmlFor={`${group}-${amenity}`} className="text-sm font-normal">
          {amenity}
        </Label>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {amenityGroups.map(group => (
        <div key={group.key} className="space-y-4">
          <h3 className="font-medium">{group.title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map(amenity => (
              <div key={amenity}>
                {renderAmenityItem(group.key, amenity)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};