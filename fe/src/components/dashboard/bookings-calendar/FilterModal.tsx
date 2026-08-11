//FilterModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterStatus: string;
  onFilterChange: (status: string) => void;
}

export default function FilterModal({ 
  open, 
  onOpenChange, 
  filterStatus, 
  onFilterChange 
}: FilterModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filter Bookings</DialogTitle>
          <DialogDescription>
            Filter bookings by status or other criteria.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select 
              value={filterStatus} 
              onValueChange={onFilterChange}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            onFilterChange('all');
            onOpenChange(false);
          }}>
            Reset
          </Button>
          <Button onClick={() => onOpenChange(false)}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}