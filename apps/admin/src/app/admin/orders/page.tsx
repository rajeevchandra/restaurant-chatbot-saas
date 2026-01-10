'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusPill, getOrderStatusVariant } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import {
  ShoppingBag,
  RefreshCw,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

type OrderStatus = 'CREATED' | 'PAID' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
type OrderType = 'PICKUP' | 'DELIVERY';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  options?: { name: string; value: string }[];
}

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  subtotal: number;
  tax: number;
  status: OrderStatus;
  orderType: OrderType;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  deliveryAddress?: string;
  specialInstructions?: string;
  statusHistory: { status: OrderStatus; timestamp: string }[];
}

const STATUS_TABS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'New', value: 'CREATED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['PAID', 'CANCELLED'],
  PAID: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getOrders({ limit: 100 });
      if (response.success && response.data) {
        const fetchedOrders = response.data.items || response.data;
        setOrders(fetchedOrders);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab !== 'ALL' && order.status !== activeTab) return false;
    if (orderTypeFilter && order.orderType !== orderTypeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.id.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.customerPhone.includes(query)
      );
    }
    return true;
  });

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await apiClient.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        // Refresh orders list
        await loadOrders();
        
        // Update selected order if it's the one being changed
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null); // Close drawer
        }
      } else {
        console.error('Failed to update order status:', response.error);
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const response = await apiClient.cancelOrder(orderId);
      if (response.success) {
        await loadOrders();
        setShowCancelDialog(false);
        setSelectedOrder(null);
      } else {
        console.error('Failed to cancel order:', response.error);
        alert('Failed to cancel order');
      }
    } catch (error) {
      console.error('Error canceling order:', error);
      alert('Failed to cancel order');
    }
  };

  const orderColumns = [
    { key: 'id', label: 'Order ID' },
    { key: 'customer', label: 'Customer' },
    { key: 'type', label: 'Type' },
    { key: 'items', label: 'Items', className: 'text-center' },
    { key: 'total', label: 'Total', className: 'text-right' },
    { key: 'status', label: 'Status' },
    { key: 'time', label: 'Time' },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Orders" description="Manage and track all customer orders" />
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
    <>
      <div className="space-y-6">
        <PageHeader
          title="Orders"
          description="Manage and track all customer orders"
          actions={
            <button
              onClick={loadOrders}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          }
        />

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === tab.value
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <option value="">All Types</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>

        {/* Orders Table (Desktop) */}
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            description="Try adjusting your filters or check back later for new orders."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable
                columns={orderColumns}
                data={filteredOrders}
                renderRow={(order) => (
                  <>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-sm text-gray-500">{order.customerEmail}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {order.orderType}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-900">
                      {order.items.length}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusPill
                        label={order.status}
                        variant={getOrderStatusVariant(order.status)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </>
                )}
                onRowClick={(order) => setSelectedOrder(order)}
              />
            </div>

            {/* Mobile Card List */}
            <div className="space-y-4 md:hidden">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:border-blue-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-medium text-gray-900">{order.id}</p>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                    </div>
                    <StatusPill
                      label={order.status}
                      variant={getOrderStatusVariant(order.status)}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{order.items.length} items</span>
                    <span className="font-medium text-gray-900">{formatCurrency(order.total)}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">{formatDateTime(order.createdAt)}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />

          {/* Drawer */}
          <div className="absolute inset-y-0 right-0 flex max-w-full">
            <div className="w-screen max-w-md">
              <div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                {/* Header */}
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-sm text-gray-600">{selectedOrder.id}</p>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-6 p-6">
                  {/* Customer Details */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">Customer</h3>
                    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="font-medium text-gray-900">{selectedOrder.customerName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        {selectedOrder.customerEmail}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {selectedOrder.customerPhone}
                      </div>
                      {selectedOrder.deliveryAddress && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="mt-0.5 h-4 w-4" />
                          <span>{selectedOrder.deliveryAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">Items</h3>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {item.quantity}x {item.name}
                            </p>
                            {item.options && item.options.length > 0 && (
                              <p className="mt-1 text-xs text-gray-500">
                                {item.options.map((opt) => `${opt.name}: ${opt.value}`).join(', ')}
                              </p>
                            )}
                          </div>
                          <p className="font-medium text-gray-900">{formatCurrency(item.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Totals */}
                  <div className="space-y-2 border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax</span>
                      <span>{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
                      <span>Total</span>
                      <span>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {selectedOrder.specialInstructions && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-900">Special Instructions</h3>
                      <p className="rounded-lg border border-gray-200 bg-yellow-50 p-3 text-sm text-gray-700">
                        {selectedOrder.specialInstructions}
                      </p>
                    </div>
                  )}

                  {/* Status Timeline */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">Status Timeline</h3>
                    <div className="space-y-4">
                      {selectedOrder.statusHistory.map((history, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                index === selectedOrder.statusHistory.length - 1
                                  ? 'bg-blue-100'
                                  : 'bg-gray-100'
                              }`}
                            >
                              {index === selectedOrder.statusHistory.length - 1 ? (
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-gray-400" />
                              )}
                            </div>
                            {index < selectedOrder.statusHistory.length - 1 && (
                              <div className="h-full w-0.5 bg-gray-200" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-sm font-medium text-gray-900">{history.status}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(history.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <div className="space-y-3">
                      {ALLOWED_TRANSITIONS[selectedOrder.status]
                        .filter((status) => status !== 'CANCELLED')
                        .map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => updateOrderStatus(selectedOrder.id, nextStatus)}
                            className="flex w-full items-center justify-between rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            <span>Move to {nextStatus}</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        ))}
                      <button
                        onClick={() => setShowCancelDialog(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <AlertCircle className="h-4 w-4" />
                        Cancel Order
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCancelDialog(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Cancel Order</h3>
            <p className="mb-6 text-sm text-gray-600">
              Are you sure you want to cancel order {selectedOrder.id}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Keep Order
              </button>
              <button
                onClick={() => cancelOrder(selectedOrder.id)}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
