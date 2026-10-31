import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../src/lib/api';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Award,
  Calendar,
  Building2,
  Download,
  Search,
  ArrowLeft
} from 'lucide-react';

export default function VerifyCertificatePage() {
  const router = useRouter();
  const { id } = router.query;

  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchId, setSearchId] = useState('');

  const fetchVerification = async (certId) => {
    if (!certId || certId === 'search') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/certificates/verify/${certId}`);
      setCertData(res);
    } catch (err) {
      setError(err.message || 'Verification lookup failed.');
      setCertData(null);
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
    router.push(`/verify-certificate/${searchId.trim()}`);
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

  return (
    <>
      <Head>
        <title>Public Certificate Verification | CEMS</title>
      </Head>

      <div className="max-w-3xl mx-auto space-y-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO HOME</span>
        </Link>

        {/* Search Bar Header */}
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-none bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs mx-auto border border-zinc-800 dark:border-zinc-200">
            ▲
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
            Certificate Authenticity Verification
          </h1>
          <p className="text-xs text-zinc-500 font-mono">
            CRYPTOGRAPHIC AUDIT & INSTITUTIONAL TAMPER-PROOF VERIFICATION
          </p>

          <form onSubmit={handleSearchSubmit} className="pt-3 max-w-md mx-auto flex items-center gap-2">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="ENTER CERTIFICATE ID (e.g. CERT-2026-X9Y1)"
              className="flex-1 px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs font-mono text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
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
              No valid certificate was found matching ID: <span className="font-bold text-red-500">{searchId}</span>. Please verify the code on the printed certificate.
            </p>
          </div>
        ) : certData ? (
          <div className="rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6 md:p-8 space-y-6">
            {/* Authenticity Status Header */}
            <div className="p-4 rounded-none border flex items-center justify-between font-mono bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider block">
                    AUTHENTIC & VALID INSTITUTIONAL CREDENTIAL
                  </span>
                  <span className="text-[11px] opacity-90 block">
                    Cryptographic signature and participation roster verified.
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDownloadPdf(certData.certificateId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono font-semibold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>

            {/* Certificate Details Grid */}
            <div className="space-y-4 font-mono">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase block">RECIPIENT NAME</span>
                  <p className="text-sm font-bold text-zinc-950 dark:text-white uppercase">{certData.recipientName}</p>
                  <p className="text-[11px] text-zinc-500">{certData.recipientRollNo ? `ROLL: ${certData.recipientRollNo}` : ''}</p>
                </div>

                <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase block">EVENT TITLE</span>
                  <p className="text-sm font-bold text-zinc-950 dark:text-white">{certData.eventTitle}</p>
                  <p className="text-[11px] text-zinc-500 uppercase">{certData.organizingBody}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase block">TYPE</span>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{certData.type}</p>
                </div>

                <div className="p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase block">ISSUE DATE</span>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {new Date(certData.issueDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase block">STATUS</span>
                  <p className="font-bold text-emerald-500 mt-0.5">{certData.status}</p>
                </div>

                <div className="p-3 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase block">CERTIFICATE ID</span>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">{certData.certificateId}</p>
                </div>
              </div>
            </div>
          </div>
        ) : isSearchOnly ? (
          <div className="p-12 text-center rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-2 font-mono">
            <ShieldCheck className="w-8 h-8 text-zinc-400 mx-auto" />
            <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase">
              Enter Certificate ID to Verify
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto uppercase">
              You can verify any certificate issued by CEMS using the certificate number printed at the bottom or the QR code URL.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
