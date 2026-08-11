// components/employees/EmployeeTable.tsx
"use client";

import { useState } from "react";
import { Table, Column, CardConfig } from "@/components/elements/Table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, PlusCircle, Edit, Trash2,Eye } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  salary: number;
  position: string;
  status: "Active" | "Inactive";
  dateOfJoining: Date;
}

export function EmployeeTable() {
  // Mock data - in a real app, this would come from an API
  const mockEmployees: Employee[] = [
    {
      id: "1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "123-456-7890",
      salary: 300,
      position: "Software Engineer",
      status: "Active",
      dateOfJoining: new Date("2020-01-15"),
    },
    {
      id: "2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phone: "234-567-8901",
      salary: 300,
      position: "Product Manager",
      status: "Active",
      dateOfJoining: new Date("2019-05-20"),
    },
    {
      id: "3",
      firstName: "Robert",
      lastName: "Johnson",
      email: "robert.j@example.com",
      phone: "345-678-9012",
      salary: 100,
      position: "UX Designer",
      status: "Inactive",
      dateOfJoining: new Date("2021-03-10"),
    },
  ];

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter employees based on search term and date filter
  const filteredEmployees = mockEmployees.filter((employee) => {
    const matchesSearch =
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = dateFilter
      ? format(employee.dateOfJoining, "yyyy-MM-dd") === format(dateFilter, "yyyy-MM-dd")
      : true;

    return matchesSearch && matchesDate;
  });

  // Pagination logic
  const totalEntries = filteredEmployees.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const showingFrom = (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries);
  const paginatedEmployees = filteredEmployees.slice(showingFrom - 1, showingTo);

  const columns: Column<Employee>[] = [
    {
      header: "First Name",
      accessor: "firstName",
      priority: 1, // Always show
    },
    {
      header: "Last Name",
      accessor: "lastName",
      priority: 1, // Always show
    },
    {
      header: "Email",
      accessor: "email",
      priority: 2, // Mobile+
    },
    {
      header: "Phone",
      accessor: "phone",
      priority: 2, // Mobile+
    },
    {
      header: "Salary",
      accessor: "salary",
      cell: (row: Employee) => `£${row.salary.toLocaleString()}`,
      priority: 3, // Tablet+
    },
    {
      header: "Position",
      accessor: "position",
      priority: 3, // Tablet+
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row: Employee) => (
        <span
          className={cn(
            "px-2 py-1 rounded-full text-xs",
            row.status === "Active"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          )}
        >
          {row.status}
        </span>
      ),
      priority: 2, // Mobile+
    },
    {
      header: "Date of Joining",
      accessor: "dateOfJoining",
      cell: (row: Employee) => format(row.dateOfJoining, "MMM dd, yyyy"),
      priority: 4, // Desktop only
    },
{
  header: "Actions",
  accessor: "actions",
  cell: () => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" className="h-8 px-2 lg:px-3">
        <Edit className="h-4 w-4" />
        <span className="hidden lg:inline ml-1">Edit</span>
      </Button>
      <Button variant="ghost" size="sm" className="h-8 px-2 lg:px-3">
        <Eye className="h-4 w-4" />
        <span className="hidden lg:inline ml-1">View</span>
      </Button>
      <Button variant="ghost" size="sm" className="h-8 px-2 lg:px-3">
        <Trash2 className="h-4 w-4 text-red-500" />
        <span className="hidden lg:inline ml-1 text-red-500">Delete</span>
      </Button>
    </div>
  ),
  priority: 1, // Always show
},
  ];

  // Card configuration for mobile view
  const employeeCardConfig: CardConfig<Employee> = {
    title: (emp) => `${emp.firstName} ${emp.lastName}`,
    subtitle: (emp) => emp.email || '-',
    primaryMetric: {
      field: 'position',
      label: 'Position',
    },
    secondaryMetrics: [
      { 
        field: 'phone', 
        label: 'Phone'
      },
      { 
        field: 'salary', 
        label: 'Salary',
        format: (val) => `£${(val as number).toLocaleString()}`
      },
    ],
    statusField: 'status',
    statusColors: {
      'Active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Inactive': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
    actions: (emp) => (
      <div className="flex gap-3">
        <Button className="flex-1 h-14 min-h-[56px] text-base font-semibold rounded-xl">
          <Edit className="h-5 w-5 mr-2" />
          Edit
        </Button>
        <Button variant="outline" className="h-14 w-14 min-h-[56px] rounded-xl">
          <Eye className="h-5 w-5" />
        </Button>
        <Button variant="outline" className="h-14 w-14 min-h-[56px] rounded-xl border-red-200 hover:bg-red-50">
          <Trash2 className="h-5 w-5 text-red-500" />
        </Button>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-primary">Employees</h1>
        <Button className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Employee
        </Button>
      </div>

      {/* Toolbar - Responsive Layout */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[240px] justify-start text-left font-normal",
                !dateFilter && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter ? format(dateFilter, "PPP") : <span>Filter by date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={(date) => {
                setDateFilter(date);
                setCurrentPage(1);
              }}
              initialFocus
            />
            {dateFilter && (
              <div className="p-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setDateFilter(undefined);
                    setCurrentPage(1);
                  }}
                >
                  Clear filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Rows:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[70px] sm:w-[80px]">
              <SelectValue placeholder="Rows" />
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

      <Table<Employee>
        data={paginatedEmployees}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        totalEntries={totalEntries}
        showingFrom={showingFrom}
        showingTo={showingTo}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        cardConfig={employeeCardConfig}
        tableName="employees"
      />
    </div>
  );
}