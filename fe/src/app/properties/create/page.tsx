// app/property/create/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'

export default function PropertyCreatePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("general")

  const [formData, setFormData] = useState({
    active: true,
    propertyRef: "",
    name: "",
    nickName: "",
    type: "",
    status: "",
    maxCapacity: "",
    bedrooms: "",
    beds: "",
    bathrooms: "",
    receptions: "",
    floors: "",
    size: "",
    unit: "",
    isFeatured: false,
    isPublic: false,
    shortDescription: "",
    longDescription: "",
    street: "",
    suite: "",
    city: "",
    postalCode: "",
    state: "",
    country: "",
    latitude: "",
    longitude: "",
    realEstatePrice: "",
    referenceNumber: "",
    price: "",
    tenure: "",
    newBuild: false,
    retirementHome: false,
    councilBandTax: "",
    videoLink: "",
    floorPlan: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Submit logic here
    router.push("/property")
  }

  const renderGeneralTab = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      <div className="space-y-2">
        <Label>Active</Label>
        <Checkbox 
          checked={formData.active}
          onCheckedChange={(checked) => setFormData({...formData, active: !!checked})}
        />
      </div>

      <div className="space-y-2">
        <Label>Property Reference</Label>
        <Input 
          value={formData.propertyRef}
          onChange={(e) => setFormData({...formData, propertyRef: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Name</Label>
        <Input 
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Nick Name</Label>
        <Input 
          value={formData.nickName}
          onChange={(e) => setFormData({...formData, nickName: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <Select 
          onValueChange={(value) => setFormData({...formData, type: value})}
          value={formData.type}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="villa">Villa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select 
          onValueChange={(value) => setFormData({...formData, status: value})}
          value={formData.status}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Maximum Capacity</Label>
        <Input 
          type="number"
          value={formData.maxCapacity}
          onChange={(e) => setFormData({...formData, maxCapacity: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Bedrooms</Label>
        <Input 
          type="number"
          value={formData.bedrooms}
          onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Beds</Label>
        <Input 
          type="number"
          value={formData.beds}
          onChange={(e) => setFormData({...formData, beds: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Bathrooms</Label>
        <Input 
          type="number"
          value={formData.bathrooms}
          onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Receptions</Label>
        <Input 
          type="number"
          value={formData.receptions}
          onChange={(e) => setFormData({...formData, receptions: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Floors</Label>
        <Input 
          type="number"
          value={formData.floors}
          onChange={(e) => setFormData({...formData, floors: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Size</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input 
            value={formData.size}
            onChange={(e) => setFormData({...formData, size: e.target.value})}
            className="flex-1"
          />
          <Select 
            onValueChange={(value) => setFormData({...formData, unit: value})}
            value={formData.unit}
          >
            <SelectTrigger className="w-full sm:w-24">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sqft">sqft</SelectItem>
              <SelectItem value="sqm">sqm</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Short Description</Label>
        <Textarea 
          value={formData.shortDescription}
          onChange={(e) => setFormData({...formData, shortDescription: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Long Description</Label>
        <Textarea 
          value={formData.longDescription}
          onChange={(e) => setFormData({...formData, longDescription: e.target.value})}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label>Is Featured?</Label>
        <Checkbox 
          checked={formData.isFeatured}
          onCheckedChange={(checked) => setFormData({...formData, isFeatured: !!checked})}
        />
      </div>

      <div className="space-y-2">
        <Label>Is Public?</Label>
        <Checkbox 
          checked={formData.isPublic}
          onCheckedChange={(checked) => setFormData({...formData, isPublic: !!checked})}
        />
      </div>
    </div>
  )

  const renderAddressTab = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      <div className="space-y-2">
        <Label>Street</Label>
        <Input 
          value={formData.street}
          onChange={(e) => setFormData({...formData, street: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Suite</Label>
        <Input 
          value={formData.suite}
          onChange={(e) => setFormData({...formData, suite: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>City</Label>
        <Input 
          value={formData.city}
          onChange={(e) => setFormData({...formData, city: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Postal Code</Label>
        <Input 
          value={formData.postalCode}
          onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>State</Label>
        <Input 
          value={formData.state}
          onChange={(e) => setFormData({...formData, state: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Country</Label>
        <Input 
          value={formData.country}
          onChange={(e) => setFormData({...formData, country: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Latitude</Label>
        <Input 
          value={formData.latitude}
          onChange={(e) => setFormData({...formData, latitude: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Longitude</Label>
        <Input 
          value={formData.longitude}
          onChange={(e) => setFormData({...formData, longitude: e.target.value})}
        />
      </div>
    </div>
  )

  const renderSalesTab = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      <div className="space-y-2">
        <Label>Reference Number</Label>
        <Input 
          value={formData.referenceNumber}
          onChange={(e) => setFormData({...formData, referenceNumber: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Price</Label>
        <Input 
          type="number"
          value={formData.price}
          onChange={(e) => setFormData({...formData, price: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Tenure</Label>
        <Input 
          value={formData.tenure}
          onChange={(e) => setFormData({...formData, tenure: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>New Build</Label>
        <Checkbox 
          checked={formData.newBuild}
          onCheckedChange={(checked) => setFormData({...formData, newBuild: !!checked})}
        />
      </div>

      <div className="space-y-2">
        <Label>Retirement Home</Label>
        <Checkbox 
          checked={formData.retirementHome}
          onCheckedChange={(checked) => setFormData({...formData, retirementHome: !!checked})}
        />
      </div>

      <div className="space-y-2">
        <Label>Council Band Tax</Label>
        <Input 
          value={formData.councilBandTax}
          onChange={(e) => setFormData({...formData, councilBandTax: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>Video Link</Label>
        <Input 
          value={formData.videoLink}
          onChange={(e) => setFormData({...formData, videoLink: e.target.value})}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <main className="flex-1 p-4 sm:p-6">
            <h1 className="text-2xl font-bold mb-6">Create New Property</h1>
            
            <div className="flex flex-nowrap overflow-x-auto border-b mb-6 pb-px">
              <button
                className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap ${activeTab === "general" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                onClick={() => setActiveTab("general")}
              >
                General
              </button>
              <button
                className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap ${activeTab === "address" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                onClick={() => setActiveTab("address")}
              >
                Address
              </button>
              <button
                className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap ${activeTab === "sales" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                onClick={() => setActiveTab("sales")}
              >
                Sales Information
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === "general" && renderGeneralTab()}
              {activeTab === "address" && renderAddressTab()}
              {activeTab === "sales" && renderSalesTab()}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6">
                <Button variant="outline" type="button" className="w-full sm:w-auto" onClick={() => router.push("/properties")}>
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">Create Property</Button>
              </div>
            </form>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}