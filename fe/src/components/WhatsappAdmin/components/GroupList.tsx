import { Group } from '../types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MailOpen } from 'lucide-react';
import { generateInitials } from '../utils';

export default function GroupList({
  groups,
  selectedGroup,
  onSelectGroup,
}: {
  groups: Group[];
  selectedGroup: Group | null;
  onSelectGroup: (group: Group) => void;
}) {
  return (
    <>
      {groups.length > 0 ? (
        groups.map(group => (
          <div
            key={group.id}
            className={`p-3 border-b flex items-center gap-3 cursor-pointer hover:bg-accent ${
              selectedGroup?.id === group.id ? 'bg-accent' : ''
            }`}
            onClick={() => onSelectGroup(group)}
          >
            <Avatar>
              <AvatarFallback>{generateInitials(group.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <h3 className="font-medium truncate">{group.name}</h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(group.lastMessage?.timestamp || new Date(), 'h:mm a')}
                </span>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground truncate">
                  {group.lastMessage?.sender.name}: {group.lastMessage?.content}
                </p>
                {group.unreadCount > 0 ? (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {group.unreadCount}
                  </span>
                ) : (
                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="p-4 text-center text-muted-foreground">
          No groups found
        </div>
      )}
    </>
  );
}