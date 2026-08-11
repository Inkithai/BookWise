import { Contact, Chat, Group,currentUser } from './types';


export const generateInitials = (name: string) => 
  name.split(' ').map(n => n[0]).join('').toUpperCase();

export const generateContacts = (count: number): Contact[] => {
  const names = ['Alex Chen', 'Jamie Wilson', 'Taylor Smith', 'Morgan Lee'];
  const countryCodes = ['+1', '+44', '+91', '+81'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `contact-${i}`,
    name: names[i % names.length],
    phone: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    countryCode: countryCodes[i % countryCodes.length],
    status: Math.random() > 0.5 ? 'online' : 'offline',
    lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  }));
};

export const generateChats = (contacts: Contact[]): Chat[] => {
  return contacts.map((contact) => {
    const messages = [
      {
        id: 'msg-1',
        sender: contact,
        content: `Hi there! This is ${contact.name.split(' ')[0]}`,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isRead: true,
      },
      {
        id: 'msg-2',
        sender: currentUser,
        content: "Hello! How can I help you?",
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        isRead: true,
      },
      {
        id: 'msg-3',
        sender: contact,
        content: "Just checking in on the project status",
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        isRead: false,
      },
    ];
    return {
      id: `chat-${contact.id}`,
      contact,
      messages,
      unreadCount: messages.filter(m => !m.isRead).length,
      lastMessage: messages[messages.length - 1],
    };
  });
};

export const generateGroups = (contacts: Contact[]): Group[] => {
  return [
    {
      id: 'group-1',
      name: 'Dev Team',
      description: 'Development discussions',
      adminId: 'me',
      members: contacts.slice(0, 4),
      messages: [
        {
          id: 'msg-1',
          sender: contacts[0],
          content: "Good morning team!",
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
          isRead: true,
        },
        {
          id: 'msg-2',
          sender: contacts[1],
          content: "@You can you review the PR?",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          isRead: true,
          isMention: true,
        },
        {
          id: 'msg-3',
          sender: currentUser,
          content: "I'll check it this afternoon",
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          isRead: true,
        },
      ],
      unreadCount: 0,
    },
  ];
};