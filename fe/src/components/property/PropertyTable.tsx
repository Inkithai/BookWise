// components/property/PropertyTable.tsx
"use client"

import { useState } from "react"
import { Table, Column, CardConfig } from "@/components/elements/Table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Eye, Edit, Link2, Percent } from "lucide-react"
import { useRouter } from "next/navigation"

export type Property = {
  id: string
  ref: string
  name: string
  type: string
  address: string
  status: "Online" | "Offline"
  source: "Direct Booking" | "Partner Agency" | "BookingsBNB"
}

const mockData: Property[] = [
  {
    id: "1",
    ref: "PROP-001",
    name: "Luxury Apartment",
    type: "Apartment",
    address: "123 High St, London",
    status: "Online",
    source: "Direct Booking"
  },
  {
    id: "2",
    ref: "PROP-002",
    name: "Beach House",
    type: "House",
    address: "456 Shore Rd, Brighton",
    status: "Online",
    source: "Partner Agency"
  },
  {
    id: "3",
    ref: "PROP-003",
    name: "City Loft",
    type: "Loft",
    address: "789 Downtown Ave, Manchester",
    status: "Offline",
    source: "BookingsBNB"
  },
  {
    id: "1",
    ref: "PROP-001",
    name: "Luxury Apartment",
    type: "Apartment",
    address: "123 High St, London",
    status: "Online",
    source: "Direct Booking"
  },
  {
    id: "2",
    ref: "PROP-002",
    name: "Beach House",
    type: "House",
    address: "456 Shore Rd, Brighton",
    status: "Online",
    source: "Partner Agency"
  },
  {
    id: "3",
    ref: "PROP-003",
    name: "City Loft",
    type: "Loft",
    address: "789 Downtown Ave, Manchester",
    status: "Offline",
    source: "BookingsBNB"
  },
  {
    id: "1",
    ref: "PROP-001",
    name: "Luxury Apartment",
    type: "Apartment",
    address: "123 High St, London",
    status: "Online",
    source: "Direct Booking"
  },
  {
    id: "2",
    ref: "PROP-002",
    name: "Beach House",
    type: "House",
    address: "456 Shore Rd, Brighton",
    status: "Online",
    source: "Partner Agency"
  },
  {
    id: "3",
    ref: "PROP-003",
    name: "City Loft",
    type: "Loft",
    address: "789 Downtown Ave, Manchester",
    status: "Offline",
    source: "BookingsBNB"
  },
  {
    id: "1",
    ref: "PROP-001",
    name: "Luxury Apartment",
    type: "Apartment",
    address: "123 High St, London",
    status: "Online",
    source: "Direct Booking"
  },
  {
    id: "2",
    ref: "PROP-002",
    name: "Beach House",
    type: "House",
    address: "456 Shore Rd, Brighton",
    status: "Online",
    source: "Partner Agency"
  },
  {
    id: "3",
    ref: "PROP-003",
    name: "City Loft",
    type: "Loft",
    address: "789 Downtown Ave, Manchester",
    status: "Offline",
    source: "BookingsBNB"
  },
  {
    id: "1",
    ref: "PROP-001",
    name: "Luxury Apartment",
    type: "Apartment",
    address: "123 High St, London",
    status: "Online",
    source: "Direct Booking"
  },
  {
    id: "2",
    ref: "PROP-002",
    name: "Beach House",
    type: "House",
    address: "456 Shore Rd, Brighton",
    status: "Online",
    source: "Partner Agency"
  },
  {
    id: "3",
    ref: "PROP-003",
    name: "City Loft",
    type: "Loft",
    address: "789 Downtown Ave, Manchester",
    status: "Offline",
    source: "BookingsBNB"
  },
  {
    id: "1",
    ref: "PROP-001",
    name: "Luxury Apartment",
    type: "Apartment",
    address: "123 High St, London",
    status: "Online",
    source: "Direct Booking"
  },
  {
    id: "2",
    ref: "PROP-002",
    name: "Beach House",
    type: "House",
    address: "456 Shore Rd, Brighton",
    status: "Online",
    source: "Partner Agency"
  },
  {
    id: "3",
    ref: "PROP-003",
    name: "City Loft",
    type: "Loft",
    address: "789 Downtown Ave, Manchester",
    status: "Offline",
    source: "BookingsBNB"
  },
]

export const PropertyTable = () => {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [sourceFilter, setSourceFilter] = useState<string>("")
  const [refFilter, setRefFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Filter data based on search and filters
  const filteredData = mockData.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || property.status === statusFilter
    const matchesSource = !sourceFilter || property.source === sourceFilter
    const matchesRef = !refFilter || property.ref.includes(refFilter)
    return matchesSearch && matchesStatus && matchesSource && matchesRef
  })

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("")
    setSourceFilter("")
    setRefFilter("")
    setCurrentPage(1)
  }

  // Pagination logic
  const totalEntries = filteredData.length
  const totalPages = Math.ceil(totalEntries / itemsPerPage)
  const showingFrom = (currentPage - 1) * itemsPerPage + 1
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries)
  const paginatedData = filteredData.slice(showingFrom - 1, showingTo)

  const columns: Column<Property>[] = [
    {
      header: "Ref",
      accessor: "ref" as const,
      priority: 2 as const, // Mobile+
    },
    {
      header: "Name",
      accessor: "name" as const,
      priority: 1 as const, // Always show
    },
    {
      header: "Type",
      accessor: "type" as const,
      priority: 2 as const, // Mobile+
    },
    {
      header: "Address",
      accessor: "address" as const,
      priority: 3 as const, // Tablet+
    },
    {
      header: "Status",
      accessor: "status" as const,
      cell: (row: Property) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          row.status === "Online" 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800"
        }`}>
          {row.status}
        </span>
      ),
      priority: 2 as const, // Mobile+
    },
    {
      header: "Source",
      accessor: "source" as const,
      priority: 4 as const, // Desktop only
    },
    {
      header: "Actions",
      accessor: "id" as const,
      cell: (row: Property) => (
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => router.push(`/properties/view/${row.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Property</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => router.push(`/properties/edit/${row.id}`)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Property</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assign to Parent Property</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Percent className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage Commission</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      priority: 1 as const, // Always show
    },
  ]

  // Card configuration for mobile view
  const propertyCardConfig: CardConfig<Property> = {
    title: (prop) => prop.name || 'Unknown Property',
    subtitle: (prop) => prop.address || '-',
    primaryMetric: {
      field: 'type',
      label: 'Type',
    },
    secondaryMetrics: [
      { field: 'ref', label: 'Reference' },
      { field: 'source', label: 'Source' },
    ],
    statusField: 'status',
    statusColors: {
      'Online': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Offline': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
    actions: (prop) => (
      <div className="flex gap-3">
        <Button 
          className="flex-1 h-14 min-h-[56px] text-base font-semibold rounded-xl"
          onClick={() => router.push(`/properties/view/${prop.id}`)}
        >
          <Eye className="h-5 w-5 mr-2" />
          View
        </Button>
        <Button 
          variant="outline"
          className="h-14 w-14 min-h-[56px] rounded-xl"
          onClick={() => router.push(`/properties/edit/${prop.id}`)}
        >
          <Edit className="h-5 w-5" />
        </Button>
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Input
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-50"
          />
          
          <Input
            placeholder="Filter by Ref"
            value={refFilter}
            onChange={(e) => setRefFilter(e.target.value)}
            className="w-full md:w-50"
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="Offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Direct Booking">Direct Booking</SelectItem>
              <SelectItem value="Partner Agency">Partner Agency</SelectItem>
              <SelectItem value="BookingsBNB">BookingsBNB</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="w-full md:w-auto"
          >
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm whitespace-nowrap">Rows</span>
          <Select 
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table
        data={paginatedData}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        totalEntries={totalEntries}
        showingFrom={showingFrom}
        showingTo={showingTo}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        cardConfig={propertyCardConfig}
        tableName="properties"
      />
    </div>
  )
}