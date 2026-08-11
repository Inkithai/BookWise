"use client"
import React, { useState, useEffect } from 'react';
import { getFeatures, createFeature, deleteFeature, Feature } from '@/services/features.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react';

export default function FeaturesManager() {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newFeature, setNewFeature] = useState({ name: '', description: '', price: '' });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [featureToDelete, setFeatureToDelete] = useState<number | null>(null);

    useEffect(() => {
        loadFeatures();
    }, []);

    const loadFeatures = async () => {
        try {
            setLoading(true);
            const res = await getFeatures();
            const featuresData = (res as any).data && Array.isArray((res as any).data) ? (res as any).data : res;
            setFeatures(featuresData || []);
        } catch (err) {
            toast.error('Failed to load features');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFeature.name) {
            toast.error('Name is required');
            return;
        }

        try {
            setIsSubmitting(true);
            await createFeature({
                name: newFeature.name,
                description: newFeature.description,
                price: Number(newFeature.price) || 0,
                is_active: 1
            });
            toast.success('Feature created successfully');
            setNewFeature({ name: '', description: '', price: '' });
            loadFeatures();
        } catch (err) {
            toast.error('Failed to create feature');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        setFeatureToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!featureToDelete) return;
        try {
            await deleteFeature(featureToDelete);
            toast.success('Feature deleted');
            loadFeatures();
        } catch (err) {
            toast.error('Failed to delete feature');
        } finally {
            setDeleteDialogOpen(false);
            setFeatureToDelete(null);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-8 h-8 text-teal-500" />
                <h1 className="text-3xl font-bold">Feature Management</h1>
            </div>

            {/* Create form */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Create New Feature</h2>
                <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Feature Name *</label>
                        <Input
                            value={newFeature.name}
                            onChange={e => setNewFeature({ ...newFeature, name: e.target.value })}
                            placeholder="e.g. Premium Support"
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Input
                            value={newFeature.description}
                            onChange={e => setNewFeature({ ...newFeature, description: e.target.value })}
                            placeholder="Short description"
                        />
                    </div>
                    <div className="w-full md:w-32 space-y-2">
                        <label className="text-sm font-medium">Monthly Price (£)</label>
                        <Input
                            type="number"
                            value={newFeature.price}
                            onChange={e => setNewFeature({ ...newFeature, price: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Create Feature
                    </Button>
                </form>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h2 className="text-xl font-semibold mb-6 flex items-center justify-between">
                    All Features
                    <span className="text-sm font-normal bg-teal-100 text-teal-800 py-1 px-3 rounded-full">
                        Total: {features.length}
                    </span>
                </h2>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                ) : features.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No features created yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Name</th>
                                    <th className="px-6 py-3 font-semibold">Description</th>
                                    <th className="px-6 py-3 font-semibold">Price</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {features.map(f => (
                                    <tr key={f.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{f.name}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{f.description || '-'}</td>
                                        <td className="px-6 py-4 font-medium text-teal-600 dark:text-teal-400">£{f.price || 0}</td>
                                        <td className="px-6 py-4">
                                            {f.is_active ? (
                                                <span className="text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-2.5 py-1 rounded-full text-xs font-medium">Active</span>
                                            ) : (
                                                <span className="text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400 px-2.5 py-1 rounded-full text-xs font-medium">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Feature</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this feature? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
