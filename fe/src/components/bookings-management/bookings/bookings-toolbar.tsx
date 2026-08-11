"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RefreshCw, Upload, X, AlertCircle, FileText } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BookingsToolbar() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleCancelUpload = () => {
    setFile(null);
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border"
        onClick={() => router.push('/bookings-management/cancellation')}
      >
        <AlertCircle className="mr-2 h-4 w-4" />
        Booking Cancel Requests
      </Button>
      <Button 
        variant="outline" 
        className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border"
        onClick={() => router.push('/bookings-management/reports')}
      >
        <FileText className="mr-2 h-4 w-4" />
        Report Management
      </Button>
      <Button variant="outline" className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border">
        <RefreshCw className="mr-2 h-4 w-4" />
        Sync Booking
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-background text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Bulk Upload - Bookings</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Upload a CSV file to import multiple bookings at once.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="csvFile" className="text-sm font-medium text-foreground">
                CSV File
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="csvFile"
                  className="flex-1 border rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-accent border-border text-foreground"
                >
                  {file ? file.name : "No file selected"}
                </label>
                {file && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelUpload}
                    className="text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!file}
              onClick={() => {
                setOpen(false);
                setFile(null);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}