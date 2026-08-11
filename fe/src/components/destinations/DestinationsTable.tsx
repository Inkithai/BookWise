// components/destinations/DestinationsTable.tsx
"use client";

import { useState } from "react";
import { Table, Column, CardConfig } from "@/components/elements/Table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Search,
  MapPin,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Destination {
  id: string;
  name: string;
  location: string;
  country: string;
  description: string;
}

export default function DestinationsTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data
  const mockDestinations: Destination[] = [
    {
      id: "1",
      name: "Mountain Resort",
      location: "Alps",
      country: "Switzerland",
      description: "Beautiful mountain views with ski facilities",
    },
    {
      id: "2",
      name: "Beach Paradise",
      location: "Bali",
      country: "Indonesia",
      description: "Tropical beach with crystal clear water",
    },
    {
      id: "3",
      name: "Desert Oasis",
      location: "Sahara",
      country: "Morocco",
      description: "Experience the vast desert landscapes",
    },
    {
      id: "4",
      name: "Urban Metropolis",
      location: "New York",
      country: "USA",
      description: "The city that never sleeps",
    },
  ];

  // Filter logic - search all fields
  const filteredDestinations = mockDestinations.filter((destination) => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = 
      destination.name.toLowerCase().includes(searchTermLower) ||
      destination.location.toLowerCase().includes(searchTermLower) ||
      destination.country.toLowerCase().includes(searchTermLower) ||
      destination.description.toLowerCase().includes(searchTermLower);

    const matchesLocation = locationFilter
      ? destination.location.toLowerCase().includes(locationFilter.toLowerCase())
      : true;

    return matchesSearch && matchesLocation;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setLocationFilter("");
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasFilters = searchTerm || locationFilter;

  // Pagination logic
  const totalEntries = filteredDestinations.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const showingFrom = (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries);

  const paginatedDestinations = filteredDestinations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns: Column<Destination>[] = [
    { 
      header: "Name", 
      accessor: "name",
      priority: 1, // Always show
    },
    { 
      header: "Location", 
      accessor: "location",
      priority: 2, // Mobile+
    },
    { 
      header: "Country", 
      accessor: "country",
      priority: 2, // Mobile+
    },
    { 
      header: "Description", 
      accessor: "description",
      priority: 4, // Desktop only
    },
    {
      header: "Action",
      accessor: "id",
      cell: (row: Destination) => (
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/destinations/view/${row.id}`}>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Destination</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/destinations/edit/${row.id}`}>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Destination</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => console.log("Delete", row.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Destination</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      priority: 1, // Always show
    },
  ];

  // Card configuration for mobile view
  const destinationCardConfig: CardConfig<Destination> = {
    title: (dest) => dest.name || 'Unknown Destination',
    subtitle: (dest) => `${dest.location}, ${dest.country}`,
    primaryMetric: {
      field: 'description',
      label: 'Description',
    },
    actions: (dest) => (
      <div className="flex gap-3">
        <Link href={`/destinations/view/${dest.id}`} className="flex-1">
          <Button variant="outline" className="w-full h-14 min-h-[56px] text-base font-semibold rounded-xl">
            <Eye className="h-5 w-5 mr-2" />
            View
          </Button>
        </Link>
        <Link href={`/destinations/edit/${dest.id}`} className="flex-1">
          <Button className="w-full h-14 min-h-[56px] text-base font-semibold rounded-xl">
            <Edit className="h-5 w-5 mr-2" />
            Edit
          </Button>
        </Link>
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      {/* Header row with title and create button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Destinations</h1>
        <Link href="/destinations/create">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Destination
          </Button>
        </Link>
      </div>

      {/* Search and filter row */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search destinations..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by location..."
              className="pl-9"
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="flex items-center gap-1 border border-gray-300"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        </div>

        {/* Items per page selector */}
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">Rows per page</p>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table component */}
      <Table
        data={paginatedDestinations}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        totalEntries={totalEntries}
        showingFrom={showingFrom}
        showingTo={showingTo}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        cardConfig={destinationCardConfig}
        tableName="destinations"
      />
    </div>
  );
}