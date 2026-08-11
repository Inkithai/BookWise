import { Chat, Group } from '../types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, Download, MessageSquare, Users } from 'lucide-react';
import { generateInitials } from '../utils';

interface MessageAreaProps {
  selectedChat: Chat | null;
  selectedGroup: Group | null;
  message: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  theme: string | undefined;
  messagesEndRef: React.RefObject<HTMLDivElement | null>; // Allow null
  onExportChat: () => void;
  onViewGroupDetails: () => void;
}

export default function MessageArea({
  selectedChat,
  selectedGroup,
  message,
  onMessageChange,
  onSendMessage,
  theme,
  messagesEndRef,
  onExportChat,
  onViewGroupDetails,
}: MessageAreaProps)  {
  if (!selectedChat && !selectedGroup) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center p-6 max-w-md">
          <div className="mx-auto mb-4 flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-medium mb-2">WhatsApp Web</h2>
          <p className="text-muted-foreground mb-6">
            Select a chat to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Fixed Header */}
      <div className={`p-3 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
              {generateInitials(
                selectedChat?.contact.name || selectedGroup?.name || ''
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">
              {selectedChat?.contact.name || selectedGroup?.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedChat
                ? selectedChat.contact.status === 'online'
                  ? 'Online'
                  : `Last seen ${format(
                      selectedChat.contact.lastSeen || new Date(),
                      'h:mm a'
                    )}`
                : `${selectedGroup?.members.length} members`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedGroup && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onViewGroupDetails}
            >
              <Users className="h-4 w-4 mr-2" />
              View Group
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onExportChat}
            title="Export chat"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
        {(selectedChat?.messages || selectedGroup?.messages || []).map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 flex ${
              msg.sender.id === 'me' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[75%] rounded-lg p-3 ${
                msg.sender.id === 'me'
                  ? 'bg-primary text-primary-foreground'
                  : theme === 'dark' 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-white'
              } ${
                msg.isMention ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              {selectedGroup && msg.sender.id !== 'me' && (
                <p className="font-medium text-xs mb-1">
                  {msg.sender.name}
                </p>
              )}
              <p>{msg.content}</p>
              <p
                className={`text-xs mt-1 text-right ${
                  msg.sender.id === 'me' 
                    ? 'text-primary-foreground/70' 
                    : 'text-muted-foreground'
                }`}
              >
                {format(msg.timestamp, 'h:mm a')}
                {msg.sender.id === 'me' && (
                  <span className="ml-1">
                    {msg.isRead ? '✓✓' : '✓'}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input */}
      <div className={`p-3 border-t ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Type a message"
            className="flex-1"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
          />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onSendMessage}
            disabled={!message.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}