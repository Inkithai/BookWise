import { Contact } from '../types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { generateInitials } from '../utils';

export default function ContactList({ contacts }: { contacts: Contact[] }) {
  return (
    <>
      {contacts.length > 0 ? (
        contacts.map(contact => (
          <div
            key={contact.id}
            className="p-3 border-b flex items-center gap-3 cursor-pointer hover:bg-accent"
          >
            <Avatar>
              <AvatarFallback>{generateInitials(contact.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{contact.name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {contact.countryCode} {contact.phone}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              contact.status === 'online' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {contact.status}
            </span>
          </div>
        ))
      ) : (
        <div className="p-4 text-center text-muted-foreground">
          No contacts found
        </div>
      )}
    </>
  );
}