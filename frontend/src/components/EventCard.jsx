import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Users, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function EventCard({ event }) {
  const { user, isIeeeVerified } = useAuth();

  const isIeee = event.organizingBody?.type === 'IEEE';
  const seatsLeft = event.seatsLeft !== undefined ? event.seatsLeft : Math.max(0, event.seatLimit - event.seatsConfirmed);
  const isFull = seatsLeft <= 0;
  const isClosed = event.status === 'REGISTRATION_CLOSED' || event.status === 'COMPLETED' || event.status === 'CANCELLED';

  const defaultBanner = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';
  const banner = event.bannerUrl || defaultBanner;

  const startDate = new Date(event.startDateTime).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const eventDetailsUrl = `/events/${event.id}`;

  return (
    <div className="group rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black overflow-hidden flex flex-col hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150">
      {/* Banner & Badges (Clickable Link to Dedicated Page) */}
      <Link
        href={eventDetailsUrl}
        className="block relative aspect-[16/9] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 cursor-pointer border-b border-zinc-200 dark:border-zinc-800"
      >
        <img
          src={banner}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-black text-white border border-zinc-700">
            {event.category}
          </span>

          {isIeee && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono font-bold tracking-wider bg-amber-400 text-black border border-amber-500">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>IEEE</span>
            </span>
          )}
        </div>

        {/* Bottom Banner Info */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs">
          <span className="font-medium text-white truncate max-w-[200px] font-mono text-[11px]">
            {event.organizingBody?.name || 'College Society'}
          </span>
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-medium bg-black/80 text-zinc-300 border border-zinc-700 uppercase">
            {event.mode}
          </span>
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Clickable Title */}
          <Link href={eventDetailsUrl} className="block">
            <h3 className="font-semibold text-sm text-zinc-950 dark:text-white line-clamp-2 hover:underline decoration-zinc-400 transition-colors">
              {event.title}
            </h3>
          </Link>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Meta rows */}
        <div className="space-y-1.5 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px]">{startDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            <span className="truncate text-[11px]">{event.venue}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px]">Cap: {event.seatLimit}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-none text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                isFull
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isFull ? 'Waitlist Open' : `${seatsLeft} Left`}
            </span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          {/* Fee section */}
          <div>
            {event.isFree ? (
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                Free
              </span>
            ) : isIeee ? (
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-sm font-bold font-mono ${isIeeeVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-950 dark:text-white'}`}>
                    ₹{event.ieeeFee}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">IEEE</span>
                  <span className="text-xs font-mono text-zinc-500 line-through">
                    ₹{event.standardFee}
                  </span>
                </div>
                {isIeeeVerified && (
                  <span className="text-[9px] font-mono text-emerald-500 flex items-center gap-0.5 mt-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> Your IEEE Price
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold font-mono text-zinc-950 dark:text-white">
                  ₹{event.standardFee}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">STD</span>
              </div>
            )}
          </div>

          {/* Sharp Action button */}
          <Link
            href={eventDetailsUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-medium bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <span>{isClosed ? 'View' : isFull ? 'Waitlist' : 'Register'}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
