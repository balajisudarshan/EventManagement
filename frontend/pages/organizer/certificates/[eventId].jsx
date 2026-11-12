import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../../src/lib/api';
import { useAuth } from '../../../src/context/AuthContext';
import {
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink,
  ArrowLeft,
  Users,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  Upload
} from 'lucide-react';

export default function CertificateIssuanceHub() {
  const router = useRouter();
  const { eventId } = router.query;
  const { user, isOrganizer, loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Issuance configuration
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedType, setSelectedType] = useState('PARTICIPATION');
  const [overrideAttendance, setOverrideAttendance] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isOrganizer)) {
      router.push('/login');
    }
  }, [user, isOrganizer, authLoading]);

  const loadData = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [evRes, regsRes, tplRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/registrations/events/${eventId}`),
        api.get('/certificates/templates').catch(() => ({ templates: [] }))
      ]);
      setEvent(evRes.event);
      setRegistrations(regsRes.registrations || []);
      const tplList = tplRes.templates || [];
      setTemplates(tplList);
      if (!selectedTemplateId && tplList.length > 0) {
        const linked = tplList.find((t) => t.eventId === eventId);
        if (linked) setSelectedTemplateId(linked.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setSignatureUrl(ev.target.result);
    reader.readAsDataURL(file);

    try {
      setUploadingSignature(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'cems_signatures');
      const res = await api.upload('/upload', fd);
      if (res?.url) {
        setSignatureUrl(res.url);
      }
    } catch (err) {
      console.warn('Signature upload fallback kept:', err.message);
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleGenerateBulk = async () => {
    const confirm = window.confirm(
      `Trigger bulk certificate generation for eligible participants of "${event.title}"?`
    );
    if (!confirm) return;

    try {
      setGenerating(true);
      const res = await api.post(`/certificates/events/${eventId}/generate`, {
        templateId: selectedTemplateId || undefined,
        certificateType: selectedType,
        overrideAttendanceCheck: overrideAttendance,
        credentialData: {
          ...(signatureUrl ? { signatureUrl } : {}),
          ...(signatoryName.trim() ? { signatoryName: signatoryName.trim() } : {})
        }
      });
      alert(res.message);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to generate certificates.');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleRevoke = async (certId, currentStatus) => {
    const isRevoking = currentStatus === 'VALID';
    const reason = isRevoking ? window.prompt('Enter reason for revoking this certificate:') : null;
    if (isRevoking && reason === null) return;

    try {
      await api.patch(`/certificates/${certId}/status`, {
        action: isRevoking ? 'REVOKE' : 'REINSTATE',
        reason: reason || 'Administrative update'
      });
      alert(`Certificate has been ${isRevoking ? 'revoked' : 'reinstated'}.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update certificate.');
    }
  };

  const confirmedAttendees = registrations.filter((r) => r.status === 'CONFIRMED');
  const attendedCount = confirmedAttendees.filter((r) => r.attended).length;
  const issuedCerts = confirmedAttendees.filter((r) => r.certificate);

  return (
    <>
      <Head>
        <title>Certificate Issuance Hub | CEMS</title>
      </Head>

      <div className="space-y-8">
        <Link
          href="/organizer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizer Dashboard</span>
        </Link>

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Credentialing & Verification
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              <span>Certificate Issuance Hub</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              {event?.title || 'Event Certificate Operations'}
            </p>
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 self-start"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Attendance Rule & Bulk Issuance Card */}
        <div className="p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 space-y-1">
              <span className="text-zinc-400">Total Confirmed</span>
              <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">{confirmedAttendees.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 space-y-1">
              <span className="text-zinc-400">Attendance Marked (FR-10.2)</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{attendedCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 space-y-1">
              <span className="text-zinc-400">Certificates Issued</span>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400">{issuedCerts.length}</p>
            </div>
          </div>

          {/* Form Controls */}
          <div className="p-5 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase">
                Bulk Certificate Issuance Controls
              </h3>
              <Link
                href="/organizer/templates"
                className="text-[11px] font-bold underline text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              >
                OPEN TEMPLATE STUDIO
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium mb-1 uppercase text-[10px] text-zinc-500">Certificate Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs"
                >
                  <option value="">Default CEMS Certificate Layout</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.orientation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 uppercase text-[10px] text-zinc-500">Certificate Type to Issue *</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs"
                >
                  <option value="PARTICIPATION">Certificate of Participation</option>
                  <option value="WINNER">Certificate of Excellence (Winner)</option>
                  <option value="RUNNER_UP">Certificate of Merit (Runner-up)</option>
                  <option value="VOLUNTEER">Certificate of Appreciation (Volunteer)</option>
                  <option value="SPEAKER">Certificate of Recognition (Speaker)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  id="overrideAttendanceCheck"
                  checked={overrideAttendance}
                  onChange={(e) => setOverrideAttendance(e.target.checked)}
                  className="w-4 h-4 text-zinc-900"
                />
                <label htmlFor="overrideAttendanceCheck" className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
                  Override attendance rule
                </label>
              </div>
            </div>

            {/* Signature Upload */}
            <div className="p-3.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <label className="block text-[10px] font-bold uppercase text-zinc-700 dark:text-zinc-300">
                  AUTHORIZED SIGNATURE (DISPLAYED ON CERTIFICATE)
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="Signatory name (optional)"
                  className="w-full max-w-sm px-2.5 py-1.5 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs"
                />
              </div>

              <div className="flex items-center gap-3">
                {signatureUrl && (
                  <div className="flex items-center gap-2 border border-zinc-300 dark:border-zinc-700 bg-white p-1">
                    <img src={signatureUrl} alt="Signature" className="h-9 max-w-[120px] object-contain" />
                    <button
                      type="button"
                      onClick={() => setSignatureUrl('')}
                      className="text-[10px] text-red-500 font-bold px-1"
                    >
                      X
                    </button>
                  </div>
                )}
                <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-black dark:bg-white text-white dark:text-black font-bold text-[11px] cursor-pointer hover:opacity-90 whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingSignature ? 'UPLOADING...' : signatureUrl ? 'CHANGE SIGN' : 'UPLOAD SIGN'}</span>
                  <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <p className="text-[11px] text-zinc-500">
                Rule check: Only attendees with marked attendance will receive certificates unless overridden.
              </p>

              <button
                onClick={handleGenerateBulk}
                disabled={generating || (attendedCount === 0 && !overrideAttendance)}
                className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50 transition shadow-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generating ? 'Generating in Bulk...' : 'Generate Certificates in Bulk'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* List of Issued Certificates */}
        <div className="p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-sm space-y-4">
          <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            Participant Certificate Registry ({issuedCerts.length})
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-500 uppercase font-mono text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3">Certificate ID</th>
                  <th className="p-3">Recipient Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Issued Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {issuedCerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      No certificates issued for this event yet. Use the bulk issuance tool above.
                    </td>
                  </tr>
                ) : (
                  issuedCerts.map((reg) => {
                    const cert = reg.certificate;
                    const isValid = cert.status === 'VALID';

                    return (
                      <tr key={cert.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition">
                        <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {cert.certificateId}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold block">{cert.recipientName}</span>
                          <span className="text-[11px] text-zinc-500">{reg.user?.rollNo || reg.user?.email}</span>
                        </td>
                        <td className="p-3 font-semibold text-amber-600 dark:text-amber-400">
                          {cert.type}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isValid
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                            }`}
                          >
                            {cert.status}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-500">
                          {new Date(cert.issueDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <Link
                            href={`/verify-certificate/${cert.certificateId}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <span>Verify</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>

                          <button
                            onClick={() => handleToggleRevoke(cert.id, cert.status)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                              isValid
                                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                            }`}
                          >
                            {isValid ? 'Revoke' : 'Reinstate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

