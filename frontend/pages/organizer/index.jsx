import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import {
  LayoutDashboard,
  Plus,
  Calendar,
  QrCode,
  Award,
  Download,
  Megaphone
} from 'lucide-react';

export default function OrganizerDashboard() {
  const router = useRouter();
  const { user, isOrganizer, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Announcement modal state
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcing, setAnnouncing] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isOrganizer)) {
      router.push('/login?redirect=/organizer');
    }
  }, [user, isOrganizer, authLoading]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await api.get('/events/organizer/my-events');
      setEvents(data.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isOrganizer) {
      fetchEvents();
    }
  }, [user, isOrganizer]);

  const handleExportCsv = async (eventId, title) => {
    try {
      const blob = await api.download(`/reports/events/${eventId}/export.csv`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations-${eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export registrations CSV: ' + err.message);
    }
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementTitle || !announcementMessage || !selectedEventId) return;

    try {
      setAnnouncing(true);
      const res = await api.post(`/notifications/events/${selectedEventId}/announce`, {
        title: announcementTitle,
        message: announcementMessage
      });
      alert(res.message || 'Announcement broadcast successfully.');
      setAnnouncementModalOpen(false);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
    } catch (err) {
      alert(err.message || 'Failed to send announcement.');
    } finally {
      setAnnouncing(false);
    }
  };

  const handleCloseRegistrations = async (eventId) => {
    if (!window.confirm('Are you sure you want to close registrations for this event?')) return;
    try {
      await api.post(`/events/${eventId}/close-registrations`);
      alert('Registrations closed.');
      fetchEvents();
    } catch (err) {
      alert(err.message || 'Failed to close registrations.');
    }
  };

  const handleCancelEvent = async (eventId) => {
    const reason = window.prompt('Enter reason for cancelling this event (all registrants will be notified):');
    if (reason === null) return;
    try {
      await api.post(`/events/${eventId}/cancel`, { reason });
      alert('Event cancelled and registrants notified.');
      fetchEvents();
    } catch (err) {
      alert(err.message || 'Failed to cancel event.');
    }
  };

  return (
    <>
      <Head>
        <title>Organizer Portal | CEMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
              Organizer Operations Hub
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              ROSTER MANAGEMENT, ATTENDANCE AUDIT, CSV EXPORT & CERTIFICATE ISSUANCE
            </p>
          </div>

          <Link
            href="/organizer/events/create"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>CREATE EVENT PROPOSAL</span>
          </Link>
        </div>

        {/* Managed Events List */}
        {loading ? (
          <div className="py-20 text-center space-y-2 font-mono">
            <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-none animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 uppercase">Loading Managed Events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3 font-mono">
            <Calendar className="w-8 h-8 text-zinc-400 mx-auto" />
            <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase">
              No Events Found
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto uppercase">
              You haven&apos;t created any events yet for your assigned organizing bodies.
            </p>
            <Link
              href="/organizer/events/create"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono font-semibold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>CREATE EVENT PROPOSAL</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => {
              const isIeee = ev.organizingBody?.type === 'IEEE';

              return (
                <div
                  key={ev.id}
                  className="rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-5 space-y-4 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-none text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                          {ev.category}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-none text-[10px] font-bold uppercase border ${
                            ev.status === 'PUBLISHED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : ev.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : ev.status === 'COMPLETED'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          {ev.status}
                        </span>

                        {isIeee && (
                          <span className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-amber-400 text-black border border-amber-500">
                            IEEE BODY
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-zinc-950 dark:text-white font-sans">
                        {ev.title}
                      </h2>

                      <p className="text-xs text-zinc-500">
                        {ev.organizingBody?.name} • START: {new Date(ev.startDateTime).toLocaleString()} • VENUE: {ev.venue}
                      </p>
                    </div>

                    {/* Quick KPI stats */}
                    <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-none border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
                      <div className="text-center">
                        <span className="text-[10px] text-zinc-500 uppercase block">Confirmed</span>
                        <span className="text-sm font-bold text-zinc-950 dark:text-white">
                          {ev.seatsConfirmed} / {ev.seatLimit}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-zinc-200 dark:border-zinc-800" />
                      <div className="text-center">
                        <span className="text-[10px] text-zinc-500 uppercase block">Attended</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {ev._count?.attendances || 0}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-zinc-200 dark:border-zinc-800" />
                      <div className="text-center">
                        <span className="text-[10px] text-zinc-500 uppercase block">Certs</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {ev._count?.certificates || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/organizer/attendance/${ev.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>ATTENDANCE SCANNER</span>
                      </Link>

                      <Link
                        href={`/organizer/certificates/${ev.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none font-bold bg-amber-400 hover:bg-amber-300 text-black border border-amber-500 transition-colors"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>CERTIFICATE HUB</span>
                      </Link>

                      <button
                        onClick={() => handleExportCsv(ev.id, ev.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none font-semibold border border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>EXPORT CSV</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          setAnnouncementModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none font-semibold border border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>BROADCAST</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {ev.status === 'PUBLISHED' && (
                        <button
                          onClick={() => handleCloseRegistrations(ev.id)}
                          className="px-2.5 py-1 rounded-none border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                        >
                          CLOSE REG
                        </button>
                      )}

                      {ev.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancelEvent(ev.id)}
                          className="px-2.5 py-1 rounded-none border border-transparent text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                        >
                          CANCEL EVENT
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Announcement Modal */}
        {announcementModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-none bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 font-mono">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase">
                Broadcast Announcement to Registrants
              </h3>
              <p className="text-xs text-zinc-500 uppercase">
                DELIVERS AN INSTANT IN-APP NOTIFICATION TO ALL CONFIRMED ATTENDEES
              </p>

              <form onSubmit={handleSendAnnouncement} className="space-y-3 text-xs">
                <div>
                  <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">Title *</label>
                  <input
                    type="text"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="e.g. Workshop Room Relocated"
                    required
                    className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">Message *</label>
                  <textarea
                    rows={4}
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="Enter instructions, schedule updates, or lab materials..."
                    required
                    className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnouncementModalOpen(false)}
                    className="px-3 py-1.5 rounded-none text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={announcing}
                    className="px-3.5 py-1.5 rounded-none bg-black dark:bg-white text-white dark:text-black font-bold border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                  >
                    {announcing ? 'SENDING...' : 'BROADCAST'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
