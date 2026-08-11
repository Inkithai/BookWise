export type Contact = {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
  status: 'online' | 'offline';
  lastSeen?: Date;
};

export type Message = {
  id: string;
  sender: Contact | { id: string; name: string };
  content: string;
  timestamp: Date;
  isRead: boolean;
  isMention?: boolean;
};

export type Chat = {
  id: string;
  contact: Contact;
  messages: Message[];
  unreadCount: number;
  lastMessage?: Message;
};

export type Group = {
  id: string;
  name: string;
  description?: string;
  adminId: string;
  members: Contact[];
  messages: Message[];
  unreadCount: number;
  lastMessage?: Message;
};

export const currentUser = { id: 'me', name: 'You' };