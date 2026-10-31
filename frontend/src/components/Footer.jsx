import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-none bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs">
                ▲
              </div>
              <span className="font-bold text-sm text-zinc-950 dark:text-white tracking-tight font-mono">
                CEMS
              </span>
            </div>
            <p className="text-zinc-500 leading-relaxed text-xs">
              College Event Management System. Enterprise platform for workshops, hackathons, IEEE societies, and instant digital certificates.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-zinc-950 dark:text-white text-xs font-mono uppercase tracking-wider mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                  Upcoming Events
                </Link>
              </li>
              <li>
                <Link href="/verify-certificate/search" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                  Public Certificate Verification
                </Link>
              </li>
              <li>
                <Link href="/dashboard/ieee" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                  IEEE Membership Benefits
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-zinc-950 dark:text-white text-xs font-mono uppercase tracking-wider mb-3">
              Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard/registrations" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                  Student Tickets
                </Link>
              </li>
              <li>
                <Link href="/organizer" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                  Organizer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/approver" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                  Faculty Approvals
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                  Admin System Tools
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-zinc-950 dark:text-white text-xs font-mono uppercase tracking-wider mb-3">
              Institutional Standards
            </h4>
            <p className="text-zinc-500 leading-relaxed mb-3 text-xs">
              Compliant with IEEE Std 830 / ISO/IEC/IEEE 29148 requirements specifications with atomic race-condition safety.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verifiable Cryptographic Hashes</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 font-mono text-[11px]">
          <p>© {new Date().getFullYear()} College Event Management System (CEMS). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>PURE BLACK / WHITE THEME</span>
            <span>•</span>
            <span>SHARP BORDERS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
