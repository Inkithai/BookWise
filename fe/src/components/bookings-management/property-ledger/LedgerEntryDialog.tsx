'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import { PropertyLedgerEntry, DialogAction, ExpenseItem } from './types';
import { calculateExpenseTotals, calculateProfit, formatCurrency, generateInvoice } from './utils';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PdfPreviewDialog } from './PdfPreviewDialog';

interface Invoice {
  id: string;
  date: Date;
  propertyName: string;
  items: ({ name: string; amount: number } | ExpenseItem)[];
  totalIncome: number;
  totalExpense: number;
  profit: number;
}

interface LedgerEntryDialogProps {
  entry: PropertyLedgerEntry | null;
  mode: 'view' | 'edit';
  onAction: (action: DialogAction, entry: PropertyLedgerEntry) => void;
  onOpenChange: (open: boolean) => void;
  isOpen: boolean;
}

const statusVariantMap = {
  mailed: 'default',
  updated: 'secondary',
  created: 'destructive',
} as const;

export function LedgerEntryDialog({ 
  entry, 
  mode, 
  onAction, 
  onOpenChange, 
  isOpen 
}: LedgerEntryDialogProps) {
  const [formData, setFormData] = useState<PropertyLedgerEntry | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [showCustomExpense, setShowCustomExpense] = useState(false);
  const [showOtherExpense, setShowOtherExpense] = useState(false);
  const [newCustomExpense, setNewCustomExpense] = useState({
    type: '',
    amount: 0,
    note: ''
  });
  const [newOtherExpense, setNewOtherExpense] = useState({
    type: '',
    amount: 0,
    note: ''
  });

  useEffect(() => {
    if (entry) {
      setFormData(JSON.parse(JSON.stringify(entry)));
    }
  }, [entry]);

  if (!formData) return null;

  const totalExpense = calculateExpenseTotals(formData.expenses);
  const totalProfit = calculateProfit(formData);

  const handleGenerateInvoice = () => {
    const inv = generateInvoice(formData);
    setInvoice(inv);
    setShowPdfPreview(true);
  };

  const handleDownloadPdf = () => {
    onAction('pdf', {...formData, status: 'mailed'});
    setShowPdfPreview(false);
  };

  const handleUpdate = () => {
    onAction('update', {...formData, status: 'updated'});
    onOpenChange(false);
  };

  const addCustomExpense = () => {
    if (newCustomExpense.type && newCustomExpense.amount > 0) {
      setFormData({
        ...formData,
        expenses: {
          ...formData.expenses,
          customExpenses: [...formData.expenses.customExpenses, newCustomExpense]
        }
      });
      setNewCustomExpense({ type: '', amount: 0, note: '' });
      setShowCustomExpense(false);
    }
  };

  const addOtherExpense = () => {
    if (newOtherExpense.type && newOtherExpense.amount > 0) {
      setFormData({
        ...formData,
        expenses: {
          ...formData.expenses,
          otherExpenses: [...formData.expenses.otherExpenses, newOtherExpense]
        }
      });
      setNewOtherExpense({ type: '', amount: 0, note: '' });
      setShowOtherExpense(false);
    }
  };

  const removeCustomExpense = (index: number) => {
    const updatedExpenses = [...formData.expenses.customExpenses];
    updatedExpenses.splice(index, 1);
    setFormData({
      ...formData,
      expenses: {
        ...formData.expenses,
        customExpenses: updatedExpenses
      }
    });
  };

  const removeOtherExpense = (index: number) => {
    const updatedExpenses = [...formData.expenses.otherExpenses];
    updatedExpenses.splice(index, 1);
    setFormData({
      ...formData,
      expenses: {
        ...formData.expenses,
        otherExpenses: updatedExpenses
      }
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl">
                  {mode === 'view' ? 'Property Ledger Details' : 'Edit Property Ledger'}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  {format(formData.date, 'MMMM d, yyyy')} • {formData.property.name}
                  <Badge variant={statusVariantMap[formData.status]} className="capitalize">
                    {formData.status}
                  </Badge>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    value={format(formData.date, 'yyyy-MM-dd')}
                    onChange={(e) => mode === 'edit' && setFormData({
                      ...formData,
                      date: new Date(e.target.value)
                    })}
                    readOnly={mode === 'view'}
                    className={mode === 'view' ? 'bg-gray-100 dark:bg-gray-800 h-10' : 'h-10'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Input
                    value={formData.property.name}
                    onChange={(e) => mode === 'edit' && setFormData({
                      ...formData,
                      property: { ...formData.property, name: e.target.value }
                    })}
                    readOnly={mode === 'view'}
                    className={mode === 'view' ? 'bg-gray-100 dark:bg-gray-800 h-10' : 'h-10'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Income (£)</Label>
                  <Input
                    type="number"
                    value={formData.totalIncome}
                    onChange={(e) => mode === 'edit' && setFormData({
                      ...formData,
                      totalIncome: Number(e.target.value)
                    })}
                    readOnly={mode === 'view'}
                    className={mode === 'view' ? 'bg-gray-100 dark:bg-gray-800 h-10' : 'h-10'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Expense (£)</Label>
                  <Input
                    value={formatCurrency(totalExpense)}
                    readOnly
                    className="bg-gray-100 dark:bg-gray-800 h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Profit (£)</Label>
                  <Input
                    value={formatCurrency(totalProfit)}
                    readOnly
                    className={`font-medium h-10 ${
                      totalProfit >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    } bg-gray-100 dark:bg-gray-800`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Fixed Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Fixed Expenses</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(formData.expenses)
                  .filter(([key]) => !['otherExpenses', 'customExpenses'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} (£)
                      </Label>
                      <Input
                        type="number"
                        value={value as number}
                        onChange={(e) => mode === 'edit' && setFormData({
                          ...formData,
                          expenses: { ...formData.expenses, [key]: Number(e.target.value) }
                        })}
                        readOnly={mode === 'view'}
                        className={mode === 'view' ? 'bg-gray-100 dark:bg-gray-800 h-10' : 'h-10'}
                      />
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Expense Management */}
            {mode === 'edit' && (
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowOtherExpense(!showOtherExpense)}
                  className="h-10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Other Expense
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCustomExpense(!showCustomExpense)}
                  className="h-10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Expense
                </Button>
              </div>
            )}

            {/* Other Expense Form */}
            {showOtherExpense && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Other Expense</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input
                        value={newOtherExpense.type}
                        onChange={(e) => setNewOtherExpense({
                          ...newOtherExpense,
                          type: e.target.value
                        })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (£)</Label>
                      <Input
                        type="number"
                        value={newOtherExpense.amount}
                        onChange={(e) => setNewOtherExpense({
                          ...newOtherExpense,
                          amount: Number(e.target.value)
                        })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Note</Label>
                      <Input
                        value={newOtherExpense.note}
                        onChange={(e) => setNewOtherExpense({
                          ...newOtherExpense,
                          note: e.target.value
                        })}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <Button variant="outline" onClick={() => setShowOtherExpense(false)} className="h-10">
                      Cancel
                    </Button>
                    <Button onClick={addOtherExpense} className="h-10">
                      Add Expense
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Expense Form */}
            {showCustomExpense && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Custom Expense</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input
                        value={newCustomExpense.type}
                        onChange={(e) => setNewCustomExpense({
                          ...newCustomExpense,
                          type: e.target.value
                        })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (£)</Label>
                      <Input
                        type="number"
                        value={newCustomExpense.amount}
                        onChange={(e) => setNewCustomExpense({
                          ...newCustomExpense,
                          amount: Number(e.target.value)
                        })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Note</Label>
                      <Input
                        value={newCustomExpense.note}
                        onChange={(e) => setNewCustomExpense({
                          ...newCustomExpense,
                          note: e.target.value
                        })}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <Button variant="outline" onClick={() => setShowCustomExpense(false)} className="h-10">
                      Cancel
                    </Button>
                    <Button onClick={addCustomExpense} className="h-10">
                      Add Expense
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Expenses List */}
            {formData.expenses.otherExpenses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Other Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {formData.expenses.otherExpenses.map((expense, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center border-b pb-4 last:border-0">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Input
                            value={expense.type}
                            onChange={(e) => mode === 'edit' && setFormData({
                              ...formData,
                              expenses: {
                                ...formData.expenses,
                                otherExpenses: formData.expenses.otherExpenses.map((item, i) => 
                                  i === index ? { ...item, type: e.target.value } : item
                                )
                              }
                            })}
                            readOnly={mode === 'view'}
                            className={mode === 'view' ? 'bg-gray-100 dark:bg-gray-800 h-10' : 'h-10'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Amount (£)</Label>
                          <Input
                            type="number"
                            value={expense.amount}
                            onChange={(e) => mode === 'edit' && setFormData({
                              ...formData,
                              expenses: {
                                ...formData.expenses,
                                otherExpenses: formData.expenses.otherExpenses.map((item, i) => 
                                  i === index ? { ...item, amount: Number(e.target.value) } : item
                                )
                              }
                            })}
                            readOnly={mode === 'view'}
                            className={mode === 'view' ? 'bg-gray-100 dark:bg-gray-800 h-10' : 'h-10'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Note</Label>
                          <Input
                            value={expense.note || ''}
                            onChange={(e) => mode === 'edit' && setFormData({
                              ...formData,
                              expenses: {
                                ...formData.expenses,
                                otherExpenses: formData.expenses.otherExpenses.map((item, i) => 
                                  i === index ? { ...item, note: e.target.value } : item
                                )
                              }
                            })}
                            readOnly={mode === 'view'}
                            className={mode === 'view' ? 'bg-gray-100 dark:bg-gray-800 h-10' : 'h-10'}
                          />
                        </div>
                        {mode === 'edit' && (
                          <div className="flex items-end">
                            <Button 
                              variant="destructive" 
                              onClick={() => removeOtherExpense(index)}
                              className="h-10"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Expenses List */}
            {formData.expenses.customExpenses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Custom Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {formData.expenses.customExpenses.map((expense, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center border-b pb-4 last:border-0">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Input
                            value={expense.type}
                            onChange={(e) => mode === 'edit' && setFormData({
                              ...formData,
                              expenses: {
                                ...formData.expenses,
                                customExpenses: formData.expenses.customExpenses.map((item, i) => 
                                  i === index ? { ...item, type: e.target.value } : item
                                )
                              }
                            })}
                            readOnly={mode === 'view'}
                            className={mode === 'view' ? 'bg-gray-100 dark:bg-gray-800 h-10' : 'h-10'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Amount (£)</Label>
                          <Input
                            type="number"
                            value={expense.amount}
                            onChange={(e) => mode === 'edit' && setFormData({
                              ...formData,
                              expenses: {
                                ...formData.expenses,
                                customExpenses: formData.expenses.customExpenses.map((item, i) => 
                                  i === index ? { ...item, amount: Number(e.target.value) } : item
                                )
                              }
                            })}
                            readOnly={mode === 'view'}
                            className={mode === 'view' ? 'bg-gray-100 dark:bg-gray-800 h-10' : 'h-10'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Note</Label>
                          <Input
                            value={expense.note || ''}
                            onChange={(e) => mode === 'edit' && setFormData({
                              ...formData,
                              expenses: {
                                ...formData.expenses,
                                customExpenses: formData.expenses.customExpenses.map((item, i) => 
                                  i === index ? { ...item, note: e.target.value } : item
                                )
                              }
                            })}
                            readOnly={mode === 'view'}
                            className={mode === 'view' ? 'bg-gray-100 dark:bg-gray-800 h-10' : 'h-10'}
                          />
                        </div>
                        {mode === 'edit' && (
                          <div className="flex items-end">
                            <Button 
                              variant="destructive" 
                              onClick={() => removeCustomExpense(index)}
                              className="h-10"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            {mode === 'edit' ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10">
                  Cancel
                </Button>
                <Button onClick={handleUpdate} className="h-10">
                  Update
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleGenerateInvoice} className="h-10">
                  <FileText className="mr-2 h-4 w-4" />
                  Preview Invoice
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PdfPreviewDialog 
        invoice={invoice}
        isOpen={showPdfPreview}
        onOpenChange={setShowPdfPreview}
        onDownload={handleDownloadPdf}
      />
    </>
  );
}