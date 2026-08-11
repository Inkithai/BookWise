// src/components/property/sections/BasicInformation.tsx
"use client"

import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TextEditor } from "@/components/elements/TextEditor";
import { SyncIcon, RoomIcon, TrashIcon, PlusIcon } from "./icons";
import { Property } from "./PropertyTypes";
import Image from "next/image";

interface BasicInformationProps {
  property: Property;
  setProperty: React.Dispatch<React.SetStateAction<Property>>;
  readOnly?: boolean;
}

const propertyTypeOptions = ["Apartment", "House", "Villa", "Condo", "Townhouse", "Loft", "Studio"];
const furnishingOptions = ["Furnished", "Unfurnished", "Partially Furnished"];
const unitOptions = ["sq ft", "sq m"];

export const BasicInformation = ({ property, setProperty, readOnly = false }: BasicInformationProps) => {
  const [images, setImages] = useState<File[]>(property.images || []);
  const [epcFile, setEpcFile] = useState<File[]>(property.epcFile || []);
  const [zoomedFile, setZoomedFile] = useState<{url: string, type: 'image' | 'pdf'} | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProperty(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setProperty(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = useCallback((files: File[], field: 'images' | 'epcFile') => {
    setProperty(prev => ({ ...prev, [field]: files }));
    if (field === 'images') setImages(files);
    else setEpcFile(files);
  }, [setProperty]);

  const handleDeleteImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    handleFileUpload(newImages, 'images');
  };

  const handleDeleteEpc = (index: number) => {
    const newEpcFiles = [...epcFile];
    newEpcFiles.splice(index, 1);
    handleFileUpload(newEpcFiles, 'epcFile');
  };

  const handleZoomFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setZoomedFile({
      url,
      type: file.type.startsWith('image/') ? 'image' : 'pdf'
    });
    setZoomLevel(1);
  };

  const closeZoomModal = () => {
    if (zoomedFile) {
      URL.revokeObjectURL(zoomedFile.url);
      setZoomedFile(null);
    }
  };

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/');
  };

  const renderReadOnlyInput = (value: string) => (
    <Input 
      value={value} 
      readOnly 
      className="w-full bg-muted hover:bg-muted cursor-default"
    />
  );

  const renderReadOnlySelect = (value: string, options: string[]) => (
    <Select value={value} disabled>
      <SelectTrigger className="w-full bg-muted hover:bg-muted cursor-default">
        <SelectValue>{value || "Not selected"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderReadOnlySwitch = (checked: boolean) => (
    <div className="flex items-center space-x-2">
      <Switch checked={checked} disabled className="opacity-100" />
      <Label>{checked ? "Active" : "Inactive"}</Label>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top row with Property Status and Sync Pricing Info */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        {readOnly ? (
          renderReadOnlySwitch(property.active)
        ) : (
          <div className="flex items-center space-x-2">
            <Switch 
              checked={property.active}
              onCheckedChange={(checked) => setProperty(prev => ({ ...prev, active: checked }))}
            />
            <Label>{property.active ? "Active" : "Inactive"}</Label>
          </div>
        )}
        {!readOnly && (
          <Button variant="outline" className="w-full sm:w-auto sm:min-w-[140px]">
            <SyncIcon className="mr-2 h-4 w-4" />
            Sync Pricing Info
          </Button>
        )}
      </div>

      {/* Input fields with consistent spacing */}
      <div className="space-y-6">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label>Property Ref</Label>
            {readOnly ? (
              renderReadOnlyInput(property.propertyRef)
            ) : (
              <Input 
                name="propertyRef" 
                value={property.propertyRef} 
                onChange={handleChange} 
                className="w-full"
              />
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Uplisting ID</Label>
            {readOnly ? (
              renderReadOnlyInput(property.uplistingId)
            ) : (
              <Input 
                name="uplistingId" 
                value={property.uplistingId} 
                onChange={handleChange} 
                className="w-full"
              />
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Property Name</Label>
            {readOnly ? (
              renderReadOnlyInput(property.propertyName)
            ) : (
              <Input 
                name="propertyName" 
                value={property.propertyName} 
                onChange={handleChange} 
                className="w-full"
              />
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Property Type</Label>
            {readOnly ? (
              renderReadOnlySelect(property.propertyType, propertyTypeOptions)
            ) : (
              <Select 
                value={property.propertyType}
                onValueChange={(value) => handleSelectChange("propertyType", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypeOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Furnishing</Label>
            {readOnly ? (
              renderReadOnlySelect(property.furnishing, furnishingOptions)
            ) : (
              <Select 
                value={property.furnishing}
                onValueChange={(value) => handleSelectChange("furnishing", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select furnishing" />
                </SelectTrigger>
                <SelectContent>
                  {furnishingOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label>Nick Name</Label>
            {readOnly ? (
              renderReadOnlyInput(property.nickName)
            ) : (
              <Input 
                name="nickName" 
                value={property.nickName} 
                onChange={handleChange} 
                className="w-full"
              />
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Max Capacity</Label>
            {readOnly ? (
              renderReadOnlyInput(property.maxCapacity)
            ) : (
              <Input 
                name="maxCapacity" 
                value={property.maxCapacity} 
                onChange={handleChange} 
                type="number" 
                className="w-full"
              />
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Bedrooms</Label>
            {readOnly ? (
              renderReadOnlyInput(property.bedrooms)
            ) : (
              <Input 
                name="bedrooms" 
                value={property.bedrooms} 
                onChange={handleChange} 
                type="number" 
                className="w-full"
              />
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Total Beds</Label>
            {readOnly ? (
              renderReadOnlyInput(property.totalBeds)
            ) : (
              <Input 
                name="totalBeds" 
                value={property.totalBeds} 
                onChange={handleChange} 
                type="number" 
                className="w-full"
              />
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Baths</Label>
            {readOnly ? (
              renderReadOnlyInput(property.baths)
            ) : (
              <Input 
                name="baths" 
                value={property.baths} 
                onChange={handleChange} 
                type="number" 
                className="w-full"
              />
            )}
          </div>
        </div>

        {/* Row 3 - Rooms & Details heading with Add Room button */}
        <div className="flex justify-between items-center pt-2">
          <h3 className="text-lg font-medium">Rooms & Details</h3>
          {!readOnly && (
            <Button variant="outline">
              <RoomIcon className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          )}
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label>Receptions</Label>
            {readOnly ? (
              renderReadOnlyInput(property.receptions)
            ) : (
              <Input 
                name="receptions" 
                value={property.receptions} 
                onChange={handleChange} 
                type="number" 
                className="w-full"
              />
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Floors</Label>
            {readOnly ? (
              renderReadOnlyInput(property.floors)
            ) : (
              <Input 
                name="floors" 
                value={property.floors} 
                onChange={handleChange} 
                type="number" 
                className="w-full"
              />
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Size</Label>
            {readOnly ? (
              renderReadOnlyInput(property.size)
            ) : (
              <Input 
                name="size" 
                value={property.size} 
                onChange={handleChange} 
                type="number" 
                className="w-full"
              />
            )}
          </div>
          
          <div className="space-y-1">
            <Label>Unit</Label>
            {readOnly ? (
              renderReadOnlySelect(property.unit, unitOptions)
            ) : (
              <Select 
                value={property.unit}
                onValueChange={(value) => handleSelectChange("unit", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Row 5 - Images with preview */}
        <div className="space-y-2">
          <Label>Images</Label>
          <div className="border rounded-md p-4 dark:border-gray-700">
            {readOnly ? (
              images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {images.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index}`}
                          width={200}
                          height={200}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No images uploaded
                </div>
              )
            ) : (
              <>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-700">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <PlusIcon className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF (MAX. 10MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleFileUpload([...images, ...Array.from(e.target.files)], 'images');
                        }
                      }}
                    />
                  </label>
                </div>
                
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {images.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                          <Image
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index}`}
                            width={200}
                            height={200}
                            className="h-full w-full object-cover cursor-pointer"
                            onClick={() => handleZoomFile(file)}
                          />
                        </div>
                        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleZoomFile(file)}
                            className="p-1 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <PlusIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                          </button>
                          <button 
                            onClick={() => handleDeleteImage(index)}
                            className="p-1 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <TrashIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Row 6 - EPC */}
        <div className="space-y-2">
          <Label>Energy Certificate / EPC</Label>
          <div className="border rounded-md p-4 dark:border-gray-700">
            {readOnly ? (
              epcFile.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {epcFile.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-[4/3] overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {isImageFile(file) ? (
                          <Image
                            src={URL.createObjectURL(file)}
                            alt={`EPC Preview ${index}`}
                            width={200}
                            height={150}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 w-full h-full">
                            <span className="text-4xl">📄</span>
                            <span className="mt-2 text-sm text-center text-gray-600 dark:text-gray-300 truncate w-full px-2">
                              {file.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No EPC files uploaded
                </div>
              )
            ) : (
              <>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-700">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <PlusIcon className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">PDF, PNG, JPG (MAX. 5MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleFileUpload([...epcFile, ...Array.from(e.target.files)], 'epcFile');
                        }
                      }}
                    />
                  </label>
                </div>
                
                {epcFile.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {epcFile.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-[4/3] overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          {isImageFile(file) ? (
                            <Image
                              src={URL.createObjectURL(file)}
                              alt={`EPC Preview ${index}`}
                              width={200}
                              height={150}
                              className="h-full w-full object-contain cursor-pointer"
                              onClick={() => handleZoomFile(file)}
                            />
                          ) : (
                            <div 
                              className="flex flex-col items-center justify-center p-4 cursor-pointer w-full h-full"
                              onClick={() => window.open(URL.createObjectURL(file), '_blank')}
                            >
                              <span className="text-4xl">📄</span>
                              <span className="mt-2 text-sm text-center text-gray-600 dark:text-gray-300 truncate w-full px-2">
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">Click to view PDF</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isImageFile(file) && (
                            <button 
                              onClick={() => handleZoomFile(file)}
                              className="p-1 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              <PlusIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteEpc(index)}
                            className="p-1 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <TrashIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Row 7 - Text Editors */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Description</Label>
            {readOnly ? (
              <div className="border rounded-md dark:border-gray-700">
                <TextEditor 
                  value={property.description || ''} 
                  onChange={() => {}} 
                  readOnly={true}
                  placeholder="No description provided"
                />
              </div>
            ) : (
              <div className="border rounded-md dark:border-gray-700">
                <TextEditor 
                  value={property.description || ''} 
                  onChange={(value) => setProperty(prev => ({ ...prev, description: value }))} 
                  placeholder="Enter property description..."
                />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>House Rules</Label>
            {readOnly ? (
              <div className="border rounded-md dark:border-gray-700">
                <TextEditor 
                  value={property.houseRules || ''} 
                  onChange={() => {}} 
                  readOnly={true}
                  placeholder="No house rules provided"
                />
              </div>
            ) : (
              <div className="border rounded-md dark:border-gray-700">
                <TextEditor 
                  value={property.houseRules || ''} 
                  onChange={(value) => setProperty(prev => ({ ...prev, houseRules: value }))} 
                  placeholder="Enter house rules..."
                />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Things You Need to Know</Label>
            {readOnly ? (
              <div className="border rounded-md dark:border-gray-700">
                <TextEditor 
                  value={property.thingsToKnow || ''} 
                  onChange={() => {}} 
                  readOnly={true}
                  placeholder="No additional information provided"
                />
              </div>
            ) : (
              <div className="border rounded-md dark:border-gray-700">
                <TextEditor 
                  value={property.thingsToKnow || ''} 
                  onChange={(value) => setProperty(prev => ({ ...prev, thingsToKnow: value }))} 
                  placeholder="Enter important information..."
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomedFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-screen">
            {zoomedFile.type === 'image' ? (
              <Image
                src={zoomedFile.url}
                alt="Zoomed preview"
                width={1200}
                height={800}
                className="max-h-[90vh] max-w-full object-contain"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <iframe 
                  src={zoomedFile.url} 
                  className="w-full h-[80vh] border-0"
                  title="PDF Preview"
                />
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg">
              {zoomedFile.type === 'image' && (
                <>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 3))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    <PlusIcon className="h-5 w-5 dark:text-gray-300" />
                  </button>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.5))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    <span className="text-sm font-medium dark:text-gray-300">-</span>
                  </button>
                </>
              )}
              <button 
                onClick={closeZoomModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <span className="text-sm font-medium dark:text-gray-300">Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};