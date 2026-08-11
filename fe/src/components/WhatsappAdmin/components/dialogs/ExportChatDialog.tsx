import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Chat } from '../../types';

export default function ExportChatDialog({
  open,
  onOpenChange,
  chat,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: Chat | null;
}) {
  const [contactName, setContactName] = useState('');
  const [yourName, setYourName] = useState('You');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chat) {
      setContactName(chat.contact.name);
    }
  }, [chat]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.txt')) {
      setError('Please upload a .txt file');
      return;
    }

    setFile(selectedFile);
  };

  const handleExport = () => {
    // In a real app, this would process the file and export the chat
    alert(`Exporting chat with ${contactName} as ${yourName}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export WhatsApp Chat</DialogTitle>
          <DialogDescription>
            Export your chat messages to a file
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Contact Name (Sender)</label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Contact name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Name (Owner)</label>
            <Input
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp Exported File (.txt)</label>
            <Input 
              type="file" 
              accept=".txt" 
              onChange={handleFileChange}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={!contactName || !yourName || !file}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Chat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}