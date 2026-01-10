"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getApiClient } from '@/lib/apiClient';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  categoryId: string;
  imageUrl?: string;
  optionGroups?: any[];
}

interface MenuContextType {
  menuItems: MenuItem[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await getApiClient().getMenuItems();
      if (response.success && response.data) {
        let items: MenuItem[] = [];
        if (Array.isArray(response.data)) {
          items = response.data;
        } else if (typeof response.data === 'object' && response.data !== null && 'items' in response.data && Array.isArray((response.data as any).items)) {
          items = (response.data as any).items;
        }
        setMenuItems(items);
      }
    } catch (error) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  return (
    <MenuContext.Provider value={{ menuItems, loading, refresh: fetchMenuItems }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) throw new Error('useMenu must be used within a MenuProvider');
  return context;
};
