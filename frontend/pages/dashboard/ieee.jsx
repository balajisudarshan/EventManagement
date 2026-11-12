import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import {
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  Send
} from 'lucide-react';

export default function IeeeMembershipPage() {
  const router = useRouter();
  const { user, refreshUser, loading: authLoading } = useAuth();
  const [membershipData, setMembershipData] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [membershipNumber, setMembershipNumber] = useState('');
  const [grade, setGrade] = useState('Student Member');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard/ieee');
    }
  }, [user, authLoading]);

  const fetchMembership = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ieee/my');
      setMembershipData(res.membership);
      setIsActive(res.isActive);
      if (res.membership) {
        setMembershipNumber(res.membership.membershipNumber);
        setGrade(res.membership.grade || 'Student Member');
        if (res.membership.expiryDate) {
          setExpiryDate(new Date(res.membership.expiryDate).toISOString().split('T')[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMembership();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!membershipNumber.trim() || !expiryDate) {
      setError('Please provide your IEEE membership number and expiry date.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/ieee/submit', {
        membershipNumber: membershipNumber.trim(),
        grade,
        expiryDate
      });

      setMessage(res.message || 'Membership details submitted for verification.');
      setMembershipData(res.membership);
      setIsActive(res.isActive);
      refreshUser();
    } catch (err) {
      setError(err.message || 'Failed to submit IEEE membership.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>VERIFIED</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[11px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>PENDING REVIEW</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[11px] font-mono font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>REJECTED</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[11px] font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>EXPIRED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[11px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800">
            <span>NOT SUBMITTED</span>
          </span>
        );
    }
  };

  return (
    <>
      <Head>
        <title>IEEE Membership Portal | CEMS</title>
      </Head>

      <div className="space-y-6">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
            IEEE Membership & Benefits
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            SUBMIT CREDENTIALS FOR INSTITUTIONAL CONCESSIONAL RATES & CHAPTER EVENTS
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-2 font-mono">
            <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-none animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 uppercase">Loading Membership Status...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Card (Left 1 col) */}
            <div className="space-y-4">
              <div className="p-5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">
                    MEMBERSHIP STATUS
                  </span>
                  {getStatusBadge(membershipData?.status)}
                </div>

                {membershipData ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase block">IEEE NUMBER</span>
                      <p className="font-bold text-sm text-zinc-950 dark:text-white mt-0.5">
                        {membershipData.membershipNumber}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px]">
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase block">GRADE</span>
                        <p className="text-zinc-800 dark:text-zinc-200 font-medium">{membershipData.grade}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase block">EXPIRY</span>
                        <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                          {new Date(membershipData.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <div className={`p-2.5 rounded-none border text-xs ${
                        isActive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{isActive ? 'DISCOUNT ACTIVE' : 'DISCOUNT INACTIVE'}</span>
                        </div>
                        <p className="text-[11px] mt-1 opacity-90">
                          {isActive
                            ? 'Special IEEE pricing automatically applies at event checkout.'
                            : 'Standard rates apply until verified and unexpired.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-zinc-500 font-mono text-xs">
                    <p>No IEEE membership record found on your profile.</p>
                    <p className="text-[11px] mt-1 text-zinc-400">Submit your IEEE number to apply for member pricing.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Submission Form (Right 2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-5">
                <div>
                  <h2 className="font-bold text-sm text-zinc-950 dark:text-white font-mono uppercase">
                    {membershipData ? 'Update IEEE Membership' : 'Submit IEEE Membership'}
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    COORDINATORS WILL AUDIT MEMBERSHIP DETAILS AGAINST IEEE ROSTER
                  </p>
                </div>

                {message && (
                  <div className="p-3 rounded-none bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    {message}
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-none bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                      IEEE Membership Number (8-9 digits) *
                    </label>
                    <input
                      type="text"
                      value={membershipNumber}
                      onChange={(e) => setMembershipNumber(e.target.value)}
                      placeholder="Enter your IEEE membership number"
                      required
                      className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                        Member Grade
                      </label>
                      <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                      >
                        <option value="Student Member">Student Member</option>
                        <option value="Graduate Student Member">Graduate Student Member</option>
                        <option value="Professional Member">Professional Member</option>
                        <option value="Senior Member">Senior Member</option>
                      </select>
                    </div>

                    <div>
                      <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                        Membership Expiry Date *
                      </label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-2.5 px-5 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'SUBMITTING...' : 'SUBMIT FOR VERIFICATION'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
