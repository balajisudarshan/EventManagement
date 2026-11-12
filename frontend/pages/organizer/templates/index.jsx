import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../../src/lib/api';
import { useAuth } from '../../../src/context/AuthContext';
import {
  LayoutTemplate,
  Plus,
  Edit3,
  Trash2,
  Award,
  ArrowLeft,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function CertificateTemplatesPage() {
  const router = useRouter();
  const { user, isOrganizer, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isOrganizer)) {
      router.push('/login?redirect=/organizer/templates');
    }
  }, [user, isOrganizer, authLoading]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/certificates/templates');
      setTemplates(res.templates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isOrganizer) {
      fetchTemplates();
    }
  }, [user, isOrganizer]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete template "${name}"? Issued certificates using this template will remain verifiable.`)) {
      return;
    }
    try {
      await api.delete(`/certificates/templates/${id}`);
      fetchTemplates();
    } catch (err) {
      alert(err.message || 'Failed to delete template.');
    }
  };

  return (
    <>
      <Head>
        <title>Certificate Templates | CEMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 font-mono">
          <div>
            <Link
              href="/organizer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-black dark:hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>BACK TO ORGANIZER HUB</span>
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white uppercase flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5" />
              <span>Certificate Templates</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              VISUAL DRAG-AND-DROP TEMPLATE CREATOR FOR EVENT & CREDENTIAL ISSUANCE
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTemplates}
              className="p-2 rounded-none border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <Link
              href="/organizer/templates/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-none text-xs font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>CREATE TEMPLATE</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-zinc-500 uppercase">
            LOADING TEMPLATES...
          </div>
        ) : templates.length === 0 ? (
          <div className="py-20 text-center rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3 font-mono">
            <LayoutTemplate className="w-8 h-8 text-zinc-400 mx-auto" />
            <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase">
              No Certificate Templates Created Yet
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Design custom visual certificate layouts with dynamic placeholders, logos, signatures, and embedded QR verification codes.
            </p>
            <Link
              href="/organizer/templates/create"
              className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-none text-xs font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>OPEN TEMPLATE STUDIO</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
              >
                {/* Thumbnail Preview */}
                <div>
                  <Link
                    href={`/organizer/templates/${tpl.id}`}
                    className="block relative aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden"
                  >
                    {tpl.thumbnailUrl ? (
                      <img
                        src={tpl.thumbnailUrl}
                        alt={tpl.name}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 font-mono text-xs gap-1">
                        <LayoutTemplate className="w-6 h-6" />
                        <span>{tpl.orientation} CANVAS</span>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-black text-white border border-zinc-700 font-mono text-[10px] uppercase">
                      {tpl.orientation}
                    </span>
                  </Link>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-zinc-950 dark:text-white line-clamp-1">
                        {tpl.name}
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                        {tpl._count?.certificates || 0} ISSUED
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">
                      {tpl.description || (tpl.event ? `Linked to: ${tpl.event.title}` : 'Reusable global certificate template')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/organizer/templates/${tpl.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black hover:border-black dark:hover:border-white text-[11px] font-bold"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>EDIT</span>
                    </Link>

                    <Link
                      href={`/organizer/certificates/issue?templateId=${tpl.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[11px] font-bold hover:opacity-90"
                    >
                      <Award className="w-3 h-3" />
                      <span>ISSUE</span>
                    </Link>
                  </div>

                  <button
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    className="p-1.5 text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
                    title="Delete Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

