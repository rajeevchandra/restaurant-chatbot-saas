'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { DataTable } from '@/components/DataTable';
import { StatusPill, getOrderStatusVariant } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { DollarSign, ShoppingBag, Clock, XCircle, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '@/lib/apiClient';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days'>('today');
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    ordersToday: 0,
    ordersYesterday: 0,
    revenue: 0,
    revenueYesterday: 0,
    avgPrepTime: 0,
    avgPrepTimeYesterday: 0,
    cancellationRate: 0,
    cancellationRateYesterday: 0,
  });

  const [ordersByHour, setOrdersByHour] = useState<any[]>([]);
  const [topSellingItems, setTopSellingItems] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch recent orders
      const ordersResponse = await apiClient.getOrders({ limit: 10 });
      if (ordersResponse.success && ordersResponse.data) {
        const orders = ordersResponse.data.items || ordersResponse.data;
        setRecentOrders(orders.slice(0, 5));
        
        // Calculate stats from orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayOrders = orders.filter((order: any) => 
          new Date(order.createdAt) >= today
        );
        
        const revenue = todayOrders.reduce((sum: number, order: any) => 
          sum + (order.total || 0), 0
        );
        
        setStats(prev => ({
          ...prev,
          ordersToday: todayOrders.length,
          revenue: revenue,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
    }, 800);
  }, [dateRange]);

  const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  };

  const calculateDelta = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return Math.round(Math.abs(((current - previous) / previous) * 100) * 100) / 100;
  };

  const orderColumns = [
    { key: 'id', label: 'Order ID' },
    { key: 'customer', label: 'Customer' },
    { key: 'total', label: 'Total', className: 'text-right' },
    { key: 'status', label: 'Status' },
    { key: 'time', label: 'Time' },
    { key: 'actions', label: 'Actions', className: 'text-right' },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Overview" description="Loading dashboard..." />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-80 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Demo Restaurant"
        actions={
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
          </select>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Orders Today"
          value={stats.ordersToday}
          change={{
            value: calculateDelta(stats.ordersToday, stats.ordersYesterday),
            label: 'from yesterday',
          }}
          trend={calculateTrend(stats.ordersToday, stats.ordersYesterday)}
          icon={ShoppingBag}
        />
        <StatCard
          title="Revenue Today"
          value={formatCurrency(stats.revenue)}
          change={{
            value: calculateDelta(stats.revenue, stats.revenueYesterday),
            label: 'from yesterday',
          }}
          trend={calculateTrend(stats.revenue, stats.revenueYesterday)}
          icon={DollarSign}
        />
        <StatCard
          title="Avg Prep Time"
          value={`${stats.avgPrepTime} min`}
          change={{
            value: calculateDelta(stats.avgPrepTime, stats.avgPrepTimeYesterday),
            label: 'from yesterday',
          }}
          trend={calculateTrend(stats.avgPrepTimeYesterday, stats.avgPrepTime)}
          icon={Clock}
        />
        <StatCard
          title="Cancellation Rate"
          value={`${stats.cancellationRate}%`}
          change={{
            value: calculateDelta(stats.cancellationRate, stats.cancellationRateYesterday),
            label: 'from yesterday',
          }}
          trend={calculateTrend(stats.cancellationRateYesterday, stats.cancellationRate)}
          icon={XCircle}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Orders by Hour Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Orders by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ordersByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Items */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Selling Items</h3>
          <div className="space-y-4">
            {topSellingItems.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.count} orders</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <a href="/admin/orders" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            View all
          </a>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            description="When customers place orders, they'll appear here."
          />
        ) : (
          <DataTable
            columns={orderColumns}
            data={recentOrders}
            renderRow={(order) => (
              <>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-900">
                  {order.id}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {order.customerName}
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
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/admin/orders/${order.id}`;
                    }}
                    className="mr-3 text-blue-600 hover:text-blue-700"
                  >
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Open status update modal
                    }}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    Update
                  </button>
                </td>
              </>
            )}
          />
        )}
      </div>
    </div>
  );
}
