import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [year, setYear] = useState('First Year');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in required fields (Name, Email, Password).');
      return;
    }

    try {
      setSubmitting(true);
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        rollNo: rollNo.trim(),
        department,
        year,
        phone: phone.trim()
      });
      alert('Registration successful! Welcome to CEMS.');
      router.push('/');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Student Registration | CEMS</title>
      </Head>

      <div className="max-w-md mx-auto py-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-none bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs mx-auto border border-zinc-800 dark:border-zinc-200">
            ▲
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
            Create Student Account
          </h1>
          <p className="text-xs text-zinc-500 font-mono">
            ACCESS CAMPUS WORKSHOPS, HACKATHONS & IEEE EVENTS
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-none bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-5">
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-mono">
            <div>
              <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Verma"
                required
                className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">
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
              <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">
                Password (min 6 characters) *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">
                  Roll / Reg Number
                </label>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="23CS045"
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                >
                  <option value="Computer Science & Engineering">CSE</option>
                  <option value="Information Technology">IT</option>
                  <option value="Electronics & Communication">ECE</option>
                  <option value="Mechanical Engineering">MECH</option>
                  <option value="Civil Engineering">CIVIL</option>
                </select>
              </div>

              <div>
                <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">
                  Academic Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                >
                  <option value="First Year">FIRST YEAR</option>
                  <option value="Second Year">SECOND YEAR</option>
                  <option value="Third Year">THIRD YEAR</option>
                  <option value="Final Year">FINAL YEAR</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors mt-3 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{submitting ? 'CREATING ACCOUNT...' : 'REGISTER AS STUDENT'}</span>
            </button>
          </form>

          <div className="text-center text-xs font-mono text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            ALREADY HAVE AN ACCOUNT?{' '}
            <Link href="/login" className="font-bold text-zinc-950 dark:text-white hover:underline">
              SIGN IN
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
