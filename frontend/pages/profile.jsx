import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { api } from '../src/lib/api';
import { useAuth } from '../src/context/AuthContext';
import { User, Lock, Save, ShieldCheck, Sparkles } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUser, isIeeeVerified, loading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [phone, setPhone] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/profile');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRollNo(user.rollNo || '');
      setDepartment(user.department || '');
      setYear(user.year || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setError('');

    try {
      setSavingProfile(true);
      const res = await api.put('/auth/profile', {
        name: name.trim(),
        rollNo: rollNo.trim(),
        department: department.trim(),
        year: year.trim(),
        phone: phone.trim()
      });
      updateUser(res.user);
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    try {
      setSavingPassword(true);
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setPasswordMsg(res.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Account Profile | CEMS</title>
      </Head>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
            Account Profile & Credentials
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            MANAGE INSTITUTIONAL IDENTITY, ROLE CREDENTIALS & SECURITY
          </p>
        </div>

        {/* User Card Overview */}
        <div className="p-5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex items-center justify-between font-mono">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-base border border-zinc-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-sm text-zinc-950 dark:text-white">{user.name}</h2>
              <p className="text-[11px] text-zinc-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-none text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
              {user.role}
            </span>
            {isIeeeVerified && (
              <span className="px-2 py-0.5 rounded-none text-[10px] font-bold uppercase bg-amber-400 text-black border border-amber-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>IEEE</span>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-none bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Profile Info Form */}
        <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-4">
          <div className="flex items-center gap-2 font-mono border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <User className="w-4 h-4 text-zinc-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 dark:text-white">
              Personal & Academic Details
            </h3>
          </div>

          {profileMsg && (
            <div className="p-2.5 rounded-none bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              {profileMsg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                  College Roll / Reg No
                </label>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="py-2 px-4 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? 'SAVING...' : 'SAVE CHANGES'}</span>
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-4">
          <div className="flex items-center gap-2 font-mono border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <Lock className="w-4 h-4 text-zinc-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 dark:text-white">
              Security & Password
            </h3>
          </div>

          {passwordMsg && (
            <div className="p-2.5 rounded-none bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              {passwordMsg}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block uppercase text-[11px] mb-1.5 text-zinc-600 dark:text-zinc-400">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="py-2 px-4 rounded-none text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{savingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
