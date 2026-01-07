'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import {
  Package,
  AlertTriangle,
  Download,
  Search,
  CheckSquare,
  Square,
  Loader2,
  Check,
  X,
  UtensilsCrossed,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface InventoryItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  categoryName: string;
  quantity: number;
  lowStockThreshold: number;
  isSoldOut: boolean;
  lastUpdated: string;
  updating?: boolean;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showSoldOutOnly, setShowSoldOutOnly] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = () => {
    setLoading(true);
    // TODO: Fetch inventory from API
    setTimeout(() => {
      setInventory([
        {
          id: '1',
          menuItemId: 'item-1',
          menuItemName: 'Spring Rolls',
          categoryName: 'Appetizers',
          quantity: 45,
          lowStockThreshold: 10,
          isSoldOut: false,
          lastUpdated: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: '2',
          menuItemId: 'item-2',
          menuItemName: 'Chicken Wings',
          categoryName: 'Appetizers',
          quantity: 8,
          lowStockThreshold: 10,
          isSoldOut: false,
          lastUpdated: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        {
          id: '3',
          menuItemId: 'item-3',
          menuItemName: 'Grilled Salmon',
          categoryName: 'Main Courses',
          quantity: 22,
          lowStockThreshold: 15,
          isSoldOut: false,
          lastUpdated: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
        {
          id: '4',
          menuItemId: 'item-4',
          menuItemName: 'Beef Burger',
          categoryName: 'Main Courses',
          quantity: 0,
          lowStockThreshold: 20,
          isSoldOut: true,
          lastUpdated: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        },
        {
          id: '5',
          menuItemId: 'item-5',
          menuItemName: 'Caesar Salad',
          categoryName: 'Salads',
          quantity: 35,
          lowStockThreshold: 15,
          isSoldOut: false,
          lastUpdated: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: '6',
          menuItemId: 'item-6',
          menuItemName: 'Chocolate Lava Cake',
          categoryName: 'Desserts',
          quantity: 0,
          lowStockThreshold: 8,
          isSoldOut: true,
          lastUpdated: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        },
      ]);
      setLoading(false);
    }, 600);
  };

  const categories = Array.from(new Set(inventory.map((item) => item.categoryName)));

  const filteredInventory = inventory.filter((item) => {
    if (searchQuery && !item.menuItemName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (categoryFilter && item.categoryName !== categoryFilter) {
      return false;
    }
    if (showSoldOutOnly && !item.isSoldOut) {
      return false;
    }
    return true;
  });

  const toggleSoldOut = (itemId: string) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, isSoldOut: !item.isSoldOut, updating: true, lastUpdated: new Date().toISOString() }
          : item
      )
    );

    // Simulate API call
    setTimeout(() => {
      setInventory((prev) => prev.map((item) => (item.id === itemId ? { ...item, updating: false } : item)));
    }, 800);
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              isSoldOut: newQuantity === 0,
              updating: true,
              lastUpdated: new Date().toISOString(),
            }
          : item
      )
    );

    // Simulate API call
    setTimeout(() => {
      setInventory((prev) => prev.map((item) => (item.id === itemId ? { ...item, updating: false } : item)));
    }, 800);
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredInventory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredInventory.map((item) => item.id)));
    }
  };

  const markAllInStock = () => {
    const itemsToUpdate = selectedItems.size > 0 ? Array.from(selectedItems) : filteredInventory.map((i) => i.id);

    setInventory((prev) =>
      prev.map((item) =>
        itemsToUpdate.includes(item.id)
          ? { ...item, isSoldOut: false, updating: true, lastUpdated: new Date().toISOString() }
          : item
      )
    );

    setTimeout(() => {
      setInventory((prev) => prev.map((item) => ({ ...item, updating: false })));
      setSelectedItems(new Set());
    }, 800);
  };

  const getStatusInfo = (item: InventoryItem) => {
    if (item.isSoldOut) {
      return { label: 'Sold Out', variant: 'error' as const, icon: <X className="h-4 w-4" /> };
    }
    if (item.quantity <= item.lowStockThreshold) {
      return { label: 'Low Stock', variant: 'warning' as const, icon: <AlertTriangle className="h-4 w-4" /> };
    }
    return { label: 'In Stock', variant: 'success' as const, icon: <Check className="h-4 w-4" /> };
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Inventory Management" description="Track and manage stock levels" />
        <div className="animate-pulse space-y-4">
          <div className="h-12 rounded-xl bg-gray-200" />
          <div className="h-32 rounded-xl bg-gray-200" />
          <div className="h-32 rounded-xl bg-gray-200" />
          <div className="h-32 rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Track and manage stock levels for all menu items"
        actions={
          <>
            {selectedItems.size > 0 && (
              <button
                onClick={markAllInStock}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
                Mark {selectedItems.size} In Stock
              </button>
            )}
            <button
              onClick={markAllInStock}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Check className="h-4 w-4" />
              Mark All In Stock
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={showSoldOutOnly}
            onChange={(e) => setShowSoldOutOnly(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Sold Out Only
        </label>
      </div>

      {filteredInventory.length === 0 ? (
        <EmptyState
          icon={inventory.length === 0 ? UtensilsCrossed : Package}
          title={inventory.length === 0 ? 'No inventory items yet' : 'No items found'}
          description={
            inventory.length === 0
              ? 'Add menu items to start tracking inventory.'
              : 'Try adjusting your search or filters.'
          }
          action={
            inventory.length === 0
              ? { label: 'Go to Menu', onClick: () => (window.location.href = '/admin/menu') }
              : undefined
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-6 py-3">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                      {selectedItems.size === filteredInventory.length && filteredInventory.length > 0 ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Category
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Sold Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInventory.map((item) => {
                  const status = getStatusInfo(item);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 ${item.updating ? 'opacity-60' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleSelectItem(item.id)}
                          className="text-gray-400 hover:text-gray-600"
                          disabled={item.updating}
                        >
                          {selectedItems.has(item.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.updating && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                          <span className="text-sm font-medium text-gray-900">{item.menuItemName}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {item.categoryName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                          disabled={item.updating}
                          className="w-20 rounded-lg border border-gray-300 px-3 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <StatusPill label={status.label} variant={status.variant} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <button
                          onClick={() => toggleSoldOut(item.id)}
                          disabled={item.updating}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            item.isSoldOut ? 'bg-red-600' : 'bg-gray-200'
                          } ${item.updating ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              item.isSoldOut ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(item.lastUpdated)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-4 md:hidden">
            {filteredInventory.map((item) => {
              const status = getStatusInfo(item);
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
                    item.updating ? 'opacity-60' : ''
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSelectItem(item.id)}
                        className="text-gray-400 hover:text-gray-600"
                        disabled={item.updating}
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          {item.updating && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                          <h3 className="font-semibold text-gray-900">{item.menuItemName}</h3>
                        </div>
                        <p className="text-sm text-gray-500">{item.categoryName}</p>
                      </div>
                    </div>
                    <StatusPill label={status.label} variant={status.variant} />
                  </div>

                  <div className="space-y-3 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Quantity</span>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                        disabled={item.updating}
                        className="w-20 rounded-lg border border-gray-300 px-3 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Sold Out</span>
                      <button
                        onClick={() => toggleSoldOut(item.id)}
                        disabled={item.updating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          item.isSoldOut ? 'bg-red-600' : 'bg-gray-200'
                        } ${item.updating ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            item.isSoldOut ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Last updated</span>
                      <span>{formatDateTime(item.lastUpdated)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
    </div>
  );
}
