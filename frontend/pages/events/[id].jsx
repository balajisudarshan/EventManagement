import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import TicketModal from '../../src/components/TicketModal';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  Mail,
  Phone,
  User,
  Ticket
} from 'lucide-react';

export default function EventDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isIeeeVerified } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customAnswers, setCustomAnswers] = useState({});
  const [teamName, setTeamName] = useState('');

  // Ticket modal state for freshly registered or existing
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  const fetchEvent = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.get(`/events/${id}`);
      setEvent(data.event);
      if (data.event.userRegistration) {
        setActiveTicket(data.event.userRegistration);
      }
    } catch (err) {
      setError(err.message || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id, user]);

  const handleCustomFieldChange = (name, value) => {
    setCustomAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (joinWaitlist = false) => {
    if (!user) {
      router.push(`/login?redirect=/events/${id}`);
      return;
    }

    // Validate required custom fields
    if (event.customFields && Array.isArray(event.customFields)) {
      for (const field of event.customFields) {
        if (field.required && !customAnswers[field.name]) {
          alert(`Please fill in required field: ${field.label || field.name}`);
          return;
        }
      }
    }

    if (event.isTeamEvent && !teamName.trim()) {
      alert('Please provide a Team Name for this team event.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const res = await api.post(`/registrations/events/${id}/register`, {
        customAnswers,
        teamName: event.isTeamEvent ? teamName.trim() : null,
        joinWaitlistIfFull: joinWaitlist
      });

      // Update state and open Ticket Modal
      setActiveTicket({
        ...res.registration,
        event
      });
      setTicketModalOpen(true);
      fetchEvent(); // Refresh seats count
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3 font-mono">
        <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-none animate-spin mx-auto" />
        <p className="text-xs text-zinc-500 uppercase tracking-widest">Loading Event Details...</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="py-24 text-center space-y-4 font-mono">
        <p className="text-sm font-semibold text-red-500 uppercase">{error}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-xs font-semibold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO EVENTS</span>
        </Link>
      </div>
    );
  }

  if (!event) return null;

  const isIeee = event.organizingBody?.type === 'IEEE';
  const seatsLeft = event.seatsLeft !== undefined ? event.seatsLeft : Math.max(0, event.seatLimit - event.seatsConfirmed);
  const isFull = seatsLeft <= 0;
  const isClosed = event.status === 'REGISTRATION_CLOSED' || event.status === 'COMPLETED' || event.status === 'CANCELLED';
  const isRegistered = Boolean(event.userRegistration);
  const feeInfo = event.applicableFeeInfo || {};

  const deadlinePassed = new Date() > new Date(event.registrationDeadline);

  return (
    <>
      <Head>
        <title>{event.title} | CEMS</title>
      </Head>

      <div className="space-y-6">
        {/* Top Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO ALL EVENTS</span>
        </Link>

        {/* Hero Banner Header */}
        <div className="relative rounded-none overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black">
          <div className="relative h-64 md:h-96 w-full">
            <img
              src={event.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'}
              alt={event.title}
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-black text-white border border-zinc-700">
                  {event.category}
                </span>

                {isIeee && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[10px] font-mono font-bold tracking-wider bg-amber-400 text-black border border-amber-500">
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span>IEEE CHAPTER EVENT</span>
                  </span>
                )}

                <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono uppercase bg-zinc-900 text-zinc-300 border border-zinc-800">
                  {event.mode} MODE
                </span>
              </div>

              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
                {event.title}
              </h1>

              <p className="text-xs font-mono text-zinc-300">
                ORGANIZED BY <span className="font-bold text-white uppercase">{event.organizingBody?.name || 'Department'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content & Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Description */}
            <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3">
              <h2 className="font-bold text-sm text-zinc-950 dark:text-white font-mono uppercase tracking-wider">
                About this Event
              </h2>
              <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line font-sans">
                {event.description}
              </p>
            </div>

            {/* Custom Registration Fields Form */}
            {!isRegistered && !isClosed && (
              <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-4">
                <h3 className="font-bold text-xs text-zinc-950 dark:text-white font-mono uppercase tracking-wider">
                  Registration Information
                </h3>

                {event.isTeamEvent && (
                  <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5 font-mono">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>TEAM EVENT SPECIFICATION</span>
                      <span className="text-zinc-500 text-[11px]">
                        SIZE: {event.minTeamSize} - {event.maxTeamSize} MEMBERS
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        TEAM NAME *
                      </label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g. CodeWarriors"
                        className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                      />
                    </div>
                  </div>
                )}

                {event.customFields && Array.isArray(event.customFields) && event.customFields.length > 0 && (
                  <div className="space-y-3 font-mono">
                    <p className="text-[11px] text-zinc-500 uppercase">
                      COMPLETE ORGANIZER QUESTIONS:
                    </p>
                    {event.customFields.map((field, idx) => (
                      <div key={idx} className="space-y-1">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase">
                          {field.label || field.name} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'select' && field.options ? (
                          <select
                            value={customAnswers[field.name] || ''}
                            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                            className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                          >
                            <option value="">SELECT OPTION</option>
                            {field.options.map((opt, i) => (
                              <option key={i} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={customAnswers[field.name] || ''}
                            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                            placeholder={`Enter ${field.label || field.name}`}
                            className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Event Key Details List */}
            <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-4">
              <h3 className="font-bold text-xs text-zinc-950 dark:text-white font-mono uppercase tracking-wider">
                Schedule & Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="flex items-start gap-3 p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <Calendar className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-zinc-950 dark:text-white block uppercase text-[10px]">Start Date & Time</span>
                    <span className="text-zinc-600 dark:text-zinc-400">{new Date(event.startDateTime).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <Clock className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-zinc-950 dark:text-white block uppercase text-[10px]">End Date & Time</span>
                    <span className="text-zinc-600 dark:text-zinc-400">{new Date(event.endDateTime).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <MapPin className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-zinc-950 dark:text-white block uppercase text-[10px]">Venue / Mode</span>
                    <span className="text-zinc-600 dark:text-zinc-400">{event.venue}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <Info className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-zinc-950 dark:text-white block uppercase text-[10px]">Eligibility</span>
                    <span className="text-zinc-600 dark:text-zinc-400">{event.eligibility || 'All Students'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3 font-mono">
              <h3 className="font-bold text-xs text-zinc-950 dark:text-white uppercase tracking-wider">Organizer Contact</h3>
              <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  {event.contactName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  {event.contactEmail}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  {event.contactPhone}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing & Registration Action Sidebar (Right col) */}
          <div className="space-y-5">
            <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-5 sticky top-24 shadow-xl">
              {/* Capacity Progress */}
              <div className="space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="uppercase text-[11px] text-zinc-500">SEAT CAPACITY</span>
                  <span>{event.seatsConfirmed} / {event.seatLimit} CONFIRMED</span>
                </div>
                <div className="w-full h-1.5 rounded-none bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${isFull ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, Math.round((event.seatsConfirmed / event.seatLimit) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                  <span>{isFull ? 'EVENT IS FULL' : `${seatsLeft} SEATS REMAINING`}</span>
                  <span>DEADLINE: {new Date(event.registrationDeadline).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Fee Breakdown Card */}
              <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5 font-mono">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                  FEE BREAKDOWN
                </span>

                {event.isFree ? (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">ENTRY FEE</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 uppercase">FREE</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                      <span>STANDARD FEE</span>
                      <span>₹{event.standardFee}</span>
                    </div>

                    {isIeee && (
                      <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="flex items-center gap-1 text-amber-500">
                          <Sparkles className="w-3 h-3" />
                          <span>IEEE RATE</span>
                        </span>
                        <span className="font-bold text-emerald-500">
                          ₹{event.ieeeFee}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-baseline justify-between">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white uppercase">YOUR AMOUNT</span>
                      <span className="text-xl font-bold text-zinc-950 dark:text-white">
                        ₹{feeInfo.applicableFee !== undefined ? feeInfo.applicableFee : event.standardFee}
                      </span>
                    </div>

                    {feeInfo.reason && (
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        {feeInfo.reason}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-none bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Primary Call to Action */}
              {isRegistered ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-none bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>YOU ARE REGISTERED FOR THIS EVENT!</span>
                  </div>
                  <button
                    onClick={() => setTicketModalOpen(true)}
                    className="w-full py-3 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>VIEW ENTRY TICKET & QR</span>
                  </button>
                </div>
              ) : isClosed || deadlinePassed ? (
                <div className="p-3.5 rounded-none bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center text-xs font-mono text-zinc-500 uppercase">
                  REGISTRATION CLOSED FOR THIS EVENT
                </div>
              ) : isFull ? (
                <button
                  onClick={() => handleRegister(true)}
                  disabled={submitting}
                  className="w-full py-3 rounded-none text-xs font-mono font-bold bg-amber-400 text-black border border-amber-500 hover:bg-amber-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>{submitting ? 'QUEUING...' : 'JOIN WAITLIST (FULL)'}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleRegister(false)}
                  disabled={submitting}
                  className="w-full py-3 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  <span>{submitting ? 'RESERVING SEAT...' : 'CONFIRM REGISTRATION'}</span>
                </button>
              )}

              <p className="text-[10px] font-mono text-zinc-500 text-center uppercase">
                ATOMIC ALLOCATION • INSTANT QR GENERATION
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {activeTicket && (
        <TicketModal
          registration={activeTicket}
          isOpen={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
        />
      )}
    </>
  );
}
