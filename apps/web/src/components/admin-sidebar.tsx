'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  LogOut,
  User,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@insertflow/ui';

interface AdminSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/organizations', label: 'Organizações', icon: Building2 },
  { href: '/admin/users', label: 'Usuários', icon: Users },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-purple-900 text-white flex flex-col">
      <div className="p-4 border-b border-purple-800">
        <h1 className="text-xl font-bold">InsertFlow Admin</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-purple-700 text-white'
                  : 'text-purple-200 hover:bg-purple-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-purple-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar ao Dashboard
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-purple-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-purple-300 truncate">Admin</p>
          </div>
        </div>
        <Link href="/api/auth/signout">
          <Button variant="ghost" size="sm" className="w-full justify-start text-purple-200 hover:text-white hover:bg-purple-800">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </Link>
      </div>
    </aside>
  );
}
