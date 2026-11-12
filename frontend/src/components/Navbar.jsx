import React, { useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationDrawer from './NotificationDrawer';
import {
  Sun,
  Moon,
  Bell,
  Menu,
  LogIn,
  Search,
  Sparkles,
  User,
  LogOut
} from 'lucide-react';

export default function Navbar({ onToggleSidebar }) {
  const router = useRouter();
  const { user, logout, isIeeeVerified } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Derive minimal breadcrumb from route
  const getPageTitle = () => {
    const path = router.pathname;
    if (path === '/') return 'CAMPUS EVENTS';
    if (path.startsWith('/events/')) return 'EVENT DETAILS';
    if (path === '/dashboard/registrations') return 'MY TICKETS';
    if (path === '/dashboard/certificates') return 'MY CERTIFICATES';
    if (path === '/dashboard/ieee') return 'IEEE MEMBERSHIP';
    if (path === '/organizer/events/create') return 'PROPOSE EVENT';
    if (path === '/organizer/templates/create') return 'TEMPLATE CREATOR';
    if (path.startsWith('/organizer/templates/')) return 'TEMPLATE EDITOR';
    if (path === '/organizer/templates') return 'CERTIFICATE TEMPLATES';
    if (path === '/organizer/certificates/issue') return 'ISSUE CERTIFICATES';
    if (path.startsWith('/organizer/attendance/')) return 'ATTENDANCE SCANNER';
    if (path.startsWith('/organizer/certificates/')) return 'CERTIFICATE HUB';
    if (path.startsWith('/organizer')) return 'ORGANIZER HUB';
    if (path.startsWith('/approver')) return 'PROPOSAL APPROVALS';
    if (path.startsWith('/admin')) return 'SYSTEM ADMINISTRATION';
    if (path.startsWith('/verify-certificate')) return 'VERIFY CREDENTIAL';
    if (path === '/profile') return 'PROFILE & SECURITY';
    if (path === '/login') return 'SIGN IN';
    if (path === '/register') return 'REGISTER';
    return 'DASHBOARD';
  };

  return (
    <>
      <header className="sticky top-0 z-20 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-md transition-colors font-mono py-3.5 px-6 sm:px-8">
        <div className="flex items-center justify-between">
          {/* Left: Mobile Toggle & Minimal Breadcrumb */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-none border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              title="Toggle Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-zinc-400 dark:text-zinc-500 font-bold hidden sm:inline">CEMS</span>
              <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">/</span>
              <span className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">
                {getPageTitle()}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5">
            {/* Notifications */}
            {user && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="relative p-2 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                title="Notifications"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-none bg-red-600 text-[8px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-zinc-700" />
              )}
            </button>

            {/* Profile Dropdown or Login */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 px-3 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="w-4 h-4 rounded-none bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-[9px]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] font-bold text-zinc-950 dark:text-white truncate max-w-[90px] hidden sm:inline">
                    {user.name.split(' ')[0]}
                  </span>
                </button>

                {profileDropdownOpen && (
                  <div
                    onMouseLeave={() => setProfileDropdownOpen(false)}
                    className="absolute right-0 mt-1 w-52 rounded-none bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-2xl py-1 z-50 text-xs"
                  >
                    <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
                      <p className="font-bold text-zinc-950 dark:text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                      {isIeeeVerified && (
                        <div className="mt-1 flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>IEEE MEMBER</span>
                        </div>
                      )}
                    </div>

                    <NextLink
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </NextLink>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                        router.push('/');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border-t border-zinc-200 dark:border-zinc-800 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NextLink
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                <LogIn className="w-3 h-3" />
                <span>SIGN IN</span>
              </NextLink>
            )}
          </div>
        </div>
      </header>

      {/* Notifications Drawer */}
      <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
