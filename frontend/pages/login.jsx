import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { redirect } = router.query;
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      await login(email, password);
      router.push(redirect || '/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <>
      <Head>
        <title>Sign In | CEMS</title>
      </Head>

      <div className="max-w-md mx-auto py-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-none bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs mx-auto border border-zinc-800 dark:border-zinc-200">
            ▲
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
            Sign in to CEMS
          </h1>
          <p className="text-xs text-zinc-500 font-mono">
            ACCESS EVENT TICKETS & VERIFIED CREDENTIALS
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-none bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Login Form */}
        <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                College Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@cems.edu"
                required
                className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{submitting ? 'AUTHENTICATING...' : 'SIGN IN'}</span>
            </button>
          </form>

          <div className="text-center text-xs font-mono text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            DON&apos;T HAVE AN ACCOUNT?{' '}
            <Link href="/register" className="font-bold text-zinc-950 dark:text-white hover:underline">
              REGISTER
            </Link>
          </div>
        </div>

        {/* Quick Demo Logins Helper */}
        <div className="p-4 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-2.5 text-xs font-mono">
          <span className="text-[10px] uppercase font-mono text-zinc-500 block font-bold">
            QUICK TEST CREDENTIALS (CLICK TO PREFILL):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('ieee.student@cems.edu', 'Student@123')}
              className="p-2.5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-left hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <span className="font-bold text-amber-500 block">IEEE Member</span>
              <span className="text-[10px] text-zinc-500 truncate block">ieee.student@cems.edu</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('student@cems.edu', 'Student@123')}
              className="p-2.5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-left hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <span className="font-bold text-zinc-900 dark:text-zinc-100 block">General Student</span>
              <span className="text-[10px] text-zinc-500 truncate block">student@cems.edu</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('organizer@cems.edu', 'Organizer@123')}
              className="p-2.5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-left hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <span className="font-bold text-emerald-500 block">Event Organizer</span>
              <span className="text-[10px] text-zinc-500 truncate block">organizer@cems.edu</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('approver@cems.edu', 'Approver@123')}
              className="p-2.5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-left hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <span className="font-bold text-blue-500 block">Faculty Approver</span>
              <span className="text-[10px] text-zinc-500 truncate block">approver@cems.edu</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@cems.edu', 'Admin@123')}
              className="p-2.5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-left hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors sm:col-span-2"
            >
              <span className="font-bold text-purple-500 block">System Administrator</span>
              <span className="text-[10px] text-zinc-500 truncate block">admin@cems.edu</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
