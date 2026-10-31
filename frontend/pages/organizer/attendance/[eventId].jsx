import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../../src/lib/api';
import { useAuth } from '../../../src/context/AuthContext';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Search,
  Upload,
  ArrowLeft,
  Calendar,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function AttendanceScannerPage() {
  const router = useRouter();
  const { eventId } = router.query;
  const { user, isOrganizer, loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [manualPayload, setManualPayload] = useState('');
  const [scanResult, setScanResult] = useState(null); // { status: 'SUCCESS' | 'DUPLICATE' | 'ERROR', message, attendee }
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Bulk CSV state
  const [bulkCsvModalOpen, setBulkCsvModalOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);

  const qrScannerRef = useRef(null);

  useEffect(() => {
    if (!authLoading && (!user || !isOrganizer)) {
      router.push('/login');
    }
  }, [user, isOrganizer, authLoading]);

  const loadData = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [evRes, regsRes, statsRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/registrations/events/${eventId}`),
        api.get(`/attendance/events/${eventId}/stats`)
      ]);
      setEvent(evRes.event);
      setRegistrations(regsRes.registrations || []);
      setStats(statsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  // Camera QR scanner integration using html5-qrcode
  useEffect(() => {
    let html5QrCode = null;

    if (cameraActive) {
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        html5QrCode = new Html5Qrcode('qr-reader');
        qrScannerRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleScanPayload(decodedText);
          },
          () => {}
        ).catch((err) => {
          console.warn('Camera start error:', err);
          setScanResult({
            status: 'ERROR',
            message: 'Camera permission denied or camera device unavailable.'
          });
          setCameraActive(false);
        });
      });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
      }
    };
  }, [cameraActive]);

  const handleScanPayload = async (payload) => {
    if (scanning || !payload) return;
    setScanning(true);

    try {
      const res = await api.post(`/attendance/events/${eventId}/scan`, {
        qrPayload: payload.trim(),
        date: dateFilter
      });

      if (res.status === 'DUPLICATE') {
        setScanResult({
          status: 'DUPLICATE',
          message: res.message,
          attendee: res.attendee
        });
      } else {
        setScanResult({
          status: 'SUCCESS',
          message: res.message,
          attendee: res.attendee
        });
      }

      loadData();
    } catch (err) {
      setScanResult({
        status: 'ERROR',
        message: err.message || 'Invalid ticket code or verification failure.'
      });
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualPayload.trim()) return;
    handleScanPayload(manualPayload.trim());
    setManualPayload('');
  };

  const handleManualToggle = async (registrationId, currentAttended) => {
    try {
      await api.post(`/attendance/events/${eventId}/registrations/${registrationId}`, {
        date: dateFilter,
        attended: !currentAttended
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update attendance.');
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    const codes = bulkInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (codes.length === 0) {
      alert('Please enter at least one ticket code or roll number.');
      return;
    }

    try {
      setBulkUploading(true);
      const res = await api.post(`/attendance/events/${eventId}/bulk-upload`, {
        entries: codes,
        date: dateFilter
      });
      alert(res.message);
      setBulkCsvModalOpen(false);
      setBulkInput('');
      loadData();
    } catch (err) {
      alert(err.message || 'Bulk upload failed.');
    } finally {
      setBulkUploading(false);
    }
  };

  const filteredRegistrations = registrations.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.ticketCode?.toLowerCase().includes(s) ||
      r.user?.name?.toLowerCase().includes(s) ||
      r.user?.rollNo?.toLowerCase().includes(s) ||
      r.user?.email?.toLowerCase().includes(s)
    );
  });

  return (
    <>
      <Head>
        <title>Attendance Check-in Scanner | CEMS</title>
      </Head>

      <div className="space-y-8">
        <Link
          href="/organizer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizer Dashboard</span>
        </Link>

        {/* Top Header & Event Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Check-in Station
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {event?.title || 'Event Attendance Check-in'}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Scan participant ticket QR codes using camera or manual ticket code lookup.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkCsvModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk CSV Check-in</span>
            </button>

            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Refresh Roster"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Attendance KPIs */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] space-y-1">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Confirmed Attendees</span>
              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{stats.totalConfirmed}</p>
            </div>
            <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] space-y-1">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Present (Attended)</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalAttended}</p>
            </div>
            <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] space-y-1">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Absent</span>
              <p className="text-2xl font-black text-zinc-500">{stats.absentCount}</p>
            </div>
            <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] space-y-1">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Attendance Rate</span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.attendanceRate}</p>
            </div>
          </div>
        )}

        {/* Scanner & Manual Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Scanner & Manual Box (Left Col) */}
          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                <span>QR Code Scanner</span>
              </h3>

              <button
                onClick={() => setCameraActive(!cameraActive)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  cameraActive
                    ? 'bg-red-500 text-white'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cameraActive ? 'Stop Camera' : 'Start Camera'}</span>
              </button>
            </div>

            {/* Video preview container */}
            {cameraActive ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-black">
                <div id="qr-reader" className="w-full" />
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-2">
                <Camera className="w-8 h-8 text-zinc-400 mx-auto" />
                <p className="text-xs text-zinc-500">Camera inactive. Click &apos;Start Camera&apos; to scan ticket QR codes directly.</p>
              </div>
            )}

            {/* Manual Ticket Input */}
            <form onSubmit={handleManualSubmit} className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <div>
                <label className="block font-medium mb-1">
                  Manual Ticket Code / QR Payload Entry
                </label>
                <input
                  type="text"
                  value={manualPayload}
                  onChange={(e) => setManualPayload(e.target.value)}
                  placeholder="Paste payload or enter TKT-..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-zinc-400">Date:</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={scanning || !manualPayload.trim()}
                  className="px-4 py-2 rounded-xl font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
                >
                  {scanning ? 'Verifying...' : 'Check In'}
                </button>
              </div>
            </form>

            {/* Scan Feedback Alert */}
            {scanResult && (
              <div
                className={`p-4 rounded-2xl border animate-in fade-in duration-200 ${
                  scanResult.status === 'SUCCESS'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                    : scanResult.status === 'DUPLICATE'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {scanResult.status === 'SUCCESS' && <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />}
                  {scanResult.status === 'DUPLICATE' && <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />}
                  {scanResult.status === 'ERROR' && <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />}
                  <div className="text-xs">
                    <span className="font-bold block">
                      {scanResult.status === 'SUCCESS'
                        ? 'Check-In Confirmed'
                        : scanResult.status === 'DUPLICATE'
                        ? 'Duplicate Scan Detected (FR-9.4)'
                        : 'Verification Failed'}
                    </span>
                    <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
                      {scanResult.message}
                    </p>
                    {scanResult.attendee && (
                      <div className="mt-2 pt-2 border-t border-current/20 text-[11px] font-medium">
                        Attendee: {scanResult.attendee.name} ({scanResult.attendee.rollNo || scanResult.attendee.email})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Registrations Roster Table (Right 2 Cols) */}
          <div className="lg:col-span-2 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Attendee Roster ({filteredRegistrations.length})
                </h3>

                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, roll no, ticket..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-500 uppercase font-mono text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">Attendee</th>
                      <th className="p-3">Ticket Code</th>
                      <th className="p-3">Fee Type</th>
                      <th className="p-3">Attendance</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-zinc-500">
                          No confirmed attendees found.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((reg) => (
                        <tr key={reg.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition">
                          <td className="p-3">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                              {reg.user?.name}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              {reg.user?.rollNo || reg.user?.email}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                            {reg.ticketCode}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800">
                              {reg.feeType}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                reg.attended
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
                              }`}
                            >
                              {reg.attended ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleManualToggle(reg.id, reg.attended)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                reg.attended
                                  ? 'border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                              }`}
                            >
                              {reg.attended ? 'Mark Absent' : 'Mark Present'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Upload CSV Modal */}
        {bulkCsvModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 text-xs">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Bulk Attendance Upload
              </h3>
              <p className="text-zinc-500">
                Paste ticket codes or student roll numbers (one per line):
              </p>

              <form onSubmit={handleBulkUpload} className="space-y-3">
                <textarea
                  rows={8}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="TKT-WEB-001&#10;TKT-WEB-002&#10;22IT045"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBulkCsvModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkUploading}
                    className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    {bulkUploading ? 'Uploading...' : 'Process Attendance'}
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

