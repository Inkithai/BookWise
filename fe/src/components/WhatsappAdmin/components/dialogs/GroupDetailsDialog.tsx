import { Group } from '../../types';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface GroupDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  onEditClick: () => void;
}

export default function GroupDetailsDialog({
  open,
  onOpenChange,
  group,
  onEditClick,
}: GroupDetailsDialogProps) {
  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Group Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">GROUP INFORMATION</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Group Name</p>
                <p>{group.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{group.description || 'No description'}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">GROUP METADATA</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Created By</p>
                <p>{group.adminId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p>{format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated At</p>
                <p>{format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">MEMBERS</h3>
            <div className="border rounded-lg">
              <table className="min-w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Phone Number</th>
                  </tr>
                </thead>
                <tbody>
                  {group.members.map((member) => (
                    <tr key={member.id} className="border-b">
                      <td className="p-2">{member.name}</td>
                      <td className="p-2">{member.countryCode} {member.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}