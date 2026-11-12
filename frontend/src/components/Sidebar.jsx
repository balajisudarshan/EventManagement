import React from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import {
  Calendar,
  Award,
  Ticket,
  ShieldCheck,
  LayoutDashboard,
  CheckCircle,
  Settings,
  PlusSquare,
  Sparkles,
  User,
  LogOut,
  LogIn,
  Search,
  ExternalLink,
  X,
  LayoutTemplate,
  Send
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const router = useRouter();
  const { user, logout, isOrganizer, isApprover, isAdmin, isIeeeVerified } = useAuth();

  const isActive = (path) => {
    if (path === '/' || path === '/organizer') return router.pathname === path;
    return router.pathname.startsWith(path);
  };

  const navItemClass = (path) =>
    `flex items-center justify-between px-3 py-2 rounded-none text-xs font-mono transition-colors border ${
      isActive(path)
        ? 'border-zinc-900 dark:border-zinc-100 bg-black dark:bg-white text-white dark:text-black font-bold'
        : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-white dark:bg-black font-mono">
      {/* Top Header & Brand */}
      <div className="space-y-6">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <NextLink href="/" onClick={onClose} className="flex items-center gap-2.5 group">
            <BrandLogo size="md" className="transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-tight text-zinc-950 dark:text-white leading-none">
                CEMS
              </span>
              <span className="text-[9px] text-zinc-500 tracking-widest uppercase mt-0.5">
                COLLEGE SYSTEM
              </span>
            </div>
          </NextLink>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1 text-zinc-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="px-3 space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">
          {/* Section: DISCOVER */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
              DISCOVER
            </span>
            <NextLink href="/" onClick={onClose} className={navItemClass('/')}>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Browse Events</span>
              </div>
            </NextLink>

            <NextLink
              href="/verify-certificate/search"
              onClick={onClose}
              className={navItemClass('/verify-certificate/search')}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify Credential</span>
              </div>
            </NextLink>
          </div>

          {/* Section: PARTICIPANT (Student) */}
          {user && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
                MY ACTIVITY
              </span>
              <NextLink
                href="/dashboard/registrations"
                onClick={onClose}
                className={navItemClass('/dashboard/registrations')}
              >
                <div className="flex items-center gap-2.5">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>My Tickets</span>
                </div>
              </NextLink>

              <NextLink
                href="/dashboard/certificates"
                onClick={onClose}
                className={navItemClass('/dashboard/certificates')}
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>My Certificates</span>
                </div>
              </NextLink>

              <NextLink
                href="/dashboard/ieee"
                onClick={onClose}
                className={navItemClass('/dashboard/ieee')}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>IEEE Membership</span>
                </div>
                {isIeeeVerified && (
                  <span className="w-1.5 h-1.5 rounded-none bg-emerald-500" />
                )}
              </NextLink>
            </div>
          )}

          {/* Section: MANAGEMENT / ROLES */}
          {(isOrganizer || isApprover || isAdmin) && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
                MANAGEMENT
              </span>

              {isOrganizer && (
                <>
                  <NextLink
                    href="/organizer"
                    onClick={onClose}
                    className={navItemClass('/organizer')}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Organizer Hub</span>
                    </div>
                  </NextLink>

                  <NextLink
                    href="/organizer/events/create"
                    onClick={onClose}
                    className={navItemClass('/organizer/events/create')}
                  >
                    <div className="flex items-center gap-2.5">
                      <PlusSquare className="w-3.5 h-3.5" />
                      <span>New Event Proposal</span>
                    </div>
                  </NextLink>

                  <NextLink
                    href="/organizer/templates"
                    onClick={onClose}
                    className={navItemClass('/organizer/templates')}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutTemplate className="w-3.5 h-3.5" />
                      <span>Cert Templates</span>
                    </div>
                  </NextLink>

                  <NextLink
                    href="/organizer/certificates/issue"
                    onClick={onClose}
                    className={navItemClass('/organizer/certificates/issue')}
                  >
                    <div className="flex items-center gap-2.5">
                      <Send className="w-3.5 h-3.5 text-amber-500" />
                      <span>Issue Certificates</span>
                    </div>
                  </NextLink>
                </>
              )}

              {isApprover && (
                <NextLink
                  href="/approver"
                  onClick={onClose}
                  className={navItemClass('/approver')}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Faculty Approvals</span>
                  </div>
                </NextLink>
              )}

              {isAdmin && (
                <NextLink
                  href="/admin"
                  onClick={onClose}
                  className={navItemClass('/admin')}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-3.5 h-3.5 text-purple-500" />
                    <span>System Admin</span>
                  </div>
                </NextLink>
              )}
            </div>
          )}

          {/* Section: SETTINGS */}
          {user && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
                PREFERENCES
              </span>
              <NextLink
                href="/profile"
                onClick={onClose}
                className={navItemClass('/profile')}
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Profile & Security</span>
                </div>
              </NextLink>
            </div>
          )}
        </div>
      </div>

      {/* Bottom User Area */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        {user ? (
          <div className="p-2.5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-none bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-bold text-zinc-950 dark:text-white truncate leading-none">
                  {user.name}
                </p>
                <p className="text-[9px] text-zinc-500 uppercase mt-0.5 truncate">
                  {user.role}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              title="Sign Out"
              className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <NextLink
            href="/login"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-none text-xs font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>SIGN IN</span>
          </NextLink>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-60 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 sticky top-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-72 h-full border-r border-zinc-200 dark:border-zinc-800 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

