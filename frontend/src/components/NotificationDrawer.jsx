import React from 'react';
import Link from 'next/link';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell,
  CheckCheck,
  Award,
  Ticket,
  Clock,
  Megaphone,
  Calendar,
  X,
  ExternalLink
} from 'lucide-react';

export default function NotificationDrawer({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'REGISTRATION':
        return <Ticket className="w-4 h-4 text-emerald-500" />;
      case 'WAITLIST':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'CERTIFICATE':
        return <Award className="w-4 h-4 text-yellow-500" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-4 h-4 text-blue-500" />;
      case 'EVENT_UPDATE':
        return <Calendar className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-black border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col rounded-none">
          {/* Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-none bg-black dark:bg-white text-white dark:text-black border border-zinc-800">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-950 dark:text-white font-mono">NOTIFICATIONS</h3>
                <p className="text-[10px] font-mono text-zinc-500 uppercase">{unreadCount} UNREAD MESSAGES</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="px-2 py-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 rounded-none flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark Read</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 rounded-none transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {notifications.length === 0 ? (
              <div className="text-center py-20">
                <Bell className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs font-mono text-zinc-500 uppercase">NO NOTIFICATIONS</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                  className={`p-3.5 rounded-none border transition-colors cursor-pointer ${
                    notif.isRead
                      ? 'bg-transparent border-zinc-200 dark:border-zinc-800/80 opacity-75 hover:opacity-100 hover:border-zinc-400 dark:hover:border-zinc-700'
                      : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-zinc-950 dark:text-white truncate font-mono">
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-none bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 font-mono text-[10px]">
                        <span className="text-zinc-500">
                          {new Date(notif.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {notif.link && (
                          <Link
                            href={notif.link}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                          >
                            <span>VIEW</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
