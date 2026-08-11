// src/components/crm/LeadStatusManager.tsx
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { Plus, Edit, Loader2, Users, BarChart3, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getCRMLeadStatuses, 
  storeCRMLeadStatus, 
  getLeadUsers
} from '@/services/crm.service';
import { CRMLeadStatus, CRMLeadUser } from '@/services/interface/crm';

export function LeadStatusManager() {
  const [statuses, setStatuses] = useState<CRMLeadStatus[]>([]);
  const [leadUsers, setLeadUsers] = useState<CRMLeadUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<CRMLeadStatus | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusesData, leadUsersData] = await Promise.all([
        getCRMLeadStatuses(),
        getLeadUsers()
      ]);
      
      setStatuses(statusesData);
      setLeadUsers(leadUsersData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Status name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...(editingStatus && { id: editingStatus.id }),
        name: formData.name.trim()
      };

      await storeCRMLeadStatus(payload);
      
      toast.success(
        editingStatus 
          ? 'Status updated successfully' 
          : 'Status created successfully'
      );
      
      setDialogOpen(false);
      resetForm();
      await loadData(); // Reload the data
    } catch (error) {
      console.error('Failed to save status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (status: CRMLeadStatus) => {
    setEditingStatus(status);
    setFormData({ name: status.name });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingStatus(null);
    setFormData({ name: '' });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lead status data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm">
            <Button variant="outline" size="icon">
              <ChevronLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lead Status Management</h1>
            
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Add Status
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStatus ? 'Edit Lead Status' : 'Create New Lead Status'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="statusName" className="text-sm font-medium">
                  Status Name *
                </Label>
                <Input
                  id="statusName"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="e.g., Contacted, Qualified, Converted"
                  required
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a descriptive name for the lead status
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingStatus ? 'Update Status' : 'Create Status'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{statuses.length}</div>
              <div className="text-sm text-muted-foreground">Total Statuses</div>
            </div>
          </div>
        </div>
        
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{leadUsers.length}</div>
              <div className="text-sm text-muted-foreground">Lead Users</div>
            </div>
          </div>
        </div>
      </div>


      {/* Status List Table */}
      <div className="border rounded-lg bg-card">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Lead Statuses</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all available lead statuses in your CRM system
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Status Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses.map((status) => (
              <TableRow key={status.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{status.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{status.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {status.created_at 
                      ? new Date(status.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'N/A'
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {status.updated_at 
                      ? new Date(status.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'N/A'
                    }
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(status)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {statuses.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                    <div>
                      <p className="text-muted-foreground font-medium">No lead statuses found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create your first lead status to get started
                      </p>
                    </div>
                    <Button 
                      onClick={() => setDialogOpen(true)}
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Status
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}