"use client";

import { useState } from "react";
import { Table, Column, CardConfig } from "@/components/elements/Table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Eye, Trash2 } from "lucide-react";
import Link from "next/link";

interface Deal {
  id: string;
  title: string;
  source: string;
  tags: string[];
  createdAt: string;
}

export default function DealsTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data
  const mockDeals: Deal[] = [
    {
      id: "1",
      title: "Summer Promotion",
      source: "Website",
      tags: ["summer", "discount"],
      createdAt: "2023-06-15",
    },
    {
      id: "2",
      title: "Winter Special",
      source: "Partner",
      tags: ["winter", "holiday"],
      createdAt: "2023-12-01",
    },
    {
      id: "3",
      title: "New Year Sale",
      source: "Internal",
      tags: ["newyear", "sale"],
      createdAt: "2023-12-28",
    },
  ];

  // Unique sources and tags for filters
  const allSources = Array.from(new Set(mockDeals.map((deal) => deal.source)));
  const allTags = Array.from(new Set(mockDeals.flatMap((deal) => deal.tags)));

  // Filter logic
  const filteredDeals = mockDeals.filter((deal) => {
    const matchesSearch = deal.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter ? deal.source === sourceFilter : true;
    const matchesTag = tagFilter ? deal.tags.includes(tagFilter) : true;

    return matchesSearch && matchesSource && matchesTag;
  });

  // Pagination logic
  const totalEntries = filteredDeals.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const showingFrom = (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries);
  const paginatedDeals = filteredDeals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns: Column<Deal>[] = [
    {
      header: "Title",
      accessor: "title",
      cell: (row) => row.title,
      priority: 1, // Always show
    },
    {
      header: "Source",
      accessor: "source",
      cell: (row) => row.source,
      priority: 2, // Mobile+
    },
    {
      header: "Tags",
      accessor: "tags",
      cell: (row) => row.tags.join(", "),
      priority: 3, // Tablet+
    },
    {
      header: "Created At",
      accessor: "createdAt",
      cell: (row) => row.createdAt,
      priority: 4, // Desktop only
    },
    {
      header: "Action",
      accessor: "id",
      cell: (row) => (
        <div className="flex space-x-1 sm:space-x-2">
          <Link href={`/deals/edit/${row.id}`}>
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/deals/view/${row.id}`}>
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => console.log("Delete", row.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
      priority: 1, // Always show
    },
  ];

  // Card configuration for mobile view
  const dealCardConfig: CardConfig<Deal> = {
    title: (deal) => deal.title || 'Untitled Deal',
    subtitle: (deal) => deal.source || 'No source',
    primaryMetric: {
      field: 'createdAt',
      label: 'Created',
    },
    secondaryMetrics: [
      { 
        field: 'tags', 
        label: 'Tags',
        format: (val) => Array.isArray(val) ? val.join(', ') : val || '-'
      },
    ],
    actions: (deal) => (
      <div className="flex gap-3">
        <Link href={`/deals/edit/${deal.id}`} className="flex-1">
          <Button className="w-full h-14 min-h-[56px] text-base font-semibold rounded-xl">
            <Edit className="h-5 w-5 mr-2" />
            Edit
          </Button>
        </Link>
        <Link href={`/deals/view/${deal.id}`} className="flex-1">
          <Button variant="outline" className="w-full h-14 min-h-[56px] text-base font-semibold rounded-xl">
            <Eye className="h-5 w-5 mr-2" />
            View
          </Button>
        </Link>
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Deals</h1>
        <Link href="/deals/create" className="w-full sm:w-auto">
          <Button className="h-10 sm:h-9 min-h-[44px] w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Deal
          </Button>
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 sm:h-9"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-[200px]">
            <Select
              value={sourceFilter}
              onValueChange={(value) => {
                setSourceFilter(value === "all" ? "" : value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10 sm:h-9">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {allSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[200px]">
            <Select
              value={tagFilter}
              onValueChange={(value) => {
                setTagFilter(value === "all" ? "" : value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10 sm:h-9">
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[120px]">
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10 sm:h-9">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Table
        data={paginatedDeals}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        totalEntries={totalEntries}
        showingFrom={showingFrom}
        showingTo={showingTo}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        cardConfig={dealCardConfig}
        tableName="deals"
      />
    </div>
  );
}