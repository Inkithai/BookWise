// BlogTable.tsx
"use client";

import { useState } from "react";
import { Table, Column, CardConfig } from "@/components/elements/Table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Edit, Trash2, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/blogs/MultiSelect";

interface Blog {
  id: string;
  title: string;
  type: string;
  status: "published" | "draft";
  category: string;
  tags: string[];
  createdAt: string;
}

export default function BlogsTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data
  const mockBlogs: Blog[] = [
    {
      id: "1",
      title: "Getting Started with Next.js",
      type: "Tutorial",
      status: "published",
      category: "Development",
      tags: ["nextjs", "react"],
      createdAt: "2023-06-15",
    },
    {
      id: "2",
      title: "Advanced React Patterns",
      type: "Guide",
      status: "draft",
      category: "Development",
      tags: ["react", "patterns"],
      createdAt: "2023-06-10",
    },
  ];

  // All available tags for filter
  const allTags = Array.from(new Set(mockBlogs.flatMap(blog => blog.tags)));

  // Filter logic
  const filteredBlogs = mockBlogs.filter((blog) =>
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (typeFilter ? blog.type === typeFilter : true) &&
    (statusFilter ? blog.status === statusFilter : true) &&
    (categoryFilter ? blog.category === categoryFilter : true) &&
    (tagFilters.length > 0 ? blog.tags.some(tag => tagFilters.includes(tag)) : true)
  );

  // Pagination logic
  const totalEntries = filteredBlogs.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const showingFrom = totalEntries === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries);
  const paginatedBlogs = filteredBlogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns: Column<Blog>[] = [
    {
      header: "Title",
      accessor: "title",
      cell: (row) => row.title,
      priority: 1, // Always show
    },
    {
      header: "Type",
      accessor: "type",
      cell: (row) => row.type,
      priority: 2, // Mobile+
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <Badge variant={row.status === "published" ? "default" : "secondary"}>
          {row.status}
        </Badge>
      ),
      priority: 2, // Mobile+
    },
    {
      header: "Category",
      accessor: "category",
      cell: (row) => row.category,
      priority: 3, // Tablet+
    },
    {
      header: "Tags",
      accessor: "tags",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.map(tag => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      ),
      priority: 4, // Desktop only
    },
    {
      header: "Action",
      accessor: "id",
      cell: (row) => (
        <div className="flex space-x-2">
          <Link href={`/blogs/edit/${row.id}`}>
            <Button variant="ghost" size="icon" title="Edit">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => console.log("Delete", row.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
      priority: 1, // Always show
    },
  ];

  // Card configuration for mobile view
  const blogCardConfig: CardConfig<Blog> = {
    title: (blog) => blog.title || 'Untitled',
    subtitle: (blog) => blog.category || 'No category',
    primaryMetric: {
      field: 'type',
      label: 'Type',
    },
    secondaryMetrics: [
      { field: 'status', label: 'Status' },
    ],
    statusField: 'status',
    statusColors: {
      'published': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    },
    actions: (blog) => (
      <div className="flex gap-3">
        <Link href={`/blogs/edit/${blog.id}`} className="flex-1">
          <Button className="w-full h-14 min-h-[56px] text-base font-semibold rounded-xl">
            <Edit className="h-5 w-5 mr-2" />
            Edit Blog
          </Button>
        </Link>
      </div>
    ),
  };

  // Reset pagination when filters/search change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const handleTagChange = (values: string[]) => {
    setTagFilters(values);
    setCurrentPage(1);
  };

  const handleRowsChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setStatusFilter("");
    setCategoryFilter("");
    setTagFilters([]);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Blogs</h1>
        <Link href="/blogs/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Blog
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          placeholder="Search blogs..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full md:w-auto md:flex-1 min-w-[10px]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                {typeFilter || "Select Type"}
                {typeFilter && (
                  <X 
                    className="h-3 w-3" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTypeChange("");
                    }}
                  />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleTypeChange("")}>All Types</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTypeChange("Tutorial")}>Tutorial</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTypeChange("News")}>News</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTypeChange("Guide")}>Guide</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                {statusFilter || "Select Status"}
                {statusFilter && (
                  <X 
                    className="h-3 w-3" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange("");
                    }}
                  />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleStatusChange("")}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("published")}>Published</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("draft")}>Draft</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                {categoryFilter || "Select Category"}
                {categoryFilter && (
                  <X 
                    className="h-3 w-3" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCategoryChange("");
                    }}
                  />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleCategoryChange("")}>All Categories</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCategoryChange("Development")}>Development</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCategoryChange("Design")}>Design</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCategoryChange("Marketing")}>Marketing</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <MultiSelect
            options={allTags.map(tag => ({ value: tag, label: tag }))}
            selected={tagFilters}
            onChange={handleTagChange}
            placeholder="Select Tags"
            className="w-[150px]"
          />

          <Button 
            variant="ghost" 
            onClick={clearFilters} 
            className="text-sm flex items-center gap-1"
          >
            Clear filters
          </Button>
        </div>

        <div className="flex items-center space-x-2 ml-auto">
          <span className="text-sm text-muted-foreground">Rows</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-20">
                {itemsPerPage}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {[10, 20, 30, 50].map((value) => (
                <DropdownMenuItem key={value} onClick={() => handleRowsChange(value)}>
                  {value}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Table
        data={paginatedBlogs}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        totalEntries={totalEntries}
        showingFrom={showingFrom}
        showingTo={showingTo}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        cardConfig={blogCardConfig}
        tableName="blogs"
      />
    </div>
  );
}