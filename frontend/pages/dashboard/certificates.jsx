import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import CertificatePreviewFrame from '../../src/components/CertificatePreviewFrame';
import {
  Award,
  Download,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Sparkles,
  Eye,
  X,
  ShieldCheck
} from 'lucide-react';

export default function MyCertificatesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewCert, setPreviewCert] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard/certificates');
    }
  }, [user, authLoading]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const data = await api.get('/certificates/my');
      setCertificates(data.certificates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

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
      alert('Failed to download certificate PDF: ' + err.message);
    }
  };

  return (
    <>
      <Head>
        <title>My Certificates | CEMS</title>
      </Head>

      <div className="space-y-6">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
            My Digital Certificates
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            VERIFIABLE CREDENTIALS ISSUED FOR WORKSHOPS, HACKATHONS, COURSES & SYMPOSIA
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-2 font-mono">
            <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-none animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 uppercase">Loading Certificates...</p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="py-20 text-center rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3 font-mono">
            <Award className="w-8 h-8 text-zinc-400 mx-auto" />
            <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase">
              No Certificates Issued Yet
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto uppercase">
              Certificates issued to your account or college email ({user?.email}) will automatically appear here.
            </p>
            <Link
              href="/"
              className="inline-block mt-2 px-3 py-1.5 rounded-none text-xs font-mono font-semibold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              EXPLORE EVENTS
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => {
              const isValid = cert.status === 'VALID';
              const event = cert.event || {};
              const hasVisualTemplate = Boolean(cert.template?.editorData?.elements);

              return (
                <div
                  key={cert.id}
                  className="rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-5 space-y-4 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 font-mono">
                      <span className="px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-black border border-amber-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>{cert.type}</span>
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-none text-[10px] font-bold uppercase border ${
                          isValid
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                        }`}
                      >
                        {cert.status}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 block uppercase">
                        CERT ID: {cert.certificateId}
                      </span>
                      <h3 className="font-bold text-sm text-zinc-950 dark:text-white mt-1">
                        {cert.eventTitle}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 font-mono text-[11px]">
                        Issued by {event.organizingBody?.name || cert.template?.name || 'CEMS Authority'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs font-mono text-zinc-500 text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>ISSUED {new Date(cert.issueDate).toLocaleDateString()}</span>
                      </span>
                      {cert.contentHash && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px]" title={`SHA-256: ${cert.contentHash}`}>
                          <ShieldCheck className="w-3 h-3" />
                          <span>HASHED</span>
                        </span>
                      )}
                    </div>

                    {!isValid && cert.revokeReason && (
                      <div className="p-2.5 rounded-none bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-600 dark:text-red-400 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>NOTICE: CERTIFICATE REVOKED ({cert.revokeReason})</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 font-mono">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadPdf(cert)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>

                      {hasVisualTemplate && (
                        <button
                          onClick={() => setPreviewCert(cert)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>PREVIEW</span>
                        </button>
                      )}
                    </div>

                    <Link
                      href={`/verify-certificate/${cert.certificateId}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                      <span>VERIFY</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Visual Certificate Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden font-mono">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase">
                  {previewCert.eventTitle}
                </h3>
                <p className="text-[10px] text-zinc-500">ID: {previewCert.certificateId}</p>
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
                title="Certificate Live Preview"
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
