import { Chat } from '../types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, MailOpen, Download,MoreVertical} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { generateInitials } from '../utils';

export default function ChatList({
  chats,
  selectedChat,
  onSelectChat,
  onMarkAsUnread,
  onExportChat,
}: {
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  onMarkAsUnread: (chatId: string) => void;
  onExportChat: () => void;
}) {
  return (
    <>
      {chats.length > 0 ? (
        chats.map(chat => (
          <div
            key={chat.id}
            className={`p-3 border-b flex items-center gap-3 cursor-pointer hover:bg-accent ${
              selectedChat?.id === chat.id ? 'bg-accent' : ''
            }`}
            onClick={() => onSelectChat(chat)}
          >
            <Avatar>
              <AvatarFallback>{generateInitials(chat.contact.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <h3 className="font-medium truncate">{chat.contact.name}</h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(chat.lastMessage?.timestamp || new Date(), 'h:mm a')}
                </span>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground truncate">
                  {chat.lastMessage?.content}
                </p>
                {chat.unreadCount > 0 ? (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {chat.unreadCount}
                  </span>
                ) : (
                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onMarkAsUnread(chat.id)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Mark as Unread
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportChat}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))
      ) : (
        <div className="p-4 text-center text-muted-foreground">
          No chats found
        </div>
      )}
    </>
  );
}