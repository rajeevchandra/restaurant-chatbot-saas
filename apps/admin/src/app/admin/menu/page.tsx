'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import {
  UtensilsCrossed,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Image as ImageIcon,
  GripVertical,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

interface MenuItemOption {
  id: string;
  name: string;
  price: number;
}

interface MenuItemOptionGroup {
  id: string;
  name: string;
  type: 'SINGLE' | 'MULTI';
  required: boolean;
  options: MenuItemOption[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  categoryId: string;
  imageUrl?: string;
  optionGroups?: MenuItemOptionGroup[];
}

interface Category {
  id: string;
  name: string;
  menuItems: MenuItem[];
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    isAvailable: true,
    categoryId: '',
    imageUrl: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [optionGroups, setOptionGroups] = useState<MenuItemOptionGroup[]>([]);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getMenuItems();
      if (response.success && response.data) {
        // Group items by category
        const items = Array.isArray(response.data) ? response.data : response.data.items || [];
        const groupedByCategory: Record<string, MenuItem[]> = {};
        
        items.forEach((item: any) => {
          const categoryName = item.category?.name || 'Uncategorized';
          if (!groupedByCategory[categoryName]) {
            groupedByCategory[categoryName] = [];
          }
          groupedByCategory[categoryName].push({
            ...item,
            categoryId: item.categoryId || item.category?.id,
          });
        });
        
        const categoriesData: Category[] = Object.entries(groupedByCategory).map(([name, menuItems], index) => ({
          id: menuItems[0]?.categoryId || String(index),
          name,
          menuItems,
        }));
        
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Failed to load menu:', error);
    } finally {
      setLoading(false);
    }
  };
              id: '5',
              name: 'Chocolate Lava Cake',
              description: 'Warm chocolate cake with molten center',
              price: 8.99,
              isAvailable: true,
              categoryId: '3',
            },
          ],
        },
      ];
      setCategories(mockCategories);
      setSelectedCategory(mockCategories[0]?.id || null);
      setLoading(false);
    }, 600);
  };

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory);
  const filteredItems =
    selectedCategoryData?.menuItems.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const openItemEditor = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        isAvailable: item.isAvailable,
        categoryId: item.categoryId,
        imageUrl: item.imageUrl || '',
      });
      setOptionGroups(item.optionGroups || []);
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        isAvailable: true,
        categoryId: selectedCategory || categories[0]?.id || '',
        imageUrl: '',
      });
      setOptionGroups([]);
    }
    setFormErrors({});
    setShowItemEditor(true);
  };

  const closeItemEditor = () => {
    setShowItemEditor(false);
    setEditingItem(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = 'Valid price is required';
    if (!formData.categoryId) errors.categoryId = 'Category is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveItem = async () => {
    if (!validateForm()) return;

    const itemData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      isAvailable: formData.isAvailable,
      categoryId: formData.categoryId,
      imageUrl: formData.imageUrl || undefined,
      optionGroups: optionGroups.length > 0 ? optionGroups : undefined,
    };

    try {
      let response;
      if (editingItem) {
        response = await apiClient.updateMenuItem(editingItem.id, itemData);
      } else {
        response = await apiClient.createMenuItem(itemData);
      }

      if (response.success) {
        setToastMessage(editingItem ? 'Item updated successfully!' : 'Item added successfully!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        closeItemEditor();
        await loadMenu(); // Reload menu from API
      } else {
        alert(`Failed to ${editingItem ? 'update' : 'create'} item: ${response.error}`);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const response = await apiClient.deleteMenuItem(itemId);
      if (response.success) {
        setToastMessage('Item deleted successfully!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        await loadMenu(); // Reload menu from API
      } else {
        alert('Failed to delete item: ' + response.error);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const addOptionGroup = () => {
    setOptionGroups([
      ...optionGroups,
      {
        id: `og-${Date.now()}`,
        name: '',
        type: 'SINGLE',
        required: false,
        options: [],
      },
    ]);
  };

  const updateOptionGroup = (index: number, updates: Partial<MenuItemOptionGroup>) => {
    setOptionGroups((prev) => prev.map((og, i) => (i === index ? { ...og, ...updates } : og)));
  };

  const removeOptionGroup = (index: number) => {
    setOptionGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const addOption = (groupIndex: number) => {
    setOptionGroups((prev) =>
      prev.map((og, i) =>
        i === groupIndex
          ? {
              ...og,
              options: [...og.options, { id: `opt-${Date.now()}`, name: '', price: 0 }],
            }
          : og
      )
    );
  };

  const updateOption = (groupIndex: number, optionIndex: number, updates: Partial<MenuItemOption>) => {
    setOptionGroups((prev) =>
      prev.map((og, i) =>
        i === groupIndex
          ? {
              ...og,
              options: og.options.map((opt, j) => (j === optionIndex ? { ...opt, ...updates } : opt)),
            }
          : og
      )
    );
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    setOptionGroups((prev) =>
      prev.map((og, i) =>
        i === groupIndex
          ? {
              ...og,
              options: og.options.filter((_, j) => j !== optionIndex),
            }
          : og
      )
    );
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Menu Management" description="Manage your restaurant menu items and categories" />
        <div className="flex gap-6">
          <div className="h-96 w-64 animate-pulse rounded-xl bg-gray-200" />
          <div className="flex-1 space-y-4">
            <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
            <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
            <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Menu Management" description="Manage your restaurant menu items and categories" />

        {/* Mobile Category Selector */}
        <div className="lg:hidden">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.menuItems.length})
              </option>
            ))}
          </select>
        </div>

        {/* Split Layout */}
        <div className="flex gap-6">
          {/* Categories Sidebar (Desktop) */}
          <div className="hidden w-64 flex-shrink-0 lg:block">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Categories</h3>
                <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                      selectedCategory === category.id
                        ? 'bg-blue-50 font-medium text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <span>{category.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{category.menuItems.length}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="flex-1 space-y-4">
            {/* Search and Add Button */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => openItemEditor()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            {/* Items Grid/Cards */}
            {!selectedCategoryData ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="Select a category"
                description="Choose a category from the sidebar to view and manage items."
              />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="No items found"
                description={
                  searchQuery
                    ? 'Try adjusting your search query.'
                    : 'Add your first menu item to this category.'
                }
                action={!searchQuery ? { label: 'Add Item', onClick: () => openItemEditor() } : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* Image */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-40 w-full rounded-t-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-t-xl bg-gray-100">
                        <ImageIcon className="h-12 w-12 text-gray-300" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.description}</p>
                        </div>
                        <div className="ml-2">
                          {item.isAvailable ? (
                            <StatusPill label="Active" variant="success" />
                          ) : (
                            <StatusPill label="Inactive" variant="neutral" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(item.price)}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openItemEditor(item)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Editor Modal */}
      {showItemEditor && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeItemEditor} />
          <div className="absolute inset-y-0 right-0 flex max-w-full">
            <div className="w-screen max-w-2xl">
              <div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                {/* Header */}
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                    </h2>
                    <button onClick={closeItemEditor} className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-6 p-6">
                  {/* Basic Info */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full rounded-lg border ${
                        formErrors.name ? 'border-red-300' : 'border-gray-300'
                      } px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      placeholder="e.g., Grilled Salmon"
                    />
                    {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className={`w-full rounded-lg border ${
                        formErrors.description ? 'border-red-300' : 'border-gray-300'
                      } px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      placeholder="Describe your menu item..."
                    />
                    {formErrors.description && <p className="mt-1 text-xs text-red-600">{formErrors.description}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className={`w-full rounded-lg border ${
                            formErrors.price ? 'border-red-300' : 'border-gray-300'
                          } py-2 pl-8 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          placeholder="0.00"
                        />
                      </div>
                      {formErrors.price && <p className="mt-1 text-xs text-red-600">{formErrors.price}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className={`w-full rounded-lg border ${
                          formErrors.categoryId ? 'border-red-300' : 'border-gray-300'
                        } bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.categoryId && <p className="mt-1 text-xs text-red-600">{formErrors.categoryId}</p>}
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
                    <button
                      onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                      className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      {formData.isAvailable ? (
                        <>
                          <ToggleRight className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-gray-900">Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                          <span className="text-gray-600">Inactive</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Image URL</label>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                    {formData.imageUrl && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="h-40 w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Option Groups */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Options & Customizations</label>
                      <button
                        onClick={addOptionGroup}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Plus className="h-3 w-3" />
                        Add Option Group
                      </button>
                    </div>

                    {optionGroups.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                        No option groups yet. Add groups like "Size", "Toppings", etc.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {optionGroups.map((group, groupIndex) => (
                          <div key={group.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3 flex items-start justify-between">
                              <div className="flex-1 space-y-3">
                                <input
                                  type="text"
                                  value={group.name}
                                  onChange={(e) => updateOptionGroup(groupIndex, { name: e.target.value })}
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium"
                                  placeholder="Group name (e.g., Size, Toppings)"
                                />
                                <div className="flex items-center gap-4">
                                  <select
                                    value={group.type}
                                    onChange={(e) => updateOptionGroup(groupIndex, { type: e.target.value as any })}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
                                  >
                                    <option value="SINGLE">Single Choice</option>
                                    <option value="MULTI">Multiple Choice</option>
                                  </select>
                                  <label className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={group.required}
                                      onChange={(e) => updateOptionGroup(groupIndex, { required: e.target.checked })}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-700">Required</span>
                                  </label>
                                </div>
                              </div>
                              <button
                                onClick={() => removeOptionGroup(groupIndex)}
                                className="ml-2 rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Options */}
                            <div className="space-y-2">
                              {group.options.map((option, optionIndex) => (
                                <div key={option.id} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={option.name}
                                    onChange={(e) => updateOption(groupIndex, optionIndex, { name: e.target.value })}
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
                                    placeholder="Option name"
                                  />
                                  <div className="relative w-24">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">+$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={option.price}
                                      onChange={(e) =>
                                        updateOption(groupIndex, optionIndex, { price: parseFloat(e.target.value) || 0 })
                                      }
                                      className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-6 pr-2 text-sm"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <button
                                    onClick={() => removeOption(groupIndex, optionIndex)}
                                    className="rounded-lg p-1 text-gray-400 hover:text-red-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => addOption(groupIndex)}
                                className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-700"
                              >
                                <Plus className="h-3 w-3" />
                                Add Option
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                  <div className="flex gap-3">
                    <button
                      onClick={closeItemEditor}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveItem}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      {editingItem ? 'Update Item' : 'Add Item'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 shadow-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-900">{toastMessage}</p>
        </div>
      )}
    </>
  );
}
