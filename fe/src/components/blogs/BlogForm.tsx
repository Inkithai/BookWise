"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import ImageGallery from '@/components/elements/ImageGallery';
import { TextEditor } from '@/components/elements/TextEditor';
import { useState } from "react";

const blogFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  type: z.string().min(1, "Type is required"),
  status: z.enum(["published", "draft"]),
  category: z.string().min(1, "Category is required"),
  tags: z.string().optional(),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  body: z.string().min(10, "Content must be at least 10 characters"),
  summary: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
});

type BlogFormValues = z.infer<typeof blogFormSchema>;

export default function BlogForm({ blogId }: { blogId?: string }) {
  const router = useRouter();
  const [featuredImage, setFeaturedImage] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: blogId ? "Sample Blog" : "",
      type: blogId ? "Tutorial" : "",
      status: blogId ? "draft" : "draft",
      category: blogId ? "Development" : "",
      tags: blogId ? "react,nextjs" : "",
      slug: blogId ? "sample-blog" : "",
      body: blogId ? "<p>Sample content...</p>" : "",
      summary: blogId ? "This is a sample blog summary" : "",
      metaTitle: blogId ? "Sample Meta Title" : "",
      metaDescription: blogId ? "Sample meta description" : "",
      metaKeywords: blogId ? "sample,meta,keywords" : "",
    }
  });

  const onSubmit = async (values: BlogFormValues) => {
    try {
      setIsLoading(true);
      console.log(blogId ? "Updating:" : "Creating:", values);
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push("/blogs");
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddImages = (files: File[]) => {
    setFeaturedImage(files);
  };

  const handleRemoveImage = (index: number) => {
    setFeaturedImage(prev => prev.filter((_, i) => i !== index));
  };

  const renderSelectField = (
    name: keyof BlogFormValues,
    label: string,
    options: { value: string; label: string }[],
    placeholder: string
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex-1 space-y-2">
          <FormLabel>{label}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value}
            defaultValue={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderInputField = (
    name: keyof BlogFormValues,
    label: string,
    placeholder: string
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex-1 space-y-2">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input 
              placeholder={placeholder} 
              {...field} 
              value={field.value || ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-bold">
        {blogId ? "Edit Blog" : "Create Blog"}
      </h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {/* GENERAL INFORMATION SECTION */}
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold border-b pb-2 break-words">1. GENERAL INFORMATION</h2>
            
            {/* All fields in one flex container with consistent spacing */}
            <div className="flex flex-col gap-4 sm:gap-6">
              {/* Title field */}
              {renderInputField("title", "Title", "Blog title")}

              {/* Second row: Type, Status, Category, Tags, Slug - Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {renderSelectField("type", "Type", [
                  { value: "Tutorial", label: "Tutorial" },
                  { value: "News", label: "News" },
                  { value: "Guide", label: "Guide" },
                  { value: "Case Study", label: "Case Study" },
                ], "Select type")}
                {renderSelectField("status", "Status", [
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                ], "Select status")}
                {renderSelectField("category", "Category", [
                  { value: "Development", label: "Development" },
                  { value: "Design", label: "Design" },
                  { value: "Marketing", label: "Marketing" },
                  { value: "Business", label: "Business" },
                ], "Select category")}
                {renderInputField("tags", "Tags", "react,nextjs,javascript")}
                {renderInputField("slug", "Slug", "blog-slug")}
              </div>

              {/* Body Content */}
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Body</FormLabel>
                    <FormControl>
                      <TextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Write your blog content here..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Summary */}
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Summary</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief summary of the blog post"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Feature Image */}
              <FormItem className="space-y-2">
                <FormLabel>Feature Image</FormLabel>
                <ImageGallery
                  images={featuredImage}
                  onAddImages={handleAddImages}
                  onRemoveImage={handleRemoveImage}
                />
              </FormItem>
            </div>
          </div>
          
          {/* SEO SETTINGS SECTION */}
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold border-b pb-2 break-words">2. SEO SETTINGS</h2>
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Meta title for SEO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Meta description for SEO"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="metaKeywords"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Key Words</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="apple,orange" 
                        {...field} 
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value
                            .split(',')
                            .map(word => word.trim().toLowerCase())
                            .join(',');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      Use comma as a separator for words (Eg: apple,orange)
                    </p>
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Processing..." : blogId ? "Update Blog" : "Create Blog"}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push("/blogs")}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}