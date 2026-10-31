import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import TicketModal from '../../src/components/TicketModal';
import {
  Ticket,
  Calendar,
  MapPin,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2
} from 'lucide-react';

export default function MyRegistrationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard/registrations');
    }
  }, [user, authLoading]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const data = await api.get('/registrations/my');
      setRegistrations(data.registrations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRegistrations();
    }
  }, [user]);

  const handleCancelRegistration = async (id, title) => {
    const confirm = window.confirm(`Are you sure you want to cancel your registration for "${title}"? If cancelled, your seat will be automatically released.`);
    if (!confirm) return;

    try {
      await api.post(`/registrations/${id}/cancel`);
      alert('Registration cancelled successfully.');
      fetchRegistrations();
    } catch (err) {
      alert(err.message || 'Failed to cancel registration.');
    }
  };

  const handleDownloadPdf = async (reg) => {
    try {
      const blob = await api.download(`/registrations/${reg.id}/ticket.pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${reg.ticketCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download ticket: ' + err.message);
    }
  };

  return (
    <>
      <Head>
        <title>My Tickets & Registrations | CEMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
              My Registrations & Tickets
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              ENTRY PASSES, VERIFIED CREDENTIALS & ATTENDANCE STATUS
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono font-medium bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>DISCOVER EVENTS</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-2 font-mono">
            <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-none animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 uppercase">Loading Tickets...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-20 text-center rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3 font-mono">
            <Ticket className="w-8 h-8 text-zinc-400 mx-auto" />
            <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase">
              No Registered Events Found
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto uppercase">
              You have not registered for any upcoming workshops or hackathons yet.
            </p>
            <Link
              href="/"
              className="inline-block mt-2 px-3 py-1.5 rounded-none text-xs font-mono font-semibold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              BROWSE EVENTS
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registrations.map((reg) => {
              const event = reg.event || {};
              const isConfirmed = reg.status === 'CONFIRMED';
              const isWaitlisted = reg.status === 'WAITLISTED';
              const isCancelled = reg.status === 'CANCELLED';

              return (
                <div
                  key={reg.id}
                  className="rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-5 space-y-4 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header badge & ticket code */}
                    <div className="flex items-center justify-between gap-2 font-mono">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider border ${
                          isConfirmed
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : isWaitlisted
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        {isConfirmed && <CheckCircle2 className="w-3 h-3" />}
                        {isWaitlisted && <Clock className="w-3 h-3" />}
                        {isCancelled && <XCircle className="w-3 h-3" />}
                        <span>{reg.status}</span>
                      </span>

                      <span className="text-xs font-bold text-zinc-500">
                        {reg.ticketCode}
                      </span>
                    </div>

                    {/* Event title */}
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white line-clamp-1">
                      {event.title}
                    </h3>

                    {/* Info rows */}
                    <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{event.startDateTime ? new Date(event.startDateTime).toLocaleDateString() : 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-500 uppercase text-[10px]">Fee Applied</span>
                      <span className="font-bold text-zinc-950 dark:text-white">
                        ₹{reg.feeApplied} ({reg.feeType})
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 font-mono">
                    {isConfirmed ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedTicket(reg);
                            setTicketModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>QR TICKET</span>
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(reg)}
                          className="p-1.5 rounded-none border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                          title="Download Ticket PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-500 uppercase">
                        {isWaitlisted ? 'QUEUED FOR OPEN SEATS' : 'REGISTRATION CANCELLED'}
                      </span>
                    )}

                    {!isCancelled && (
                      <button
                        onClick={() => handleCancelRegistration(reg.id, event.title)}
                        className="p-1.5 rounded-none border border-transparent text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                        title="Cancel Registration"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      {selectedTicket && (
        <TicketModal
          registration={selectedTicket}
          isOpen={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
        />
      )}
    </>
  );
}
