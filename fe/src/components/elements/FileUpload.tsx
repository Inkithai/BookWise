// src/components/common/FileUpload.tsx
"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadIcon, XIcon } from "./../../components/property/sections/icons";


interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
}

export const FileUpload = ({ 
  files, 
  onFilesChange, 
  multiple = false, 
  accept = "image/*,.pdf,.doc,.docx" 
}: FileUploadProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = multiple 
        ? [...files, ...Array.from(e.target.files)]
        : Array.from(e.target.files);
      onFilesChange(newFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input 
          type="file" 
          onChange={handleFileChange} 
          multiple={multiple}
          accept={accept}
          className="hidden"
          id="file-upload"
        />
        <Button
          variant="outline"
          asChild
        >
          <Label htmlFor="file-upload" className="cursor-pointer">
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload
          </Label>
        </Button>
        <span className="text-sm text-muted-foreground">
          {multiple ? "Select one or more files" : "Select a file"}
        </span>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded">
              <span className="text-sm truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};