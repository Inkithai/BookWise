// components/destinations/DestinationForm.tsx
"use client"

import { useState, useEffect } from 'react'
import { useForm, Control} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import ImageGallery from '@/components/elements/ImageGallery'
import { cn } from '@/lib/utils'
import { TextEditor } from '@/components/elements/TextEditor'

// Define Zod schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  locationNickname: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  description: z.string().min(1, 'Description is required'),
  images: z.array(z.instanceof(File)).optional(),
  sections: z.array(
    z.object({
      title: z.string().min(1, 'Title is required'),
      subtitle: z.string().optional(),
      content: z.string().min(1, 'Content is required'),
      images: z.array(z.instanceof(File)).optional(),
    })
  ).optional(),
})

// Infer the type from the schema
type DestinationFormValues = z.infer<typeof formSchema>

interface DestinationFormProps {
  mode: 'create' | 'edit' | 'view'
  initialData?: Partial<DestinationFormValues>
  onCancel: () => void
  onSubmit?: (data: DestinationFormValues) => void
}

// Extracted information tab component props
interface DestinationInformationTabProps {
  control: Control<DestinationFormValues>;
  isViewMode: boolean;
  images: File[];
  handleAddImages: (files: File[]) => void;
  handleRemoveImage: (index: number) => void;
}

export default function DestinationForm({ 
  mode,
  initialData,
  onCancel,
  onSubmit 
}: DestinationFormProps) {
  const [activeTab, setActiveTab] = useState('information')
  const [isMounted, setIsMounted] = useState(false)
  const isViewMode = mode === 'view'
  const isCreateMode = mode === 'create'
  const showSectionsTab = !isCreateMode // Only show sections tab in view/edit modes

  const form = useForm<DestinationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      locationNickname: '',
      country: '',
      description: '',
      images: [],
      sections: [],
      ...initialData
    }
  })

  const { control, handleSubmit, watch, setValue, formState } = form
  const sections = watch('sections') || []
  const images = watch('images') || []
  const sectionImages = sections.map(s => s.images || [])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Main image handlers
  const handleAddImages = (newImages: File[]) => {
    setValue('images', [...images, ...newImages], { shouldValidate: true })
  }

  const handleRemoveImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    setValue('images', newImages, { shouldValidate: true })
  }

  // Section handlers
  const handleAddSection = () => {
    setValue('sections', [...sections, {
      title: '',
      subtitle: '',
      content: '',
      images: []
    }], { shouldValidate: true })
  }

  const handleRemoveSection = (index: number) => {
    const newSections = [...sections]
    newSections.splice(index, 1)
    setValue('sections', newSections, { shouldValidate: true })
  }

  // Section image handlers
  const handleAddSectionImages = (index: number, newImages: File[]) => {
    const newSections = [...sections]
    newSections[index].images = [...(newSections[index].images || []), ...newImages]
    setValue('sections', newSections, { shouldValidate: true })
  }

  const handleRemoveSectionImage = (sectionIndex: number, imageIndex: number) => {
    const newSections = [...sections]
    const sectionImages = newSections[sectionIndex].images || []
    sectionImages.splice(imageIndex, 1)
    newSections[sectionIndex].images = sectionImages
    setValue('sections', newSections, { shouldValidate: true })
  }

  // Safe form submission handler
  const handleFormSubmit = async (data: DestinationFormValues) => {
    if (onSubmit) {
      await onSubmit(data)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold break-words">
            {isCreateMode ? 'Create Destination' : isViewMode ? 'View Destination' : 'Edit Destination'}
          </h1>
        </div>

        {showSectionsTab ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-2">
              <TabsTrigger value="information" className="text-sm sm:text-base px-2 sm:px-4">Destination Information</TabsTrigger>
              <TabsTrigger value="sections" className="text-sm sm:text-base px-2 sm:px-4">Destination Sections</TabsTrigger>
            </TabsList>

            <TabsContent value="information">
              <DestinationInformationTab 
                control={control} 
                isViewMode={isViewMode} 
                images={images}
                handleAddImages={handleAddImages}
                handleRemoveImage={handleRemoveImage}
              />
            </TabsContent>

            <TabsContent value="sections">
              <div className={cn("space-y-4 sm:space-y-6 pt-4", isViewMode && 'pointer-events-none')}>
                {sections.map((section, index) => (
                  <div key={index} className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <h3 className="font-medium">Section {index + 1}</h3>
                      {!isViewMode && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSection(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <FormField
                      control={control}
                      name={`sections.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter section title" 
                              {...field} 
                              value={field.value as string}
                              readOnly={isViewMode} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`sections.${index}.subtitle`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subtitle</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter section subtitle" 
                              {...field} 
                              value={field.value as string}
                              readOnly={isViewMode} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`sections.${index}.content`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <TextEditor
                              value={field.value as string}
                              onChange={field.onChange}
                              placeholder="Enter section content"
                              readOnly={isViewMode}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel>Section Images</FormLabel>
                      <ImageGallery
                        images={sectionImages[index] || []}
                        onAddImages={(files) => handleAddSectionImages(index, files)}
                        onRemoveImage={(imgIndex) => handleRemoveSectionImage(index, imgIndex)}
                        readOnly={isViewMode}
                      />
                      <FormMessage />
                    </FormItem>
                  </div>
                ))}

                {!isViewMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleAddSection}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Section
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <DestinationInformationTab 
            control={control} 
            isViewMode={isViewMode} 
            images={images}
            handleAddImages={handleAddImages}
            handleRemoveImage={handleRemoveImage}
          />
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          {!isViewMode && (
            <Button type="submit" disabled={formState.isSubmitting} className="w-full sm:w-auto">
              {isCreateMode ? 'Create Destination' : 'Save Changes'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

// Extracted information tab component
function DestinationInformationTab({
  control,
  isViewMode,
  images,
  handleAddImages,
  handleRemoveImage
}: DestinationInformationTabProps) {
  return (
    <div className={cn("space-y-4 sm:space-y-6 pt-4", isViewMode && 'pointer-events-none')}>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Destination Name</FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter destination name" 
                {...field} 
                value={field.value as string}
                readOnly={isViewMode} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="locationNickname"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location Nickname</FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter location nickname" 
                {...field} 
                value={field.value as string}
                readOnly={isViewMode} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="country"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={field.value as string} 
              disabled={isViewMode}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="USA">United States</SelectItem>
                <SelectItem value="UK">United Kingdom</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="Japan">Japan</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Enter destination description" 
                className="min-h-[120px]"
                {...field} 
                value={field.value as string}
                readOnly={isViewMode}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormItem>
        <FormLabel>Destination Images</FormLabel>
        <ImageGallery
          images={images}
          onAddImages={handleAddImages}
          onRemoveImage={handleRemoveImage}
          readOnly={isViewMode}
        />
        <FormMessage />
      </FormItem>
    </div>
  )
}