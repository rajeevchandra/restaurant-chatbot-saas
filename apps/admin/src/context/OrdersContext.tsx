"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getApiClient } from '@/lib/apiClient';
import type { OrderDTO } from '@restaurant-saas/shared';

interface OrdersContextType {
  orders: OrderDTO[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const OrdersProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await getApiClient().getOrders({ limit: 100 });
      if (response.success && response.data) {
        const fetchedOrders = (response.data.items || response.data).map((order: any) => ({
          ...order,
          items: order.items || [],
          restaurantId: order.restaurantId || '',
          status: order.status,
          subtotal: order.subtotal ?? 0,
          tax: order.tax ?? 0,
          total: order.total ?? 0,
          createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
          updatedAt: order.updatedAt ? new Date(order.updatedAt) : new Date(),
        }));
        setOrders(fetchedOrders);
      }
    } catch (error) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <OrdersContext.Provider value={{ orders, loading, refresh: fetchOrders }}>
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) throw new Error('useOrders must be used within an OrdersProvider');
  return context;
};
