// src/components/property/PropertyTypes.ts

export interface Property {
  id?: string;
  active: boolean;
  propertyRef: string;
  uplistingId: string;
  propertyName: string;
  propertyType: string;
  furnishing: string;
  nickName: string;
  maxCapacity: string;
  bedrooms: string;
  totalBeds: string;
  baths: string;
  receptions: string;
  floors: string;
  size: string;
  unit: string;
  description: string;
  houseRules: string;
  thingsToKnow: string;
  images: File[];
  epcFile: File[];
  sources: {
    isLive: boolean;
    directBooking: boolean;
    partnerAgency: boolean;
    bookingsBNB: boolean;
  };
  highlights: {
    parkingAvailable: boolean;
    fullyFurnished: boolean;
    fullyEquippedModernKitchen: boolean;
    convenientLocation: boolean;
    privateGarden: boolean;
    spaciousTerrace: boolean;
    closeToPublicTransport: boolean;
    bedLinensProvided: boolean;
    freeWifi: boolean;
    security24_7: boolean;
    customHighlights: string[];
  };
  address: {
    street: string;
    suite: string;
    city: string;
    postalCode: string;
    state: string;
    country: string;
    latitude: string;
    longitude: string;
  };
  wifi: {
    wifi3G: {
      username: string;
      password: string;
    };
    wifi5G: {
      username: string;
      password: string;
    };
    additionalInfo: string;
    wifiFiles: File[];
    visualInstructions: File[];
  };
  lockbox: {
    groups: Array<{
      lockboxCode: string;
      doorAccessCode: string;
      additionalInfo: string;
      files: File[];
      visualInstructions: File[];
    }>;
  };
  otherFacilities: {
    parking: string;
    heatingThermostat: string;
    kitchen: string;
    garden: string;
    wasteManagement: string;
    laundry: string;
  };
  connectivity: {
    airbnb: string;
    booking: string;
    vrbo: string;
    expedia: string;
    googleTravel: string;
    agoda: string;
    plumGuide: string;
    sonder: string;
    blueground: string;
    homestay: string;
    flipKey: string;
  };
  amenities: {
    bathroom: string[];
    bedroomLaundry: string[];
    kitchenDining: string[];
    safetySecurity: string[];
    heatingCooling: string[];
    entertainmentConnectivity: string[];
    outdoorParking: string[];
    accessibilityConvenience: string[];
    longTermStays: string[];
    foodDrink: string[];
    activities: string[];
    livingArea: string[];
    roomAmenities: string[];
    frontDeskServices: string[];
    cleaningServices: string[];
    businessFacilities: string[];
  };
}
export type Section = 'general' | 'discounts'; // Add other sections as needed
