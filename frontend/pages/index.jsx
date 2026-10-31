import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { api } from '../src/lib/api';
import EventCard from '../src/components/EventCard';
import { useAuth } from '../src/context/AuthContext';
import {
  Search,
  Filter,
  Sparkles,
  Calendar,
  X,
  RefreshCw,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';

export default function Home() {
  const { user, isIeeeVerified } = useAuth();
  const [events, setEvents] = useState([]);
  const [bodies, setBodies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [organizingBodyId, setOrganizingBodyId] = useState('');
  const [feeFilter, setFeeFilter] = useState('ALL'); // ALL, FREE, PAID
  const [ieeeOnly, setIeeeOnly] = useState(false);

  const categories = ['All', 'Workshop', 'Hackathon', 'Seminar', 'Cultural Fest', 'Technical Fest'];

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category && category !== 'All') params.append('category', category);
      if (organizingBodyId) params.append('organizingBodyId', organizingBodyId);
      if (feeFilter === 'FREE') params.append('isFree', 'true');
      if (feeFilter === 'PAID') params.append('isFree', 'false');
      if (ieeeOnly) params.append('ieeeOnly', 'true');

      const data = await api.get(`/events?${params.toString()}`);
      setEvents(data.events || []);
    } catch (err) {
      console.error('Fetch events error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBodies = async () => {
    try {
      const data = await api.get('/bodies');
      setBodies(data.bodies || []);
    } catch (err) {
      console.error('Fetch bodies error:', err);
    }
  };

  useEffect(() => {
    fetchBodies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, category, organizingBodyId, feeFilter, ieeeOnly]);

  const clearFilters = () => {
    setSearch('');
    setCategory('All');
    setOrganizingBodyId('');
    setFeeFilter('ALL');
    setIeeeOnly(false);
  };

  const hasActiveFilters = search || category !== 'All' || organizingBodyId || feeFilter !== 'ALL' || ieeeOnly;

  return (
    <>
      <Head>
        <title>CEMS | College Event Management System</title>
        <meta
          name="description"
          content="Discover, register, and manage campus events, workshops, hackathons, and IEEE chapter activities."
        />
      </Head>

      <div className="space-y-8">
        {/* Vercel Geometric Hero Section */}
        <div className="relative rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black vercel-grid p-8 md:p-14 overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-none text-[11px] font-mono uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black border border-zinc-800 dark:border-zinc-200">
              <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse" />
              <span>OFFICIAL CAMPUS EVENT PLATFORM</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter text-zinc-950 dark:text-white leading-[1.1]">
              Experience Campus Life. <br />
              <span className="text-zinc-500 dark:text-zinc-400">
                Register & Get Certified.
              </span>
            </h1>

            <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed font-sans">
              Discover official college workshops, national hackathons, cultural symposia, and IEEE society meetups. Instant seat confirmation, ticket QR codes, and tamper-proof digital certificates.
            </p>

            {user && (
              <div className="pt-2 flex items-center gap-3 font-mono text-xs">
                {isIeeeVerified ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>IEEE MEMBER DISCOUNT ACTIVE (#{user.ieeeMembership?.membershipNumber})</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                    <span>LOGGED IN AS {user.name.toUpperCase()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Discovery & Filters Bar */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, workshops, hackathons..."
                className="w-full pl-9 pr-8 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs font-mono text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-950 dark:focus:border-white transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & IEEE Toggle */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {/* Organizing Body filter */}
              <select
                value={organizingBodyId}
                onChange={(e) => setOrganizingBodyId(e.target.value)}
                className="px-2.5 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-black dark:focus:border-white"
              >
                <option value="">ALL BODIES</option>
                {bodies.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name.toUpperCase()} ({b.type})
                  </option>
                ))}
              </select>

              {/* Fee filter */}
              <select
                value={feeFilter}
                onChange={(e) => setFeeFilter(e.target.value)}
                className="px-2.5 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-black dark:focus:border-white"
              >
                <option value="ALL">ALL FEES</option>
                <option value="FREE">FREE ENTRY</option>
                <option value="PAID">PAID ENTRY</option>
              </select>

              {/* IEEE Only Toggle */}
              <button
                onClick={() => setIeeeOnly(!ieeeOnly)}
                className={`px-3 py-2 rounded-none border flex items-center gap-1.5 font-mono text-xs transition-colors ${
                  ieeeOnly
                    ? 'bg-amber-400 text-black border-amber-500 font-bold'
                    : 'bg-white dark:bg-black border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>IEEE ONLY</span>
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-2.5 py-2 rounded-none border border-zinc-300 dark:border-zinc-800 text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>RESET</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200 dark:border-zinc-800">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-none text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
                  category === cat
                    ? 'border-black dark:border-white text-black dark:text-white font-bold bg-zinc-100 dark:bg-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-black dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-5 h-80 animate-pulse space-y-4"
                >
                  <div className="w-full h-40 bg-zinc-200 dark:bg-zinc-900 rounded-none" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-900 rounded-none w-3/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-900 rounded-none w-1/2" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
              <Calendar className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <h3 className="font-bold text-sm text-zinc-950 dark:text-white font-mono uppercase">
                No events found matching your criteria
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto font-mono">
                TRY LOOSENING YOUR FILTERS OR SEARCH KEYWORDS.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-3.5 py-1.5 rounded-none text-xs font-mono font-semibold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  CLEAR ALL FILTERS
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
