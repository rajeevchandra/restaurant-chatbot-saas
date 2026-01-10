
import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { OrdersProvider } from '@/context/OrdersContext';
import { MenuProvider } from '@/context/MenuContext';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <OrdersProvider>
      <MenuProvider>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto">
              <div className="container mx-auto px-4 py-8 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </MenuProvider>
    </OrdersProvider>
  );
}
