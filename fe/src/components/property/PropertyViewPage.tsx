"use client"

import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { PropertyForm } from "./sections/GeneralSection"
import { Property, Section } from "./sections/PropertyTypes"
import { Skeleton } from "@/components/ui/skeleton"

export const PropertyViewPage = () => {
  const params = useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<Section>('general')
  const [property, setProperty] = useState<Property>(getDefaultProperty(params.id as string))

  useEffect(() => {
    if (params.id) {
      // Simulate data fetching
      setTimeout(() => {
        setIsLoading(false)
      }, 1000)
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="flex space-x-4 overflow-x-auto pb-2">
          <Skeleton className="h-10 w-[80px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Property Details</h1>
        <Button onClick={() => router.push(`/properties/edit/${params.id}`)}>
          Edit Property
        </Button>
      </div>

      <div className="flex space-x-4 overflow-x-auto pb-2">
        <SectionNavButton 
          active={activeSection === 'general'}
          onClick={() => setActiveSection('general')}
        >
          General
        </SectionNavButton>
        <SectionNavButton 
          active={activeSection === 'discounts'}
          onClick={() => setActiveSection('discounts')}
        >
          Discounts
        </SectionNavButton>
      </div>

      {activeSection === 'general' && (
        <PropertyForm 
          property={property} 
          setProperty={setProperty} 
          readOnly={true}
          onSave={() => {}}
          onCancel={() => router.back()}
        />
      )}
    </div>
  )
}

function getDefaultProperty(id: string): Property {
  return {
    id,
    active: true,
    propertyRef: "",
    uplistingId: "",
    propertyName: "",
    propertyType: "",
    furnishing: "",
    nickName: "",
    maxCapacity: "",
    bedrooms: "",
    totalBeds: "",
    baths: "",
    receptions: "",
    floors: "",
    size: "",
    unit: "",
    description: "",
    houseRules: "",
    thingsToKnow: "",
    images: [],
    epcFile: [],
    sources: {
      isLive: false,
      directBooking: true,
      partnerAgency: true,
      bookingsBNB: true
    },
    highlights: {
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
      customHighlights: []
    },
    address: {
      street: "",
      suite: "",
      city: "",
      postalCode: "",
      state: "",
      country: "",
      latitude: "",
      longitude: ""
    },
    wifi: {
      wifi3G: {
        username: "",
        password: ""
      },
      wifi5G: {
        username: "",
        password: ""
      },
      additionalInfo: "",
      wifiFiles: [],
      visualInstructions: []
    },
    lockbox: {
      groups: [
        {
          lockboxCode: "",
          doorAccessCode: "",
          additionalInfo: "",
          files: [],
          visualInstructions: []
        }
      ]
    },
    otherFacilities: {
      parking: "",
      heatingThermostat: "",
      kitchen: "",
      garden: "",
      wasteManagement: "",
      laundry: ""
    },
    connectivity: {
      airbnb: "",
      booking: "",
      vrbo: "",
      expedia: "",
      googleTravel: "",
      agoda: "",
      plumGuide: "",
      sonder: "",
      blueground: "",
      homestay: "",
      flipKey: ""
    },
    amenities: {
      bathroom: [],
      bedroomLaundry: [],
      kitchenDining: [],
      safetySecurity: [],
      heatingCooling: [],
      entertainmentConnectivity: [],
      outdoorParking: [],
      accessibilityConvenience: [],
      longTermStays: [],
      foodDrink: [],
      activities: [],
      livingArea: [],
      roomAmenities: [],
      frontDeskServices: [],
      cleaningServices: [],
      businessFacilities: []
    }
  }
}

const SectionNavButton = ({ 
  children, 
  active, 
  onClick 
}: { 
  children: React.ReactNode, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md whitespace-nowrap transition-colors ${
      active 
        ? 'bg-primary text-primary-foreground' 
        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
    }`}
  >
    {children}
  </button>
)