import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import BrandLogo from '../src/components/BrandLogo';
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

  return (
    <>
      <Head>
        <title>Sign In | CEMS</title>
      </Head>

      <div className="max-w-md mx-auto py-12 space-y-6">
        <div className="text-center space-y-2.5">
          <BrandLogo size="lg" className="mx-auto" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
            Sign in to CEMS
          </h1>
          <p className="text-xs text-zinc-500 font-mono">
            ACCESS EVENT TICKETS &amp; VERIFIED CREDENTIALS
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
                placeholder="Enter your college email"
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
                placeholder="Enter your password"
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
      </div>
    </>
  );
}
