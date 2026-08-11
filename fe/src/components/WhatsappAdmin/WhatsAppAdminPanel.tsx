"use client";

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, MessageSquare, Users, Search, Import } from 'lucide-react';
import { Contact, Chat, Group, currentUser } from './types';
import { generateContacts, generateChats, generateGroups } from './utils';
import ContactList from './components/ContactList';
import ChatList from './components/ChatList';
import GroupList from './components/GroupList';
import MessageArea from './components/MessageArea';
import AddContactDialog from './components/dialogs/AddContactDialog';
import GroupDialog from './components/dialogs/GroupDialog';
import ImportContactsDialog from './components/dialogs/ImportContactsDialog';
import ExportChatDialog from './components/dialogs/ExportChatDialog';
import GroupDetailsDialog from './components/dialogs/GroupDetailsDialog';
import EditGroupDialog from './components/dialogs/EditGroupDialog';

export default function WhatsAppAdminPanel() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'contacts'>('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isImportContactsOpen, setIsImportContactsOpen] = useState(false);
  const [isExportChatOpen, setIsExportChatOpen] = useState(false);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>(generateChats(generateContacts(8)));
  const [groups, setGroups] = useState<Group[]>(generateGroups(generateContacts(8)));
  const [allContacts, setAllContacts] = useState<Contact[]>(generateContacts(8));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredChats = chats.filter(chat =>
    chat.contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = allContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: currentUser,
      content: message,
      timestamp: new Date(),
      isRead: false,
      isMention: message.includes('@'),
    };

    if (selectedChat) {
      const updatedChat = {
        ...selectedChat,
        messages: [...selectedChat.messages, newMessage],
        unreadCount: 0,
        lastMessage: newMessage,
      };
      setSelectedChat(updatedChat);
      setChats(chats.map(c => c.id === updatedChat.id ? updatedChat : c));
    } else if (selectedGroup) {
      const updatedGroup = {
        ...selectedGroup,
        messages: [...selectedGroup.messages, newMessage],
        unreadCount: 0,
        lastMessage: newMessage,
      };
      setSelectedGroup(updatedGroup);
      setGroups(groups.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    }

    setMessage('');
  };

  const markAsUnread = (chatId: string) => {
    setChats(chats.map(chat => {
      if (chat.id === chatId) {
        return { ...chat, unreadCount: chat.unreadCount + 1 };
      }
      return chat;
    }));
  };

  const handleImportContacts = (importedContacts: Contact[]) => {
    setAllContacts([...allContacts, ...importedContacts]);
    const newChats = generateChats(importedContacts);
    setChats([...chats, ...newChats]);
  };

  const handleUpdateGroup = (updatedGroup: Group) => {
    setGroups(groups.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    if (selectedGroup?.id === updatedGroup.id) {
      setSelectedGroup(updatedGroup);
    }
    setIsEditGroupOpen(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages, selectedGroup?.messages]);

  return (
    <div className="flex h-full">
      {/* Left Panel - Chat List */}
      <div className={`w-96 border-r flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Header */}
        <div className="p-3 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Messages</h2>
          <div className="flex gap-2">
            {/* New Contact Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsAddContactOpen(true)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New Contact</p>
              </TooltipContent>
            </Tooltip>

            {/* New Group Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsGroupDialogOpen(true)}
                >
                  <Users className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New Group</p>
              </TooltipContent>
            </Tooltip>

            {/* Import Contacts Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsImportContactsOpen(true)}
                >
                  <Import className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import Contacts</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <Button
            variant="ghost"
            className={`flex-1 rounded-none ${activeTab === 'chats' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('chats')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chats
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 rounded-none ${activeTab === 'groups' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('groups')}
          >
            <Users className="h-4 w-4 mr-2" />
            Groups
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 rounded-none ${activeTab === 'contacts' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('contacts')}
          >
            <Users className="h-4 w-4 mr-2" />
            Contacts
          </Button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chats' ? (
            <ChatList 
              chats={filteredChats} 
              selectedChat={selectedChat}
              onSelectChat={(chat) => {
                setSelectedChat(chat);
                setSelectedGroup(null);
              }}
              onMarkAsUnread={markAsUnread}
              onExportChat={() => setIsExportChatOpen(true)}
            />
          ) : activeTab === 'groups' ? (
            <GroupList 
              groups={filteredGroups}
              selectedGroup={selectedGroup}
              onSelectGroup={(group) => {
                setSelectedGroup(group);
                setSelectedChat(null);
              }}
            />
          ) : (
            <ContactList contacts={filteredContacts} />
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <MessageArea
        selectedChat={selectedChat}
        selectedGroup={selectedGroup}
        message={message}
        onMessageChange={setMessage}
        onSendMessage={handleSendMessage}
        theme={theme}
        messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement | null>}
        onExportChat={() => setIsExportChatOpen(true)}
        onViewGroupDetails={() => setIsGroupDetailsOpen(true)}
      />

      {/* Dialogs */}
      <AddContactDialog
        open={isAddContactOpen}
        onOpenChange={setIsAddContactOpen}
      />
      
      <GroupDialog
        open={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
        contacts={allContacts}
      />

      <ImportContactsDialog
        open={isImportContactsOpen}
        onOpenChange={setIsImportContactsOpen}
        onImport={handleImportContacts}
      />

      <ExportChatDialog
        open={isExportChatOpen}
        onOpenChange={setIsExportChatOpen}
        chat={selectedChat}
      />

      <GroupDetailsDialog
        open={isGroupDetailsOpen}
        onOpenChange={setIsGroupDetailsOpen}
        group={selectedGroup}
        onEditClick={() => {
          setIsGroupDetailsOpen(false);
          setIsEditGroupOpen(true);
        }}
      />

      <EditGroupDialog
        open={isEditGroupOpen}
        onOpenChange={setIsEditGroupOpen}
        group={selectedGroup}
        contacts={allContacts}
        onSave={handleUpdateGroup}
      />
    </div>
  );
}