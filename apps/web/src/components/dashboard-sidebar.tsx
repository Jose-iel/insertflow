'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  FolderOpen, 
  Layout, 
  Image, 
  Sparkles,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@insertflow/ui';

interface DashboardSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Produtos', icon: Package },
  { href: '/dashboard/folders', label: 'Pastas', icon: FolderOpen },
  { href: '/dashboard/templates', label: 'Templates', icon: Layout },
  { href: '/dashboard/images', label: 'Galeria', icon: Image },
  { href: '/dashboard/generation', label: 'Gerar Encartes', icon: Sparkles },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">InsertFlow</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <Link href="/api/auth/signout">
          <Button variant="ghost" size="sm" className="w-full flex items-center gap-2 py-2.5 bg-red-600 text-white hover:bg-red-700">
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </Link>
      </div>
    </aside>
  );
}
