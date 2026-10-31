import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function ApproverPage() {
  const router = useRouter();
  const { user, isApprover, loading: authLoading } = useAuth();
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || !isApprover)) {
      router.push('/login?redirect=/approver');
    }
  }, [user, isApprover, authLoading]);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events/approver/pending');
      setPendingEvents(res.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isApprover) {
      fetchPending();
    }
  }, [user, isApprover]);

  const handleReview = async (id, action) => {
    let rejectionReason = null;
    if (action === 'REJECT') {
      rejectionReason = window.prompt('Enter revision remarks / reason for rejection:');
      if (rejectionReason === null) return;
    }

    try {
      setProcessingId(id);
      const res = await api.post(`/events/${id}/review`, {
        action,
        rejectionReason
      });
      alert(res.message);
      fetchPending();
    } catch (err) {
      alert(err.message || 'Failed to process event review.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Approver Portal | CEMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
              Event Proposal Approvals
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              FACULTY & ADMINISTRATIVE AUDIT BEFORE PUBLIC DISCOVERY & ENROLLMENT
            </p>
          </div>

          <button
            onClick={fetchPending}
            className="p-1.5 rounded-none border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-600 self-start transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-2 font-mono">
            <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-none animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 uppercase">Loading Pending Proposals...</p>
          </div>
        ) : pendingEvents.length === 0 ? (
          <div className="py-20 text-center rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3 font-mono">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase">
              All Proposals Reviewed
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto uppercase">
              There are no pending event proposals waiting for administrative authorization.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingEvents.map((ev) => {
              const isIeee = ev.organizingBody?.type === 'IEEE';

              return (
                <div
                  key={ev.id}
                  className="rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6 space-y-4 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 font-mono">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-none text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                          {ev.category}
                        </span>

                        <span className="px-2 py-0.5 rounded-none text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          PENDING APPROVAL
                        </span>

                        {isIeee && (
                          <span className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-amber-400 text-black border border-amber-500 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>IEEE EVENT</span>
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-zinc-950 dark:text-white font-sans">
                        {ev.title}
                      </h2>

                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
                        {ev.description}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-zinc-500">
                        <div>
                          <span className="text-[10px] uppercase text-zinc-400 block">BODY</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{ev.organizingBody?.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-zinc-400 block">CAPACITY</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{ev.seatLimit} seats</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-zinc-400 block">FEES</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {ev.isFree ? 'Free' : `Std: ₹${ev.standardFee}${isIeee ? ` | IEEE: ₹${ev.ieeeFee}` : ''}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-zinc-400 block">DATE</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {new Date(ev.startDateTime).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Review Actions */}
                    <div className="flex md:flex-col items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleReview(ev.id, 'APPROVE')}
                        disabled={processingId === ev.id}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-none text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>APPROVE & PUBLISH</span>
                      </button>

                      <button
                        onClick={() => handleReview(ev.id, 'REJECT')}
                        disabled={processingId === ev.id}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-none text-xs font-bold border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>REQUEST REVISION</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
