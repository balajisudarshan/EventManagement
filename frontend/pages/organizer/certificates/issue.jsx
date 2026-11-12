import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../../src/lib/api';
import { useAuth } from '../../../src/context/AuthContext';
import CertificatePreviewFrame from '../../../src/components/CertificatePreviewFrame';
import {
  Award,
  Plus,
  Trash2,
  Upload,
  Download,
  Search,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  LayoutTemplate,
  UserPlus,
  Eye,
  X,
  Send
} from 'lucide-react';

function makeEmptyRow(schemaFields = []) {
  const row = { recipientName: '', recipientEmail: '', expiresAt: '' };
  schemaFields.forEach((f) => {
    row[f.key] = '';
  });
  return row;
}

export default function DirectCertificateIssuancePage() {
  const router = useRouter();
  const { templateId: queryTemplateId } = router.query;
  const { user, isOrganizer, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('issue'); // 'issue' | 'registry'
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState([]);
  const [issuedList, setIssuedList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Issuance form state
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [customEventTitle, setCustomEventTitle] = useState('');
  const [certificateType, setCertificateType] = useState('PARTICIPATION');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [rows, setRows] = useState([makeEmptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [issueMsg, setIssueMsg] = useState('');
  const [issueErr, setIssueErr] = useState('');

  // Registered user search autocomplete
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);

  // Registry filters & preview
  const [registrySearch, setRegistrySearch] = useState('');
  const [previewCert, setPreviewCert] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && (!user || !isOrganizer)) {
      router.push('/login?redirect=/organizer/certificates/issue');
    }
  }, [user, isOrganizer, authLoading]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [tplRes, evRes, certRes] = await Promise.all([
        api.get('/certificates/templates'),
        api.get('/events/organizer/my-events').catch(() => ({ events: [] })),
        api.get(`/certificates/issued?search=${encodeURIComponent(registrySearch)}`)
      ]);
      const tpls = tplRes.templates || [];
      setTemplates(tpls);
      setEvents(evRes.events || []);
      setIssuedList(certRes.certificates || []);

      if (queryTemplateId && tpls.some((t) => t.id === queryTemplateId)) {
        setSelectedTemplateId(queryTemplateId);
      } else if (!selectedTemplateId && tpls.length > 0) {
        setSelectedTemplateId(tpls[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isOrganizer) {
      loadAll();
    }
  }, [user, isOrganizer, queryTemplateId]);

  useEffect(() => {
    if (!user || !isOrganizer) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/certificates/issued?search=${encodeURIComponent(registrySearch)}`);
        setIssuedList(res.certificates || []);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [registrySearch]);

  useEffect(() => {
    if (!studentQuery.trim()) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingStudents(true);
        const res = await api.get(`/certificates/recipients/search?q=${encodeURIComponent(studentQuery)}`);
        setStudentResults(res.users || []);
      } catch {
        setStudentResults([]);
      } finally {
        setSearchingStudents(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [studentQuery]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || null;
  const schemaFields = Array.isArray(selectedTemplate?.schemaDefinition)
    ? selectedTemplate.schemaDefinition
    : [];

  const handleTemplateSelect = (id) => {
    setSelectedTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    const fields = Array.isArray(tpl?.schemaDefinition) ? tpl.schemaDefinition : [];
    setRows((prev) =>
      prev.map((r) => {
        const next = { ...r };
        fields.forEach((f) => {
          if (next[f.key] === undefined) next[f.key] = '';
        });
        return next;
      })
    );
  };

  const addStudentRow = (stu) => {
    const newRow = {
      ...makeEmptyRow(schemaFields),
      userId: stu.id,
      recipientName: stu.name,
      recipientEmail: stu.email
    };
    setRows((prev) => {
      const onlyEmpty =
        prev.length === 1 && !prev[0].recipientName.trim() && !prev[0].recipientEmail.trim();
      return onlyEmpty ? [newRow] : [...prev, newRow];
    });
    setStudentQuery('');
    setStudentResults([]);
  };

  const addBlankRow = () => setRows((prev) => [...prev, makeEmptyRow(schemaFields)]);
  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));
  const updateCell = (idx, key, val) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = String(ev.target.result || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        alert('CSV must contain a header row and at least one recipient row.');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const parsed = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const row = makeEmptyRow(schemaFields);
        headers.forEach((h, i) => {
          if (h === 'name' || h === 'recipientname' || h === 'recipient_name') row.recipientName = cols[i] || '';
          else if (h === 'email' || h === 'recipientemail' || h === 'recipient_email') row.recipientEmail = cols[i] || '';
          else {
            const match = schemaFields.find(
              (f) => f.key.toLowerCase() === h || (f.label && f.label.toLowerCase() === h)
            );
            if (match) row[match.key] = cols[i] || '';
          }
        });
        return row;
      });
      setRows((prev) => {
        const onlyEmpty =
          prev.length === 1 && !prev[0].recipientName.trim() && !prev[0].recipientEmail.trim();
        return onlyEmpty ? parsed : [...prev, ...parsed];
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadCsvSample = () => {
    const headers = ['recipientName', 'recipientEmail', ...schemaFields.map((f) => f.key)].join(',');
    const sample = ['Recipient Name', 'recipient@college.edu', ...schemaFields.map((f) => f.label || f.key)].join(',');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(`${headers}\n${sample}\n`);
    a.download = `${selectedTemplate?.name || 'certificates'}-recipients.csv`;
    a.click();
  };

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

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setIssueErr('');
    setIssueMsg('');

    if (!selectedTemplateId) {
      setIssueErr('Please select a certificate template first.');
      return;
    }

    const validRecipients = rows.filter((r) => r.recipientName?.trim());
    if (validRecipients.length === 0) {
      setIssueErr('Please add at least one recipient with a name.');
      return;
    }

    const linkedEvent = events.find((ev) => ev.id === selectedEventId);
    const effectiveTitle = customEventTitle.trim() || linkedEvent?.title || selectedTemplate?.name || 'Certificate';

    try {
      setSubmitting(true);
      const res = await api.post('/certificates/issue', {
        templateId: selectedTemplateId,
        eventId: selectedEventId || null,
        eventTitle: effectiveTitle,
        certificateType,
        recipients: validRecipients.map((r) => ({
          userId: r.userId || null,
          recipientName: r.recipientName.trim(),
          recipientEmail: r.recipientEmail?.trim() || null,
          expiresAt: r.expiresAt || null,
          credentialData: {
            ...Object.fromEntries(schemaFields.map((f) => [f.key, r[f.key] ?? ''])),
            ...(signatureUrl ? { signatureUrl } : {}),
            ...(signatoryName.trim() ? { signatoryName: signatoryName.trim() } : {})
          }
        }))
      });

      setIssueMsg(
        `${res.message} Certificates linked to registered emails are now visible in each recipient's "My Certificates" page.`
      );
      setRows([makeEmptyRow(schemaFields)]);
      loadAll();
    } catch (err) {
      setIssueErr(err.message || 'Failed to issue certificates.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRevoke = async (cert) => {
    const isRevoking = cert.status === 'VALID';
    const reason = isRevoking ? window.prompt('Enter revocation reason:') : null;
    if (isRevoking && reason === null) return;
    try {
      await api.patch(`/certificates/${cert.id}/status`, {
        action: isRevoking ? 'REVOKE' : 'REINSTATE',
        reason: reason || 'Administrative action'
      });
      loadAll();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleDownloadPdf = async (cert) => {
    try {
      const blob = await api.download(`/certificates/${cert.id}/download.pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.certificateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF: ' + err.message);
    }
  };

  return (
    <>
      <Head>
        <title>Issue & Manage Certificates | CEMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 font-mono">
          <div>
            <Link
              href="/organizer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-black dark:hover:text-white mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>BACK TO ORGANIZER HUB</span>
            </Link>
            <h1 className="text-xl font-bold text-zinc-950 dark:text-white uppercase flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Certificate Issuance & Verification Center</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              ISSUE VERIFIABLE TEMPLATE CERTIFICATES DIRECTLY TO PARTICIPANTS OR IN BULK VIA CSV
            </p>
          </div>

          <Link
            href="/organizer/templates"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-none text-xs font-bold border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black hover:border-black dark:hover:border-white"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>TEMPLATE STUDIO</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('issue')}
            className={`px-4 py-2 border-b-2 -mb-[1px] uppercase ${
              activeTab === 'issue'
                ? 'border-black dark:border-white text-black dark:text-white font-bold bg-zinc-100 dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-black dark:hover:text-white'
            }`}
          >
            ISSUE NEW CERTIFICATES
          </button>
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-2 border-b-2 -mb-[1px] uppercase ${
              activeTab === 'registry'
                ? 'border-black dark:border-white text-black dark:text-white font-bold bg-zinc-100 dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-black dark:hover:text-white'
            }`}
          >
            ISSUED REGISTRY ({issuedList.length})
          </button>
        </div>

        {/* TAB 1: ISSUE CERTIFICATES */}
        {activeTab === 'issue' && (
          <form onSubmit={handleIssueSubmit} className="space-y-6 font-mono text-xs">
            {issueMsg && (
              <div className="p-3.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{issueMsg}</span>
              </div>
            )}
            {issueErr && (
              <div className="p-3.5 border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400">
                {issueErr}
              </div>
            )}

            {/* Step 1: Select Template & Metadata */}
            <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <span className="font-bold uppercase text-zinc-950 dark:text-white">
                  1. SELECT CERTIFICATE TEMPLATE & DETAILS
                </span>
                <Link href="/organizer/templates/create" className="text-[11px] underline text-zinc-500 hover:text-black dark:hover:text-white">
                  + NEW TEMPLATE
                </Link>
              </div>

              {templates.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-zinc-300 dark:border-zinc-800 space-y-2">
                  <p className="text-zinc-500">No templates found. Create a certificate template first.</p>
                  <Link
                    href="/organizer/templates/create"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>CREATE TEMPLATE</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {templates.map((tpl) => {
                    const selected = tpl.id === selectedTemplateId;
                    return (
                      <button
                        type="button"
                        key={tpl.id}
                        onClick={() => handleTemplateSelect(tpl.id)}
                        className={`text-left border p-2.5 transition-colors ${
                          selected
                            ? 'border-black dark:border-white bg-zinc-100 dark:bg-zinc-900'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                        }`}
                      >
                        <div className="aspect-[16/10] bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 mb-2 overflow-hidden flex items-center justify-center">
                          {tpl.thumbnailUrl ? (
                            <img src={tpl.thumbnailUrl} alt={tpl.name} className="w-full h-full object-contain" />
                          ) : (
                            <LayoutTemplate className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>
                        <p className="font-bold text-zinc-950 dark:text-white truncate">{tpl.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">{tpl.orientation}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] uppercase text-zinc-500 mb-1">CERTIFICATE TYPE</label>
                  <select
                    value={certificateType}
                    onChange={(e) => setCertificateType(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800"
                  >
                    <option value="PARTICIPATION">PARTICIPATION</option>
                    <option value="WINNER">WINNER</option>
                    <option value="RUNNER_UP">RUNNER-UP</option>
                    <option value="VOLUNTEER">VOLUNTEER</option>
                    <option value="SPEAKER">SPEAKER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-zinc-500 mb-1">LINKED EVENT (OPTIONAL)</label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800"
                  >
                    <option value="">STANDALONE / NO SPECIFIC EVENT</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-zinc-500 mb-1">PROGRAM / EVENT TITLE</label>
                  <input
                    type="text"
                    value={customEventTitle}
                    onChange={(e) => setCustomEventTitle(e.target.value)}
                    placeholder={selectedTemplate?.name || 'Enter program or event title'}
                    className="w-full px-3 py-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800"
                  />
                </div>
              </div>

              {/* Signature Upload for Certificate */}
              <div className="p-3.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <label className="block text-[10px] font-bold uppercase text-zinc-700 dark:text-zinc-300">
                    AUTHORIZED SIGNATURE (DISPLAYED ON CERTIFICATE)
                  </label>
                  <p className="text-[10px] text-zinc-500">
                    Upload a PNG/JPG signature image to display on all certificates issued in this batch (or leave blank to use template signature).
                  </p>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Signatory name (optional)"
                    className="w-full max-w-sm mt-1 px-2.5 py-1.5 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {signatureUrl && (
                    <div className="flex items-center gap-2 border border-zinc-300 dark:border-zinc-700 bg-white p-1.5">
                      <img src={signatureUrl} alt="Uploaded Sign" className="h-10 max-w-[130px] object-contain" />
                      <button
                        type="button"
                        onClick={() => setSignatureUrl('')}
                        className="text-[10px] text-red-500 font-bold hover:underline px-1"
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
            </div>

            {/* Step 2: Recipients Builder */}
            <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <span className="font-bold uppercase text-zinc-950 dark:text-white">
                  2. ADD RECIPIENTS ({rows.length})
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                  />
                  <button
                    type="button"
                    onClick={downloadCsvSample}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white text-[10px] font-bold"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV TEMPLATE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white text-[10px] font-bold"
                  >
                    <Upload className="w-3 h-3" />
                    <span>IMPORT CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={addBlankRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>ADD ROW</span>
                  </button>
                </div>
              </div>

              {/* Search Registered Students to Auto-Add */}
              <div className="relative max-w-lg">
                <div className="flex items-center gap-2 border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2">
                  <UserPlus className="w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="Search registered student by name, email, or roll no to auto-link..."
                    className="flex-1 bg-transparent text-xs focus:outline-none"
                  />
                </div>
                {studentResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-30 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black shadow-xl max-h-56 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800">
                    {studentResults.map((stu) => (
                      <button
                        type="button"
                        key={stu.id}
                        onClick={() => addStudentRow(stu)}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-zinc-950 dark:text-white">{stu.name}</p>
                          <p className="text-[10px] text-zinc-500">
                            {stu.email} {stu.rollNo ? `• ${stu.rollNo}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-500">+ ADD</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Spreadsheet Table */}
              <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-2.5 w-8">#</th>
                      <th className="p-2.5">Recipient Name *</th>
                      <th className="p-2.5">Recipient Email (links to My Certificates)</th>
                      {schemaFields.map((f) => (
                        <th key={f.key} className="p-2.5">
                          {f.label || f.key}
                        </th>
                      ))}
                      <th className="p-2.5">Expiry (Optional)</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-zinc-400">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.recipientName}
                            onChange={(e) => updateCell(idx, 'recipientName', e.target.value)}
                            placeholder="Full Name"
                            required
                            className="w-full px-2 py-1.5 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="email"
                            value={row.recipientEmail}
                            onChange={(e) => updateCell(idx, 'recipientEmail', e.target.value)}
                            placeholder="Recipient email"
                            className="w-full px-2 py-1.5 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800"
                          />
                        </td>
                        {schemaFields.map((f) => (
                          <td key={f.key} className="p-2">
                            <input
                              type="text"
                              value={row[f.key] || ''}
                              onChange={(e) => updateCell(idx, f.key, e.target.value)}
                              placeholder={f.label || f.key}
                              className="w-full px-2 py-1.5 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800"
                            />
                          </td>
                        ))}
                        <td className="p-2">
                          <input
                            type="date"
                            value={row.expiresAt || ''}
                            onChange={(e) => updateCell(idx, 'expiresAt', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800"
                          />
                        </td>
                        <td className="p-2 text-right">
                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="p-1 text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-zinc-500">
                  MATCHED STUDENT EMAILS RECEIVE AN IN-APP NOTIFICATION & SEE CERTIFICATES IN THEIR DASHBOARD IMMEDIATELY.
                </p>
                <button
                  type="submit"
                  disabled={submitting || !selectedTemplateId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'ISSUING...' : `ISSUE ${rows.length} CERTIFICATE${rows.length > 1 ? 'S' : ''}`}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: ISSUED REGISTRY */}
        {activeTab === 'registry' && (
          <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={registrySearch}
                  onChange={(e) => setRegistrySearch(e.target.value)}
                  placeholder="SEARCH BY CERT ID, NAME, EMAIL..."
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Certificate ID</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Program / Event</th>
                    <th className="p-3">Template</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px]">
                  {issuedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-zinc-500">
                        NO CERTIFICATES FOUND.
                      </td>
                    </tr>
                  ) : (
                    issuedList.map((cert) => {
                      const isValid = cert.status === 'VALID';
                      return (
                        <tr key={cert.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950">
                          <td className="p-3 font-bold text-zinc-950 dark:text-white">{cert.certificateId}</td>
                          <td className="p-3">
                            <span className="font-bold block text-zinc-900 dark:text-zinc-100">{cert.recipientName}</span>
                            <span className="text-[10px] text-zinc-500">{cert.recipientEmail || cert.user?.email || 'No email'}</span>
                          </td>
                          <td className="p-3 text-zinc-600 dark:text-zinc-400">{cert.eventTitle}</td>
                          <td className="p-3 text-zinc-500">{cert.template?.name || 'Default'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 border text-[10px] font-bold ${
                                isValid
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                              }`}
                            >
                              {cert.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2 whitespace-nowrap">
                            {cert.template?.editorData?.elements && (
                              <button
                                onClick={() => setPreviewCert(cert)}
                                className="inline-flex items-center gap-1 px-2 py-1 border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white text-[10px] font-bold"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                <span>PREVIEW</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadPdf(cert)}
                              className="px-2 py-1 border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white text-[10px] font-bold"
                            >
                              PDF
                            </button>
                            <Link
                              href={`/verify-certificate/${cert.certificateId}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2 py-1 border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white text-[10px] font-bold"
                            >
                              <span>VERIFY</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                            <button
                              onClick={() => handleToggleRevoke(cert)}
                              className={`px-2 py-1 border text-[10px] font-bold ${
                                isValid
                                  ? 'border-red-500/30 text-red-500 hover:bg-red-500/10'
                                  : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                              }`}
                            >
                              {isValid ? 'REVOKE' : 'REINSTATE'}
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
        )}
      </div>

      {/* Live Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden font-mono">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase">
                  {previewCert.recipientName} — {previewCert.eventTitle}
                </h3>
                <p className="text-[10px] text-zinc-500">CERT ID: {previewCert.certificateId}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(previewCert)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD PDF</span>
                </button>
                <button
                  onClick={() => setPreviewCert(null)}
                  className="p-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-black dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-zinc-100 dark:bg-zinc-950 flex justify-center">
              <CertificatePreviewFrame
                title="Issued Certificate Preview"
                editorData={previewCert.template.editorData}
                cert={previewCert}
                height={previewCert.template.orientation === 'PORTRAIT' ? 680 : 540}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

