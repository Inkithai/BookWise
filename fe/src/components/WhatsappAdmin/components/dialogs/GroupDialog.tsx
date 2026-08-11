import { useState } from 'react';
import { Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Contact } from '../../types';

export default function GroupDialog({
  open,
  onOpenChange,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
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

  const handleCreate = () => {
    console.log('New group:', { name, description, members: selectedContacts });
    onOpenChange(false);
    setName('');
    setDescription('');
    setSelectedContacts([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Create a group and add members
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Group description"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Add Members</label>
            <Input
              placeholder="Search contacts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border rounded-lg">
                {selectedContacts.map(contact => (
                  <div 
                    key={contact.id} 
                    className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback>{contact.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{contact.name}</span>
                    <button 
                      onClick={() => toggleContact(contact)}
                      className="text-muted-foreground hover:text-foreground ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          <Button 
            onClick={handleCreate}
            disabled={!name || selectedContacts.length === 0}
          >
            <Users className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}