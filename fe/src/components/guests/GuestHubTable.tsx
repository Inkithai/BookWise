"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, Column, CardConfig } from "@/components/elements/Table"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import Link from "next/link"

const data: Guest[] = [
  {
    id: "1",
    name: "John Doe",
    preferredName: "John",
    email: "john@example.com",
    phoneNumber: "123-456-7890",
    notes: "Likes early check-in",
    bookingRef: "2999066",
    bookingStatus: "checked_out",
    propertyName: "Apt 2, Lingmell Court, Seascale, Cumbria, CA20 1HQ",
    propertyLink: "/properties/1",
    checkIn: "2024-01-08",
    checkOut: "2024-01-12",
    createdDate: "2024-03-09 06:03:14",
    updatedBy: "Admin",
    changes: "Updated phone number",
    updatedAt: "2024-03-10 10:15:22",
    history: [
      {
        date: "2024-03-10 10:15:22",
        changedBy: "Admin",
        changes: "Updated phone number from 123-456-7891 to 123-456-7890"
      },
      {
        date: "2024-03-09 06:03:14",
        changedBy: "System",
        changes: "Booking created"
      }
    ]
  },
  {
    id: "2",
    name: "Jane Smith",
    preferredName: "Jane",
    email: "jane@example.com",
    phoneNumber: "234-567-8901",
    notes: "Requires parking space",
    bookingRef: "3020587",
    bookingStatus: "checked_out",
    propertyName: "Apt 2, Lingmell Court, Seascale, Cumbria, CA20 1HQ",
    propertyLink: "/properties/1",
    checkIn: "2024-01-14",
    checkOut: "2024-01-19",
    createdDate: "2024-03-09 06:03:14",
    updatedBy: "Manager",
    changes: "Changed check-out date",
    updatedAt: "2024-03-11 14:30:45",
    history: [
      {
        date: "2024-03-11 14:30:45",
        changedBy: "Manager",
        changes: "Changed check-out date from 2024-01-18 to 2024-01-19"
      },
      {
        date: "2024-03-09 06:03:14",
        changedBy: "System",
        changes: "Booking created"
      }
    ]
  },
]

export type Guest = {
  id: string
  name: string
  preferredName: string
  email: string
  phoneNumber: string
  notes: string
  bookingRef: string
  bookingStatus: string
  propertyName: string
  propertyLink: string
  checkIn: string
  checkOut: string
  createdDate: string
  updatedBy: string
  changes: string
  updatedAt: string
  history: {
    date: string
    changedBy: string
    changes: string
  }[]
}

export function GuestHubTable() {
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [checkInDateRange, setCheckInDateRange] = React.useState<DateRange | undefined>()
  const [checkOutDateRange, setCheckOutDateRange] = React.useState<DateRange | undefined>()
  const [updatedAtDateRange, setUpdatedAtDateRange] = React.useState<DateRange | undefined>()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [selectedGuest, setSelectedGuest] = React.useState<Guest | null>(null)
  const [editableGuest, setEditableGuest] = React.useState<Partial<Guest> | null>(null)
  const [guests, setGuests] = React.useState<Guest[]>(data)

  const columns: Column<Guest>[] = [
    {
      accessor: "name",
      header: "Name",
      priority: 1, // Always show
    },
    {
      accessor: "email",
      header: "Email",
      priority: 2, // Mobile+
    },
    {
      accessor: "phoneNumber",
      header: "Phone Number",
      priority: 2, // Mobile+
    },
    {
      accessor: "checkIn",
      header: "Check In",
      cell: (row) => format(new Date(row.checkIn), "yyyy-MM-dd"),
      priority: 3, // Tablet+
    },
    {
      accessor: "checkOut",
      header: "Check Out",
      cell: (row) => format(new Date(row.checkOut), "yyyy-MM-dd"),
      priority: 3, // Tablet+
    },
    {
      accessor: "updatedAt",
      header: "Updated At",
      cell: (row) => format(new Date(row.updatedAt), "yyyy-MM-dd HH:mm:ss"),
      priority: 4, // Desktop only
    },
    {
      accessor: "id",
      header: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedGuest(row)
                  setEditableGuest({ ...row })
                  setIsDialogOpen(true)
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit guest</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                onClick={() => handleDelete(row.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete guest</TooltipContent>
          </Tooltip>
        </div>
      ),
      priority: 1, // Always show
    },
  ]

  // Card configuration for mobile view
  const guestCardConfig: CardConfig<Guest> = {
    title: (guest) => guest.name || 'Unknown Guest',
    subtitle: (guest) => guest.email || '-',
    primaryMetric: {
      field: 'phoneNumber',
      label: 'Phone',
    },
    secondaryMetrics: [
      { 
        field: 'checkIn', 
        label: 'Check In',
        format: (val) => val ? format(new Date(val as string), "MMM dd, yyyy") : '-'
      },
      { 
        field: 'checkOut', 
        label: 'Check Out',
        format: (val) => val ? format(new Date(val as string), "MMM dd, yyyy") : '-'
      },
    ],
    actions: (guest) => (
      <div className="flex gap-3">
        <Button 
          className="flex-1 h-14 min-h-[56px] text-base font-semibold rounded-xl"
          onClick={() => {
            setSelectedGuest(guest)
            setEditableGuest({ ...guest })
            setIsDialogOpen(true)
          }}
        >
          <Edit className="h-5 w-5 mr-2" />
          Edit
        </Button>
      </div>
    ),
  };

  const filteredData = guests.filter((guest) => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const guestCheckIn = new Date(guest.checkIn)
    const guestCheckOut = new Date(guest.checkOut)
    const guestUpdatedAt = new Date(guest.updatedAt)

    const matchesCheckIn = checkInDateRange
      ? (!checkInDateRange.from || guestCheckIn >= checkInDateRange.from) &&
        (!checkInDateRange.to || guestCheckIn <= checkInDateRange.to)
      : true

    const matchesCheckOut = checkOutDateRange
      ? (!checkOutDateRange.from || guestCheckOut >= checkOutDateRange.from) &&
        (!checkOutDateRange.to || guestCheckOut <= checkOutDateRange.to)
      : true

    const matchesUpdatedAt = updatedAtDateRange
      ? (!updatedAtDateRange.from || guestUpdatedAt >= updatedAtDateRange.from) &&
        (!updatedAtDateRange.to || guestUpdatedAt <= updatedAtDateRange.to)
      : true

    return matchesSearch && matchesCheckIn && matchesCheckOut && matchesUpdatedAt
  })

  const totalEntries = filteredData.length
  const totalPages = Math.ceil(totalEntries / itemsPerPage)
  const showingFrom = (currentPage - 1) * itemsPerPage + 1
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries)

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const clearFilters = () => {
    setSearchTerm("")
    setCheckInDateRange(undefined)
    setCheckOutDateRange(undefined)
    setUpdatedAtDateRange(undefined)
  }

  const handleSave = () => {
    if (editableGuest && selectedGuest) {
      const now = new Date().toISOString()
      const changes = getChanges(selectedGuest, editableGuest)
      
      const updatedGuest = {
        ...editableGuest,
        updatedAt: now,
        updatedBy: "Current User",
        changes: changes || "Updated guest information",
        history: [
          {
            date: now,
            changedBy: "Current User",
            changes: changes || "Updated guest information"
          },
          ...selectedGuest.history
        ]
      } as Guest

      setGuests(guests.map(guest => 
        guest.id === selectedGuest.id ? updatedGuest : guest
      ))
      
      setIsDialogOpen(false)
    }
  }

  const getChanges = (original: Guest, updated: Partial<Guest>) => {
    const changes: string[] = []
    
    Object.keys(updated).forEach(key => {
      const typedKey = key as keyof Guest
      if (original[typedKey] !== updated[typedKey]) {
        changes.push(`Changed ${key} from ${original[typedKey]} to ${updated[typedKey]}`)
      }
    })
    
    return changes.join(", ")
  }

  const handleDelete = (id: string) => {
    setGuests(guests.filter(guest => guest.id !== id))
  }

  const handleInputChange = (field: keyof Guest, value: string) => {
    if (editableGuest) {
      setEditableGuest({
        ...editableGuest,
        [field]: value
      })
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <Input
            placeholder="Search guests..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="max-w-xs"
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[230px] justify-start text-left font-normal",
                  !checkInDateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {checkInDateRange?.from ? (
                  checkInDateRange.to ? (
                    <>
                      {format(new Date(checkInDateRange.from), "LLL dd, y")} -{" "}
                      {format(new Date(checkInDateRange.to), "LLL dd, y")}
                    </>
                  ) : (
                    format(new Date(checkInDateRange.from), "LLL dd, y")
                  )
                ) : (
                  <span>Check-in date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={checkInDateRange}
                onSelect={setCheckInDateRange}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[230px] justify-start text-left font-normal",
                  !checkOutDateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {checkOutDateRange?.from ? (
                  checkOutDateRange.to ? (
                    <>
                      {format(new Date(checkOutDateRange.from), "LLL dd, y")} -{" "}
                      {format(new Date(checkOutDateRange.to), "LLL dd, y")}
                    </>
                  ) : (
                    format(new Date(checkOutDateRange.from), "LLL dd, y")
                  )
                ) : (
                  <span>Check-out date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={checkOutDateRange}
                onSelect={setCheckOutDateRange}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[230px] justify-start text-left font-normal",
                  !updatedAtDateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {updatedAtDateRange?.from ? (
                  updatedAtDateRange.to ? (
                    <>
                      {format(new Date(updatedAtDateRange.from), "LLL dd, y")} -{" "}
                      {format(new Date(updatedAtDateRange.to), "LLL dd, y")}
                    </>
                  ) : (
                    format(new Date(updatedAtDateRange.from), "LLL dd, y")
                  )
                ) : (
                  <span>Updated date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={updatedAtDateRange}
                onSelect={setUpdatedAtDateRange}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Rows</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-[80px]">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
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
        cardConfig={guestCardConfig}
        tableName="guests"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full max-w-[90vw] lg:max-w-[1200px] h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Guest</DialogTitle>
          </DialogHeader>
          {selectedGuest && editableGuest && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">GUEST INFORMATION</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <Input 
                      value={editableGuest.name || ""} 
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preferred Name</p>
                    <Input 
                      value={editableGuest.preferredName || ""} 
                      onChange={(e) => handleInputChange("preferredName", e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <Input 
                      value={editableGuest.email || ""} 
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <Input 
                      value={editableGuest.phoneNumber || ""} 
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <Input 
                      value={editableGuest.notes || ""} 
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">BOOKING DETAILS</h3>
                <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Booking Ref</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Property</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Check-in</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Check-out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Created Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {editableGuest.bookingRef}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {editableGuest.bookingStatus}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <Link 
                            href={editableGuest.propertyLink || "#"} 
                            className="text-teal-600 hover:text-teal-800 hover:underline dark:text-teal-400 dark:hover:text-teal-300"
                          >
                            {editableGuest.propertyName}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {editableGuest.checkIn ? format(new Date(editableGuest.checkIn), "yyyy-MM-dd") : ""}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {editableGuest.checkOut ? format(new Date(editableGuest.checkOut), "yyyy-MM-dd") : ""}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {editableGuest.createdDate}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">UPDATE HISTORY</h3>
                <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Changed By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Changes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                      {editableGuest.history?.map((entry, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {format(new Date(entry.date), "yyyy-MM-dd HH:mm:ss")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {entry.changedBy}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                            {entry.changes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}