import { useState } from 'react';
import { Group, Contact } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  contacts: Contact[];
  onSave: (updatedGroup: Group) => void;
}

export default function EditGroupDialog({
  open,
  onOpenChange,
  group,
  contacts,
  onSave,
}: EditGroupDialogProps) {
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>(group?.members || []);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter(
    contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedContacts.some(c => c.id === contact.id)
  );

  const toggleContact = (contact: Contact) => {
    setSelectedContacts(prev =>
      prev.some(c => c.id === contact.id)
        ? prev.filter(c => c.id !== contact.id)
        : [...prev, contact]
    );
  };

  const removeMember = (contactId: string) => {
    setSelectedContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const handleSave = () => {
    if (!group) return;
    
    const updatedGroup = {
      ...group,
      name,
      description,
      members: selectedContacts,
    };
    
    onSave(updatedGroup);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Group description"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Contacts</label>
            <Input
              placeholder="Search contacts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            {selectedContacts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Current Members ({selectedContacts.length})</h4>
                <div className="border rounded-lg p-2 space-y-2">
                  {selectedContacts.map(contact => (
                    <div 
                      key={contact.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{contact.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {contact.countryCode} {contact.phone}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeMember(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Available Contacts</h4>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="p-3 flex items-center gap-3 hover:bg-accent cursor-pointer"
                      onClick={() => toggleContact(contact)}
                    >
                      <Avatar>
                        <AvatarFallback>{contact.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{contact.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {contact.countryCode} {contact.phone}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    {searchQuery ? 'No contacts found' : 'No contacts available'}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}