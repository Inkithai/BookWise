"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useState } from "react";
import { Income } from "./types";

interface IncomeCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (income: Income) => void;
}

export function IncomeCreateDialog({
  open,
  onOpenChange,
  onSave,
}: IncomeCreateDialogProps) {
  const [amount, setAmount] = useState("");
  const [recordedAt, setRecordedAt] = useState<Date | undefined>(new Date());
  const [property, setProperty] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const properties = ["Southampton Street, RG1 2QW", "49A Saint Clement's Street, Oxfordshire, OX4 1AG", "Apt 2, Lingmell Court, Seascale, Cumbria, CA20 1HQ", "Flat 2, 18 Dalkeith Road, Newington, Edinburgh, EH16 5BP"];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!amount) newErrors.amount = "Amount is required";
    if (!recordedAt) newErrors.recordedAt = "Date is required";
    if (!property) newErrors.property = "Property is required";
    if (!description) newErrors.description = "Description is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const newIncome: Income = {
      id: `INC-${Math.random().toString(36).substr(2, 9)}`,
      amount: parseFloat(amount),
      recordedAt: recordedAt?.toISOString() || new Date().toISOString(),
      property,
      description,
      recordedBy: "Current User",
      attachment: attachment?.name || null,
    };
    onSave(newIncome);
    resetForm();
  };

  const resetForm = () => {
    setAmount("");
    setRecordedAt(new Date());
    setProperty("");
    setDescription("");
    setAttachment(null);
    setErrors({});
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Income</DialogTitle>
          <DialogDescription>
            Fill in the details of the new income record.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount (£)
            </Label>
            <div className="col-span-3">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recordedAt" className="text-right">
              Recorded At
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {recordedAt ? format(recordedAt, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={recordedAt}
                    onSelect={setRecordedAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.recordedAt && <p className="text-sm text-red-500 mt-1">{errors.recordedAt}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="property" className="text-right">
              Property
            </Label>
            <div className="col-span-3">
              <Select value={property} onValueChange={setProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop} value={prop}>
                      {prop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.property && <p className="text-sm text-red-500 mt-1">{errors.property}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <div className="col-span-3">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="attachment" className="text-right">
              Attachment
            </Label>
            <div className="col-span-3">
              <Input
                id="attachment"
                type="file"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}