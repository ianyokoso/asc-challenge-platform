'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Home, Calendar, Trophy, User, LogOut, Shield } from 'lucide-react';
import { createClient, signOut, getUser } from '@/lib/supabase/client';
import { isUserAdmin } from '@/lib/supabase/database';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const navigation = [
  { name: '홈', href: '/', icon: Home },
  { name: '트랙 선택', href: '/tracks', icon: Home },
  { name: '인증하기', href: '/certify', icon: Calendar },
  { name: '캘린더', href: '/calendar', icon: Calendar },
  { name: '리더보드', href: '/leaderboard', icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getUser();
        setUser(currentUser);
        
        // Check admin status
        if (currentUser?.id) {
          const adminStatus = await isUserAdmin(currentUser.id);
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    // Listen to auth state changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      // Check admin status on auth change
      if (session?.user?.id) {
        const adminStatus = await isUserAdmin(session.user.id);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (isLoginPage) {
    return null;
  }

  const isActive = (href: string) => pathname === href;

  // Discord에서 가져온 사용자 정보
  const userMetadata = user?.user_metadata;
  const displayName = userMetadata?.full_name || userMetadata?.name || '사용자';
  const username = userMetadata?.custom_claims?.global_name || userMetadata?.preferred_username || 'user';
  const avatarUrl = userMetadata?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground rounded-lg p-2">
              <Trophy className="h-5 w-5" />
            </div>
            <span className="text-h6 font-heading text-gray-900 hidden md:block">
              ASC 챌린지
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive(item.href) ? 'default' : 'ghost'}
                  className={
                    isActive(item.href)
                      ? 'bg-primary hover:bg-primary-hover text-primary-foreground'
                      : ''
                  }
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          {isLoading ? (
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar>
                    <AvatarImage
                      src={avatarUrl}
                      alt={displayName}
                    />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {displayName[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar>
                    <AvatarImage
                      src={avatarUrl}
                      alt={displayName}
                    />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {displayName[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-body-sm font-medium text-gray-900">
                      {displayName}
                    </span>
                    <span className="text-body-xs text-gray-500">
                      {username}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    내 프로필
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="h-4 w-4 mr-2" />
                        관리자 페이지
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                로그인
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3 flex gap-2 overflow-x-auto">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive(item.href) ? 'default' : 'ghost'}
                size="sm"
                className={
                  isActive(item.href)
                    ? 'bg-primary hover:bg-primary-hover text-primary-foreground'
                    : ''
                }
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.name}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

