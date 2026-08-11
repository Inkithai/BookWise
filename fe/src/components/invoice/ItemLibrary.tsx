// components/invoice/ItemLibrary.tsx
"use client";

import { useState, useEffect } from "react";
import { InvoiceItem } from "@/services/interface/invoice";
import { getInvoiceItemsForReuse } from "@/services/invoice.service";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, RefreshCw, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface ItemLibraryProps {
  onItemSelect: (item: InvoiceItem) => void;
  currentCurrency?: string;
}

export function ItemLibrary({ onItemSelect, currentCurrency = 'LKR' }: ItemLibraryProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const loadItems = async () => {
    try {
      setLoading(true);
      const fetchedItems = await getInvoiceItemsForReuse();
      // Remove duplicates - keep only unique items by name
      const uniqueItems = fetchedItems.filter((item, index, self) =>
        index === self.findIndex((i) => 
          i.name.toLowerCase() === item.name.toLowerCase()
        )
      );
      setItems(uniqueItems);
    } catch (error) {
      console.error("Failed to load items:", error);
      toast.error("Failed to load items from invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dropdownOpen) {
      loadItems();
    }
  }, [dropdownOpen]);

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleItemSelect = (item: InvoiceItem) => {
    const selectedItem = {
      ...item,
      id: Date.now(),
      currency: currentCurrency,
      quantity: item.quantity || 1,
      discount: item.discount || 0,
      vat: item.vat || 0,
      total: item.total || item.total_amount || 0,
    };
    
    onItemSelect(selectedItem);
    setDropdownOpen(false);
    setSearchQuery("");
    toast.success(`"${item.name}" added to form`);
  };

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <FileText className="h-3 w-3" />
          Browse Items
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-[400px] overflow-y-auto" align="start">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span className="font-semibold">Select from Existing Items</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              loadItems();
            }}
            disabled={loading}
            className="h-6 w-6"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search item names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Items List - Only shows description */}
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-xs text-muted-foreground">Loading items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "No items found" : "No items available"}
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <DropdownMenuItem
                key={`${item.id}-${index}`}
                onClick={() => handleItemSelect(item)}
                className="flex justify-between items-center p-2 cursor-pointer hover:bg-accent"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="truncate text-sm">{item.name}</span>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                    {item.type}
                  </Badge>
                </div>
                {/* <ChevronDown className="h-3 w-3 text-muted-foreground ml-2" /> */}
              </DropdownMenuItem>
            ))
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Summary */}
        <div className="p-2">
          <div className="text-xs text-muted-foreground">
            {items.length > 0 && (
              <p>
                Found {filteredItems.length} of {items.length} items
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            )}
            <p className="mt-1">Select an item to auto-fill form fields</p>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}