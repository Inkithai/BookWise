
// components/deals/DealForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from 'next/link';
import { Edit, Trash2, ImagePlus } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { TextEditor } from "@/components/elements/TextEditor";
import ImageGallery from "@/components/elements/ImageGallery";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const dealFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  source: z.string().min(1, "Source is required"),
  tags: z.string(),
  shortDescription: z.string().min(10, "Description must be at least 10 characters"),
  body: z.string().min(20, "Content must be at least 20 characters"),
  status: z.enum(["draft", "active", "archived"]),
  isFeatured: z.boolean(),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

export default function DealForm({ dealId, viewMode = false }: { dealId?: string; viewMode?: boolean }) {
  const router = useRouter();
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);

  // Default values with explicit type
  const defaultValues: DealFormValues = dealId ? {
    title: "Summer Promotion",
    source: "Website",
    tags: "summer,discount",
    shortDescription: "Special summer promotion with up to 50% off",
    body: "<h2>Summer Promotion Details</h2><p>This is the full content of the summer promotion...</p>",
    status: "active",
    isFeatured: true
  } : {
    title: "",
    source: "",
    tags: "",
    shortDescription: "",
    body: "",
    status: "draft",
    isFeatured: false
  };

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues
  });

  const onSubmit: SubmitHandler<DealFormValues> = (data) => {
    console.log(dealId ? "Updating:" : "Creating:", data);
    console.log("Featured Image:", featuredImage);
    console.log("Gallery Images:", galleryImages);
    router.push("/deals");
  };

  const handleAddGalleryImages = (files: File[]) => {
    setGalleryImages([...galleryImages, ...files]);
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
          {viewMode ? "View Deal" : dealId ? "Edit Deal" : "Create Deal"}
        </h1>
        {viewMode && (
          <Link href={`/deals/edit/${dealId}`} className="w-full sm:w-auto">
            <Button className="h-10 sm:h-9 w-full sm:w-auto">
              <Edit className="mr-2 h-4 w-4" />
              Edit Deal
            </Button>
          </Link>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Deal title" 
                        {...field} 
                        disabled={viewMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={viewMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Partner">Partner</SelectItem>
                        <SelectItem value="Internal">Internal</SelectItem>
                        <SelectItem value="Social">Social Media</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input 
                          placeholder="summer,discount,promotion" 
                          {...field} 
                          disabled={viewMode}
                          onChange={(e) => {
                            field.onChange(e);
                            // You could add tag validation here
                          }}
                        />
                        <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto">
                          {field.value?.split(',').filter(tag => tag.trim()).map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Description*</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description that appears in listings..."
                        className="min-h-[80px] sm:min-h-[100px]"
                        {...field}
                        disabled={viewMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Content*</FormLabel>
                    <FormControl>
                      <TextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Write the full deal content here..."
                        readOnly={viewMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Gallery Images</FormLabel>
                <ImageGallery
                  images={galleryImages}
                  onAddImages={handleAddGalleryImages}
                  onRemoveImage={handleRemoveGalleryImage}
                  readOnly={viewMode}
                />
              </div>
            

            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-4">
                <FormLabel>Featured Image</FormLabel>
                <div className="border-2 border-dashed rounded-lg p-4 sm:p-6 flex items-center justify-center min-h-[200px] sm:min-h-[128px]">
                  {featuredImage ? (
                    <div className="relative group w-full">
                      <img
                        src={URL.createObjectURL(featuredImage)}
                        alt="Featured preview"
                        className="w-full h-auto max-h-64 object-contain rounded-lg"
                      />
                      {!viewMode && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={() => setFeaturedImage(null)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 sm:h-32 cursor-pointer">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImagePlus className="w-8 h-8 mb-3" />
                        <p className="mb-2 text-base sm:text-sm">Click to upload</p>
                        <p className="text-sm sm:text-xs text-muted-foreground">Recommended: 1200x630px</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setFeaturedImage(file);
                        }}
                        disabled={viewMode}
                      />
                    </label>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={viewMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 sm:p-4 gap-4 sm:gap-0">
                    <div className="space-y-0.5">
                      <FormLabel>Featured Deal</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Show this deal in featured sections
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={viewMode}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              </div>

              {!viewMode && (
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <Button type="submit" className="h-10 sm:h-9 min-h-[44px] w-full sm:w-auto">
                    {dealId ? "Update Deal" : "Create Deal"}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => router.push("/deals")}
                    className="h-10 sm:h-9 min-h-[44px] w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}