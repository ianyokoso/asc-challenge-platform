'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Settings,
  Trophy,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  {
    name: '대시보드',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: '사용자 관리',
    href: '/admin/users',
    icon: Users,
  },
  {
    name: '인증 현황',
    href: '/admin/tracking',
    icon: BarChart3,
  },
  {
    name: '설정',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground rounded-lg p-2">
            <Trophy className="h-5 w-5" />
          </div>
          <span className="text-h6 font-heading text-gray-900">
            관리자 페이지
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:bg-gray-200'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-body font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Back to User Page */}
      <div className="p-4 border-t border-gray-200">
        <Link href="/">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            사용자 페이지로
          </Button>
        </Link>
      </div>
    </aside>
  );
}

