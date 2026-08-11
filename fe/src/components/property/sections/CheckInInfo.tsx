// src/components/property/sections/CheckInInfo.tsx
"use client"

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TextEditor } from "@/components/elements/TextEditor";
import { FileUpload } from "@/components/elements/FileUpload";
import { WifiIcon, LockIcon, ParkingIcon, HeatingIcon, KitchenIcon, GardenIcon, TrashIcon, LaundryIcon } from "./icons";
import { Property } from "./PropertyTypes";

interface CheckInInfoProps {
  property: Property;
  setProperty: React.Dispatch<React.SetStateAction<Property>>;
  readOnly?: boolean;
}

export const CheckInInfo = ({ property, setProperty, readOnly = false }: CheckInInfoProps) => {
  const handleWifiChange = (network: 'wifi3G' | 'wifi5G', field: string, value: string) => {
    setProperty(prev => ({
      ...prev,
      wifi: {
        ...prev.wifi,
        [network]: {
          ...prev.wifi[network],
          [field]: value
        }
      }
    }));
  };

  const handleWifiFileChange = (files: File[], field: 'wifiFiles' | 'visualInstructions') => {
    setProperty(prev => ({
      ...prev,
      wifi: {
        ...prev.wifi,
        [field]: files
      }
    }));
  };

  const handleLockboxChange = (index: number, field: string, value: string) => {
    const updatedGroups = [...property.lockbox.groups];
    updatedGroups[index] = {
      ...updatedGroups[index],
      [field]: value
    };
    setProperty(prev => ({
      ...prev,
      lockbox: {
        ...prev.lockbox,
        groups: updatedGroups
      }
    }));
  };

  const handleLockboxFileChange = (index: number, files: File[], field: 'files' | 'visualInstructions') => {
    const updatedGroups = [...property.lockbox.groups];
    updatedGroups[index] = {
      ...updatedGroups[index],
      [field]: files
    };
    setProperty(prev => ({
      ...prev,
      lockbox: {
        ...prev.lockbox,
        groups: updatedGroups
      }
    }));
  };

  const handleFacilityChange = (field: keyof Property['otherFacilities'], value: string) => {
    setProperty(prev => ({
      ...prev,
      otherFacilities: {
        ...prev.otherFacilities,
        [field]: value
      }
    }));
  };

  const renderReadOnlyInput = (value: string, isPassword = false) => (
    <Input 
      value={isPassword && value ? "••••••••" : value} 
      readOnly 
      className="w-full bg-muted hover:bg-muted cursor-default"
      type={isPassword ? "password" : "text"}
    />
  );

  const renderReadOnlyTextEditor = (value: string) => (
    <div className="border rounded-md dark:border-gray-700">
      <TextEditor 
        value={value || ''} 
        onChange={() => {}} 
        readOnly={true}
        placeholder="No information provided"
      />
    </div>
  );

  const renderReadOnlyFileUpload = (files: File[]) => (
    <div className="p-4 border rounded-md bg-muted">
      {files.length > 0 ? (
        <span>{files.length} file(s) uploaded</span>
      ) : (
        <span className="text-muted-foreground">No files uploaded</span>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* WiFi Information */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <WifiIcon className="h-5 w-5" />
          <h3 className="font-medium">WiFi INFORMATION</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium">3G Details</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>WiFi Username</Label>
                {readOnly ? (
                  renderReadOnlyInput(property.wifi.wifi3G.username)
                ) : (
                  <Input
                    value={property.wifi.wifi3G.username}
                    onChange={(e) => handleWifiChange("wifi3G", "username", e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>WiFi Password</Label>
                {readOnly ? (
                  renderReadOnlyInput(property.wifi.wifi3G.password, true)
                ) : (
                  <Input
                    type="password"
                    value={property.wifi.wifi3G.password}
                    onChange={(e) => handleWifiChange("wifi3G", "password", e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">5G Details</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>WiFi Username</Label>
                {readOnly ? (
                  renderReadOnlyInput(property.wifi.wifi5G.username)
                ) : (
                  <Input
                    value={property.wifi.wifi5G.username}
                    onChange={(e) => handleWifiChange("wifi5G", "username", e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>WiFi Password</Label>
                {readOnly ? (
                  renderReadOnlyInput(property.wifi.wifi5G.password, true)
                ) : (
                  <Input
                    type="password"
                    value={property.wifi.wifi5G.password}
                    onChange={(e) => handleWifiChange("wifi5G", "password", e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Additional Info</Label>
          {readOnly ? (
            renderReadOnlyTextEditor(property.wifi.additionalInfo)
          ) : (
            <TextEditor
              value={property.wifi.additionalInfo}
              onChange={(value) => setProperty(prev => ({
                ...prev,
                wifi: {
                  ...prev.wifi,
                  additionalInfo: value
                }
              }))}
            />
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>File Uploads</Label>
            {readOnly ? (
              renderReadOnlyFileUpload(property.wifi.wifiFiles)
            ) : (
              <FileUpload
                files={property.wifi.wifiFiles}
                onFilesChange={(files) => handleWifiFileChange(files, 'wifiFiles')}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Visual Instructions</Label>
            {readOnly ? (
              renderReadOnlyFileUpload(property.wifi.visualInstructions)
            ) : (
              <FileUpload
                files={property.wifi.visualInstructions}
                onFilesChange={(files) => handleWifiFileChange(files, 'visualInstructions')}
              />
            )}
          </div>
        </div>
      </div>

      {/* Lockbox Groups */}
      {[0, 1, 2].map((index) => (
        <div key={index} className="space-y-6">
          <div className="flex items-center space-x-2">
            <LockIcon className="h-5 w-5" />
            <h3 className="font-medium">LOCKBOX & SECURITY - GROUP {index + 1}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Lockbox Code</Label>
              {readOnly ? (
                renderReadOnlyInput(property.lockbox.groups[index]?.lockboxCode, true)
              ) : (
                <Input
                  type="password"
                  value={property.lockbox.groups[index]?.lockboxCode || ""}
                  onChange={(e) => handleLockboxChange(index, "lockboxCode", e.target.value)}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Door Access Code</Label>
              {readOnly ? (
                renderReadOnlyInput(property.lockbox.groups[index]?.doorAccessCode, true)
              ) : (
                <Input
                  type="password"
                  value={property.lockbox.groups[index]?.doorAccessCode || ""}
                  onChange={(e) => handleLockboxChange(index, "doorAccessCode", e.target.value)}
                />
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Additional Info</Label>
            {readOnly ? (
              renderReadOnlyTextEditor(property.lockbox.groups[index]?.additionalInfo || "")
            ) : (
              <TextEditor
                value={property.lockbox.groups[index]?.additionalInfo || ""}
                onChange={(value) => handleLockboxChange(index, "additionalInfo", value)}
              />
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>File Uploads</Label>
              {readOnly ? (
                renderReadOnlyFileUpload(property.lockbox.groups[index]?.files || [])
              ) : (
                <FileUpload
                  files={property.lockbox.groups[index]?.files || []}
                  onFilesChange={(files) => handleLockboxFileChange(index, files, 'files')}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Visual Instructions</Label>
              {readOnly ? (
                renderReadOnlyFileUpload(property.lockbox.groups[index]?.visualInstructions || [])
              ) : (
                <FileUpload
                  files={property.lockbox.groups[index]?.visualInstructions || []}
                  onFilesChange={(files) => handleLockboxFileChange(index, files, 'visualInstructions')}
                />
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Other Facilities */}
      <div className="space-y-6">
        <h3 className="font-medium">OTHER FACILITIES</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parking and Heating/Thermostat */}
            <div className="space-y-2">
              <Label className="flex items-center">
                <ParkingIcon className="h-4 w-4 mr-2" />
                Parking
              </Label>
              {readOnly ? (
                renderReadOnlyTextEditor(property.otherFacilities.parking)
              ) : (
                <TextEditor
                  value={property.otherFacilities.parking}
                  onChange={(value) => handleFacilityChange('parking', value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center">
                <HeatingIcon className="h-4 w-4 mr-2" />
                Heating/Thermostat
              </Label>
              {readOnly ? (
                renderReadOnlyTextEditor(property.otherFacilities.heatingThermostat)
              ) : (
                <TextEditor
                  value={property.otherFacilities.heatingThermostat}
                  onChange={(value) => handleFacilityChange('heatingThermostat', value)}
                />
              )}
            </div>

            {/* Kitchen and Garden */}
            <div className="space-y-2">
              <Label className="flex items-center">
                <KitchenIcon className="h-4 w-4 mr-2" />
                Kitchen
              </Label>
              {readOnly ? (
                renderReadOnlyTextEditor(property.otherFacilities.kitchen)
              ) : (
                <TextEditor
                  value={property.otherFacilities.kitchen}
                  onChange={(value) => handleFacilityChange('kitchen', value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center">
                <GardenIcon className="h-4 w-4 mr-2" />
                Garden
              </Label>
              {readOnly ? (
                renderReadOnlyTextEditor(property.otherFacilities.garden)
              ) : (
                <TextEditor
                  value={property.otherFacilities.garden}
                  onChange={(value) => handleFacilityChange('garden', value)}
                />
              )}
            </div>

            {/* Waste Management and Laundry */}
            <div className="space-y-2">
              <Label className="flex items-center">
                <TrashIcon className="h-4 w-4 mr-2" />
                Waste Management / Bin
              </Label>
              {readOnly ? (
                renderReadOnlyTextEditor(property.otherFacilities.wasteManagement)
              ) : (
                <TextEditor
                  value={property.otherFacilities.wasteManagement}
                  onChange={(value) => handleFacilityChange('wasteManagement', value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center">
                <LaundryIcon className="h-4 w-4 mr-2" />
                Laundry
              </Label>
              {readOnly ? (
                renderReadOnlyTextEditor(property.otherFacilities.laundry)
              ) : (
                <TextEditor
                  value={property.otherFacilities.laundry}
                  onChange={(value) => handleFacilityChange('laundry', value)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};