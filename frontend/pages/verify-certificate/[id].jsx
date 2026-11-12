import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../src/lib/api';
import { buildCertificatePreviewSrcDoc } from '../../src/utils/editorDataRenderer';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  ArrowLeft,
  Clock,
  ShieldX
} from 'lucide-react';

export default function VerifyCertificatePage() {
  const router = useRouter();
  const { id } = router.query;

  const [verifyRes, setVerifyRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchId, setSearchId] = useState('');

  const fetchVerification = async (certId) => {
    if (!certId || certId === 'search') {
      setLoading(false);
      setVerifyRes(null);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/certificates/verify/${encodeURIComponent(certId)}`);
      setVerifyRes(res);
    } catch (err) {
      setError(err.message || 'Verification lookup failed.');
      setVerifyRes(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchVerification(id);
      if (id !== 'search') {
        setSearchId(id);
      }
    }
  }, [id]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    router.push(`/verify-certificate/${encodeURIComponent(searchId.trim())}`);
  };

  const handleDownloadPdf = async (certId) => {
    try {
      const blob = await api.download(`/certificates/${certId}/download.pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download certificate: ' + err.message);
    }
  };

  const isSearchOnly = id === 'search';
  const cert = verifyRes?.certificate || null;
  const isValid = verifyRes?.isValid === true;
  const status = verifyRes?.status || cert?.status || 'UNKNOWN';

  return (
    <>
      <Head>
        <title>Public Certificate Verification | CEMS</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO HOME</span>
        </Link>

        {/* Search Bar Header */}
        <div className="p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-center space-y-3">
          <div className="w-8 h-8 rounded-none bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs mx-auto border border-zinc-800 dark:border-zinc-200">
            ▲
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
            Certificate Authenticity Verification
          </h1>
          <p className="text-xs text-zinc-500 font-mono">
            CRYPTOGRAPHIC AUDIT &amp; INSTITUTIONAL TAMPER-PROOF VERIFICATION
          </p>

          <form onSubmit={handleSearchSubmit} className="pt-3 max-w-lg mx-auto flex items-center gap-2">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="ENTER CERTIFICATE ID (e.g. CERT-CEMS-2026-XXXXXX)"
              className="flex-1 px-3 py-2.5 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs font-mono text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>VERIFY</span>
            </button>
          </form>
        </div>

        {/* Results Presentation */}
        {loading ? (
          <div className="py-20 text-center space-y-2 font-mono">
            <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-none animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 uppercase">Verifying Record...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-none border border-red-500/30 bg-red-500/10 text-center space-y-2 font-mono">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
            <h3 className="font-bold text-sm text-red-600 dark:text-red-400 uppercase">
              Verification Failed
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {error} ({searchId})
            </p>
          </div>
        ) : cert ? (
          <div className="rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6 md:p-8 space-y-6">
            {/* Authenticity Status Banner */}
            <div
              className={`p-4 rounded-none border flex flex-wrap items-center justify-between gap-3 font-mono ${
                isValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : status === 'EXPIRED'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              }`}
            >
              <div className="flex items-center gap-3">
                {isValid ? (
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                ) : status === 'EXPIRED' ? (
                  <Clock className="w-6 h-6 flex-shrink-0" />
                ) : (
                  <ShieldX className="w-6 h-6 flex-shrink-0" />
                )}
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider block">
                    {isValid
                      ? 'AUTHENTIC & VALID INSTITUTIONAL CREDENTIAL'
                      : status === 'EXPIRED'
                      ? 'CREDENTIAL EXPIRED'
                      : 'CREDENTIAL REVOKED — INVALID'}
                  </span>
                  <span className="text-[11px] opacity-90 block">
                    {isValid
                      ? 'Cryptographic signature and participation record verified.'
                      : cert.revokeReason
                      ? `Revocation reason: ${cert.revokeReason}`
                      : 'This certificate is no longer valid.'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDownloadPdf(cert.certificateId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono font-semibold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD PDF</span>
              </button>
            </div>

            {/* Certificate Details Grid */}
            <div className="space-y-4 font-mono">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase block">RECIPIENT NAME</span>
                  <p className="text-sm font-bold text-zinc-950 dark:text-white uppercase">{cert.recipientName}</p>
                  <p className="text-[11px] text-zinc-500">
                    {cert.recipientEmail || ''} {cert.recipientRollNo ? `• ROLL: ${cert.recipientRollNo}` : ''}
                  </p>
                </div>

                <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase block">PROGRAM / EVENT TITLE</span>
                  <p className="text-sm font-bold text-zinc-950 dark:text-white">{cert.eventTitle}</p>
                  <p className="text-[11px] text-zinc-500 uppercase">{cert.organizingBody}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase block">TYPE</span>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{cert.type}</p>
                </div>

                <div className="p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase block">ISSUE DATE</span>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {new Date(cert.issueDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase block">EXPIRES</span>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : 'NEVER'}
                  </p>
                </div>

                <div className="p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase block">CERTIFICATE ID</span>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">{cert.certificateId}</p>
                </div>
              </div>

              {cert.contentHash && (
                <div className="p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px]">
                  <span className="text-zinc-500 text-[10px] uppercase block">SHA-256 INTEGRITY HASH</span>
                  <code className="text-emerald-600 dark:text-emerald-400 break-all">{cert.contentHash}</code>
                </div>
              )}

              {/* Dynamic Credential Data Fields */}
              {cert.credentialData && Object.keys(cert.credentialData).length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">CREDENTIAL METADATA</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.entries(cert.credentialData).map(([k, v]) => (
                      <div key={k} className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                        <span className="text-[9px] uppercase text-zinc-500 block">{k}</span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{String(v || '—')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Template Live Preview */}
              {cert.template?.editorData?.elements && (
                <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                    VERIFIED CERTIFICATE RENDER PREVIEW
                  </span>
                  <iframe
                    title="Verified Certificate Preview"
                    srcDoc={buildCertificatePreviewSrcDoc(cert.template.editorData, cert)}
                    className="w-full border border-zinc-300 dark:border-zinc-800 bg-white"
                    style={{
                      height: cert.template.orientation === 'PORTRAIT' ? 680 : 540
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : isSearchOnly ? (
          <div className="p-12 text-center rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-2 font-mono">
            <ShieldCheck className="w-8 h-8 text-zinc-400 mx-auto" />
            <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase">
              Enter Certificate ID to Verify
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto uppercase">
              Verify any certificate issued by CEMS using its unique ID or QR verification link.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
