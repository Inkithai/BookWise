// components/elements/ImageGallery.tsx
"use client"

import { Button } from '@/components/ui/button'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useCallback } from 'react'


interface ImageGalleryProps {
  images: File[]
  onAddImages: (files: File[]) => void
  onRemoveImage: (index: number) => void
  readOnly?: boolean
}

export default function ImageGallery({ 
  images, 
  onAddImages, 
  onRemoveImage, 
  readOnly = false 
}: ImageGalleryProps) {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onAddImages(files)
    }
  }, [onAddImages])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative aspect-square group">
            <img
              src={URL.createObjectURL(image)}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover rounded-lg"
            />
            {!readOnly && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 sm:h-6 sm:w-6"
                onClick={() => onRemoveImage(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-40 sm:h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <ImagePlus className="w-8 h-8 mb-3" />
              <p className="mb-2 text-sm">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">Multiple files allowed</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
              multiple
            />
          </label>
        </div>
      )}
    </div>
  )
}