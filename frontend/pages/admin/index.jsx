import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import {
  Settings,
  Users,
  ShieldCheck,
  Building2,
  FileText,
  BarChart3,
  Plus,
  Search,
  Upload,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'users', 'bodies', 'ieee', 'audit'

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [bodiesList, setBodiesList] = useState([]);
  const [ieeeList, setIeeeList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userIeeeFilter, setUserIeeeFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Status Banner
  const [statusMessage, setStatusMessage] = useState('');
  const [statusError, setStatusError] = useState('');

  // Promote User Modal
  const [promoteModalUser, setPromoteModalUser] = useState(null);
  const [promoteRole, setPromoteRole] = useState('STUDENT');
  const [promoteIeee, setPromoteIeee] = useState('NONE'); // 'VERIFIED' | 'NONE'
  const [promoteIeeeNumber, setPromoteIeeeNumber] = useState('');
  const [promoteIeeeExpiry, setPromoteIeeeExpiry] = useState('');
  const [promoteBodyId, setPromoteBodyId] = useState('');
  const [promoting, setPromoting] = useState(false);

  // Modals
  const [createBodyModalOpen, setCreateBodyModalOpen] = useState(false);
  const [newBodyName, setNewBodyName] = useState('');
  const [newBodyType, setNewBodyType] = useState('GENERAL');
  const [newBodyDesc, setNewBodyDesc] = useState('');

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetBodyId, setTargetBodyId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  // Bulk IEEE CSV state
  const [bulkCsvModalOpen, setBulkCsvModalOpen] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/login?redirect=/admin');
    }
  }, [user, isAdmin, authLoading]);

  const loadData = async () => {
    if (!user || !isAdmin) return;
    try {
      setLoading(true);
      if (activeTab === 'analytics') {
        const res = await api.get('/reports/admin/analytics');
        setAnalytics(res);
      } else if (activeTab === 'users') {
        const params = new URLSearchParams();
        if (userSearch) params.append('search', userSearch);
        if (userRoleFilter) params.append('role', userRoleFilter);
        const [usersRes, bodiesRes] = await Promise.all([
          api.get(`/auth/users?${params.toString()}`),
          api.get('/bodies').catch(() => ({ bodies: [] }))
        ]);
        setUsersList(usersRes.users || []);
        setBodiesList(bodiesRes.bodies || []);
      } else if (activeTab === 'bodies') {
        const res = await api.get('/bodies');
        setBodiesList(res.bodies || []);
      } else if (activeTab === 'ieee') {
        const res = await api.get('/ieee');
        setIeeeList(res.memberships || []);
      } else if (activeTab === 'audit') {
        const params = new URLSearchParams();
        if (auditSearch) params.append('search', auditSearch);
        const res = await api.get(`/reports/admin/audit-logs?${params.toString()}`);
        setAuditLogs(res.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, userSearch, userRoleFilter, auditSearch, isAdmin]);

  const openPromoteModal = (u) => {
    setStatusError('');
    setPromoteModalUser(u);
    setPromoteRole(u.role || 'STUDENT');
    const isIeee = u.ieeeMembership?.status === 'VERIFIED';
    setPromoteIeee(isIeee ? 'VERIFIED' : 'NONE');
    setPromoteIeeeNumber(u.ieeeMembership?.membershipNumber || '');
    const defaultExp = new Date();
    defaultExp.setFullYear(defaultExp.getFullYear() + 1);
    setPromoteIeeeExpiry(
      u.ieeeMembership?.expiryDate
        ? new Date(u.ieeeMembership.expiryDate).toISOString().split('T')[0]
        : defaultExp.toISOString().split('T')[0]
    );
    setPromoteBodyId('');
  };

  const applyPreset = (preset) => {
    if (preset === 'NORMAL') {
      setPromoteRole('STUDENT');
      setPromoteIeee('NONE');
    } else if (preset === 'IEEE') {
      setPromoteRole('STUDENT');
      setPromoteIeee('VERIFIED');
    } else if (preset === 'ORGANIZER') {
      setPromoteRole('ORGANIZER');
    } else if (preset === 'APPROVER') {
      setPromoteRole('APPROVER');
    } else if (preset === 'ADMIN') {
      setPromoteRole('ADMIN');
    }
  };

  const handleQuickPromoteToIeee = async (targetUser) => {
    try {
      setStatusError('');
      setStatusMessage('');
      const res = await api.post(`/auth/users/${targetUser.id}/promote`, {
        ieeeStatus: 'VERIFIED'
      });
      setStatusMessage(res.message);
      loadData();
    } catch (err) {
      setStatusError(err.message || 'Failed to promote user to IEEE.');
    }
  };

  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    if (!promoteModalUser) return;

    try {
      setPromoting(true);
      setStatusError('');
      setStatusMessage('');
      const res = await api.post(`/auth/users/${promoteModalUser.id}/promote`, {
        role: promoteRole,
        ieeeStatus: promoteIeee,
        membershipNumber: promoteIeee === 'VERIFIED' ? promoteIeeeNumber.trim() || undefined : undefined,
        expiryDate: promoteIeee === 'VERIFIED' && promoteIeeeExpiry ? promoteIeeeExpiry : undefined,
        organizingBodyId: promoteRole === 'ORGANIZER' && promoteBodyId ? promoteBodyId : undefined
      });
      setStatusMessage(res.message);
      setPromoteModalUser(null);
      loadData();
    } catch (err) {
      setStatusError(err.message || 'Failed to update user promotion.');
    } finally {
      setPromoting(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      setStatusError('');
      const res = await api.patch(`/auth/users/${targetUserId}/role`, { role: newRole });
      setStatusMessage(res.message || `User role updated to ${newRole}.`);
      loadData();
    } catch (err) {
      setStatusError(err.message || 'Failed to update user role.');
    }
  };

  const handleToggleUserStatus = async (targetUserId, currentActive) => {
    try {
      setStatusError('');
      await api.patch(`/auth/users/${targetUserId}/status`, { isActive: !currentActive });
      setStatusMessage(`User account ${currentActive ? 'deactivated' : 'activated'}.`);
      loadData();
    } catch (err) {
      setStatusError(err.message || 'Failed to toggle user status.');
    }
  };

  const handleCreateBody = async (e) => {
    e.preventDefault();
    if (!newBodyName.trim()) return;

    try {
      await api.post('/bodies', {
        name: newBodyName.trim(),
        type: newBodyType,
        description: newBodyDesc.trim()
      });
      alert('Organizing body created.');
      setCreateBodyModalOpen(false);
      setNewBodyName('');
      setNewBodyDesc('');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create body.');
    }
  };

  const handleAssignCoordinator = async (e) => {
    e.preventDefault();
    if (!targetBodyId || !targetUserId) return;

    try {
      await api.post(`/bodies/${targetBodyId}/coordinators`, {
        userId: targetUserId
      });
      alert('Coordinator assigned successfully.');
      setAssignModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to assign coordinator.');
    }
  };

  const handleIeeeReview = async (id, status) => {
    let rejectionReason = null;
    if (status === 'REJECTED') {
      rejectionReason = window.prompt('Enter rejection reason:');
      if (rejectionReason === null) return;
    }

    try {
      await api.patch(`/ieee/${id}/review`, { status, rejectionReason });
      alert(`Membership ${status.toLowerCase()}`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to review membership.');
    }
  };

  const handleBulkIeeeUpload = async (e) => {
    e.preventDefault();
    const lines = bulkCsvText.split('\n').map((l) => l.trim()).filter(Boolean);
    const members = [];

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        members.push({
          membershipNumber: parts[0],
          email: parts[1],
          grade: parts[2] || 'Student Member',
          expiryDate: parts[3] || null
        });
      }
    }

    if (members.length === 0) {
      alert('Please enter at least one CSV row: membershipNumber,email');
      return;
    }

    try {
      const res = await api.post('/ieee/bulk-upload', { members });
      alert(res.message);
      setBulkCsvModalOpen(false);
      setBulkCsvText('');
      loadData();
    } catch (err) {
      alert(err.message || 'Bulk upload failed.');
    }
  };

  return (
    <>
      <Head>
        <title>Administration & Governance | CEMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white font-mono uppercase">
              System Administration
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              INSTITUTION-WIDE METRICS, USER GOVERNANCE, IEEE ROSTER & AUDIT LOGS
            </p>
          </div>

          <button
            onClick={loadData}
            className="p-1.5 rounded-none border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-600 self-start transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto text-xs font-mono">
          {[
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'users', label: 'User Governance', icon: Users },
            { id: 'bodies', label: 'Organizing Bodies', icon: Building2 },
            { id: 'ieee', label: 'IEEE Approvals', icon: ShieldCheck },
            { id: 'audit', label: 'System Audit Logs', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-none transition-colors border-b-2 -mb-[1px] flex items-center gap-1.5 whitespace-nowrap uppercase tracking-wider ${
                  active
                    ? 'border-black dark:border-white text-black dark:text-white font-bold bg-zinc-100 dark:bg-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {statusMessage && (
          <div className="p-3 border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage('')} className="p-0.5 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {statusError && (
          <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-mono flex items-center justify-between gap-2">
            <span>{statusError}</span>
            <button onClick={() => setStatusError('')} className="p-0.5 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: Analytics */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-1">
                <span className="text-[10px] uppercase text-zinc-500 block">TOTAL USERS</span>
                <p className="text-2xl font-bold text-zinc-950 dark:text-white">{analytics.metrics.totalUsers}</p>
                <span className="text-[11px] text-zinc-500">{analytics.metrics.studentCount} Students</span>
              </div>

              <div className="p-5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-1">
                <span className="text-[10px] uppercase text-zinc-500 block">TOTAL EVENTS</span>
                <p className="text-2xl font-bold text-zinc-950 dark:text-white">{analytics.metrics.totalEvents}</p>
                <span className="text-[11px] text-zinc-500">{analytics.metrics.publishedEvents} Published</span>
              </div>

              <div className="p-5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-1">
                <span className="text-[10px] uppercase text-zinc-500 block">CONFIRMED SEATS</span>
                <p className="text-2xl font-bold text-emerald-500">{analytics.metrics.totalRegistrations}</p>
                <span className="text-[11px] text-zinc-500">{analytics.metrics.totalCertificates} Certs Issued</span>
              </div>

              <div className="p-5 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-1">
                <span className="text-[10px] uppercase text-zinc-500 block">VERIFIED IEEE</span>
                <p className="text-2xl font-bold text-amber-500">{analytics.metrics.verifiedIeeeCount}</p>
                <span className="text-[11px] text-zinc-500">Discount Active</span>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-4 font-mono">
              <h3 className="font-bold text-xs text-zinc-950 dark:text-white uppercase tracking-wider">
                Events Distribution by Category
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {analytics.eventsByCategory.map((c) => (
                  <div key={c.category} className="p-3.5 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-center space-y-1">
                    <span className="font-bold text-zinc-950 dark:text-white block uppercase text-[10px]">{c.category}</span>
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Users */}
        {activeTab === 'users' && (() => {
          const filteredUsers = usersList.filter((u) => {
            const isIeee = u.ieeeMembership?.status === 'VERIFIED';
            if (userIeeeFilter === 'IEEE' && !isIeee) return false;
            if (userIeeeFilter === 'STANDARD' && isIeee) return false;
            return true;
          });

          return (
            <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-5 font-mono">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="SEARCH USERS (NAME, EMAIL, ROLL)..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={userIeeeFilter}
                    onChange={(e) => setUserIeeeFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                  >
                    <option value="">ALL TIERS (IEEE &amp; STANDARD)</option>
                    <option value="IEEE">IEEE VERIFIED ONLY</option>
                    <option value="STANDARD">NORMAL / NON-IEEE ONLY</option>
                  </select>

                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  >
                    <option value="">ALL ROLES</option>
                    <option value="STUDENT">STUDENT</option>
                    <option value="ORGANIZER">ORGANIZER</option>
                    <option value="APPROVER">APPROVER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-none border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">IEEE Tier</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Promote &amp; Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px]">
                    {filteredUsers.map((u) => {
                      const isIeee = u.ieeeMembership?.status === 'VERIFIED';
                      return (
                        <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/50">
                          <td className="p-3">
                            <span className="font-bold text-zinc-950 dark:text-white block">{u.name}</span>
                            <span className="text-[10px] text-zinc-500">{u.email} • {u.rollNo || 'No Roll'}</span>
                          </td>
                          <td className="p-3 text-zinc-600 dark:text-zinc-400">
                            {u.department || 'N/A'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 border text-[10px] font-bold uppercase ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                  : u.role === 'APPROVER'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                  : u.role === 'ORGANIZER'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3">
                            {isIeee ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-amber-500 bg-amber-400 text-black text-[10px] font-bold">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>IEEE ({u.ieeeMembership.membershipNumber})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-[10px]">
                                STANDARD
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold border ${
                              u.isActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                            }`}>
                              {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            {!isIeee && (
                              <button
                                onClick={() => handleQuickPromoteToIeee(u)}
                                className="inline-flex items-center gap-1 px-2 py-1 border border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-400 hover:text-black text-[10px] font-bold transition-colors"
                                title="One-click promote Normal user to Verified IEEE Member"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>+ IEEE</span>
                              </button>
                            )}
                            <button
                              onClick={() => openPromoteModal(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:opacity-90 text-[10px] font-bold transition-colors"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>PROMOTE</span>
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                              className="px-2 py-1 rounded-none text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-zinc-300 dark:border-zinc-800 transition-colors"
                            >
                              {u.isActive ? 'DISABLE' : 'ENABLE'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* TAB 3: Organizing Bodies */}
        {activeTab === 'bodies' && (
          <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-6 font-mono">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 dark:text-white">
                Organizing Bodies ({bodiesList.length})
              </h3>
              <button
                onClick={() => setCreateBodyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>CREATE BODY</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bodiesList.map((b) => (
                <div key={b.id} className="p-4 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold border ${
                        b.type === 'IEEE'
                          ? 'bg-amber-400 text-black border-amber-500'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                      }`}>
                        {b.type}
                      </span>
                      <span className="text-[10px] text-zinc-500">{b._count?.events || 0} Events</span>
                    </div>
                    <h4 className="font-bold text-sm text-zinc-950 dark:text-white font-sans">{b.name}</h4>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed font-sans">{b.description || 'No description provided.'}</p>
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 text-[10px]">{b.coordinators?.length || 0} Coordinators</span>
                    <button
                      onClick={() => {
                        setTargetBodyId(b.id);
                        setAssignModalOpen(true);
                      }}
                      className="text-zinc-950 dark:text-white font-bold hover:underline text-[11px]"
                    >
                      + ASSIGN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: IEEE Approvals */}
        {activeTab === 'ieee' && (
          <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-5 font-mono">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 dark:text-white">
                  IEEE Membership Verifications
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  AUDIT STUDENT SUBMISSIONS OR BULK-IMPORT ROSTERS
                </p>
              </div>

              <button
                onClick={() => setBulkCsvModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>BULK CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-none border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Student</th>
                    <th className="p-3">Member Number</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Expiry Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px]">
                  {ieeeList.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/50">
                      <td className="p-3">
                        <span className="font-bold text-zinc-950 dark:text-white block">{m.user?.name}</span>
                        <span className="text-[10px] text-zinc-500">{m.user?.rollNo || m.user?.email}</span>
                      </td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {m.membershipNumber}
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">{m.grade}</td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">
                        {new Date(m.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold border ${
                          m.status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : m.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {m.status !== 'VERIFIED' && (
                          <button
                            onClick={() => handleIeeeReview(m.id, 'VERIFIED')}
                            className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                          >
                            VERIFY
                          </button>
                        )}
                        {m.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleIeeeReview(m.id, 'REJECTED')}
                            className="px-2 py-0.5 rounded-none text-[10px] font-bold border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                          >
                            REJECT
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: System Audit Logs */}
        {activeTab === 'audit' && (
          <div className="p-6 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-4 font-mono">
            <div className="flex items-center justify-between gap-3 text-xs">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 dark:text-white">
                Audit Trail Log (FR-12.4)
              </h3>
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="SEARCH AUDIT LOGS..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-none border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/50">
                      <td className="p-3 text-zinc-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-zinc-950 dark:text-white">
                        {log.actorName} ({log.actorRole})
                      </td>
                      <td className="p-3 text-zinc-900 dark:text-zinc-100 font-bold">
                        {log.action}
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">
                        {log.entity} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                      </td>
                      <td className="p-3 text-zinc-500 max-w-xs truncate">
                        {log.newValue ? JSON.stringify(log.newValue) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Create Organizing Body */}
        {createBodyModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-none bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 text-xs font-mono">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase">Create Organizing Body</h3>
              <form onSubmit={handleCreateBody} className="space-y-3">
                <div>
                  <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">Body Name *</label>
                  <input
                    type="text"
                    value={newBodyName}
                    onChange={(e) => setNewBodyName(e.target.value)}
                    placeholder="Enter club or society name"
                    required
                    className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">Type *</label>
                  <select
                    value={newBodyType}
                    onChange={(e) => setNewBodyType(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  >
                    <option value="GENERAL">General Club / Society</option>
                    <option value="IEEE">IEEE Society / Branch</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase text-[11px] mb-1 text-zinc-600 dark:text-zinc-400">Description</label>
                  <textarea
                    rows={3}
                    value={newBodyDesc}
                    onChange={(e) => setNewBodyDesc(e.target.value)}
                    placeholder="Brief scope of activities..."
                    className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateBodyModalOpen(false)}
                    className="px-3 py-1.5 rounded-none text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-none font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                  >
                    CREATE BODY
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Bulk IEEE CSV */}
        {bulkCsvModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-none bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 text-xs font-mono">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase">Bulk IEEE Member Verification</h3>
              <p className="text-zinc-500 uppercase text-[11px]">
                FORMAT: membershipNumber, email, grade, expiryDate
              </p>
              <form onSubmit={handleBulkIeeeUpload} className="space-y-3">
                <textarea
                  rows={6}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  placeholder="Enter membershipNumber, email, grade, expiryDate (one per line)"
                  required
                  className="w-full px-3 py-2 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 font-mono text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBulkCsvModalOpen(false)}
                    className="px-3 py-1.5 rounded-none text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-none font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                  >
                    IMPORT & VERIFY
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal: Promote User / Change Tier & Role */}
        {promoteModalUser && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-none bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 text-xs font-mono shadow-2xl">
              <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase">
                    Promote / Manage User Access
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {promoteModalUser.name} ({promoteModalUser.email})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPromoteModalUser(null)}
                  className="p-1 text-zinc-500 hover:text-black dark:hover:text-white border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1-Click Quick Presets */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-zinc-500 block">
                  QUICK PROMOTION PRESETS (CLICK TO APPLY)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'NORMAL', label: 'Normal User', desc: 'Standard participant' },
                    { id: 'IEEE', label: 'IEEE Member', desc: 'Verified IEEE discounts' },
                    { id: 'ORGANIZER', label: 'Organizer', desc: 'Events & certificates' },
                    { id: 'APPROVER', label: 'Approver', desc: 'Faculty review' },
                    { id: 'ADMIN', label: 'System Admin', desc: 'Full governance' }
                  ].map((preset) => {
                    const isSelected =
                      (preset.id === 'NORMAL' && promoteRole === 'STUDENT' && promoteIeee === 'NONE') ||
                      (preset.id === 'IEEE' && promoteRole === 'STUDENT' && promoteIeee === 'VERIFIED') ||
                      (preset.id === promoteRole && preset.id !== 'NORMAL' && preset.id !== 'IEEE');
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => applyPreset(preset.id)}
                        className={`p-2.5 text-left border transition-colors ${
                          isSelected
                            ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-zinc-400'
                        }`}
                      >
                        <span className="font-bold block text-[11px] uppercase">{preset.label}</span>
                        <span className={`text-[10px] block mt-0.5 ${isSelected ? 'opacity-80' : 'text-zinc-500'}`}>
                          {preset.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handlePromoteSubmit} className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block uppercase text-[10px] text-zinc-500 mb-1">ACCOUNT ROLE</label>
                    <select
                      value={promoteRole}
                      onChange={(e) => setPromoteRole(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 font-bold"
                    >
                      <option value="STUDENT">STUDENT (Participant)</option>
                      <option value="ORGANIZER">ORGANIZER (Host &amp; Issue Certs)</option>
                      <option value="APPROVER">APPROVER (Faculty Review)</option>
                      <option value="ADMIN">ADMIN (Full Governance)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block uppercase text-[10px] text-zinc-500 mb-1">IEEE MEMBERSHIP TIER</label>
                    <select
                      value={promoteIeee}
                      onChange={(e) => setPromoteIeee(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 font-bold"
                    >
                      <option value="NONE">STANDARD (Non-IEEE)</option>
                      <option value="VERIFIED">IEEE VERIFIED MEMBER</option>
                    </select>
                  </div>
                </div>

                {promoteIeee === 'VERIFIED' && (
                  <div className="p-3 border border-amber-500/40 bg-amber-500/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block uppercase text-[10px] text-zinc-500 mb-1">
                        IEEE NUMBER (AUTO IF BLANK)
                      </label>
                      <input
                        type="text"
                        value={promoteIeeeNumber}
                        onChange={(e) => setPromoteIeeeNumber(e.target.value)}
                        placeholder="Enter IEEE membership number"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="block uppercase text-[10px] text-zinc-500 mb-1">
                        EXPIRY DATE
                      </label>
                      <input
                        type="date"
                        value={promoteIeeeExpiry}
                        onChange={(e) => setPromoteIeeeExpiry(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800"
                      />
                    </div>
                  </div>
                )}

                {promoteRole === 'ORGANIZER' && bodiesList.length > 0 && (
                  <div>
                    <label className="block uppercase text-[10px] text-zinc-500 mb-1">
                      ASSIGN TO ORGANIZING BODY (OPTIONAL)
                    </label>
                    <select
                      value={promoteBodyId}
                      onChange={(e) => setPromoteBodyId(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800"
                    >
                      <option value="">Keep current body assignments</option>
                      {bodiesList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPromoteModalUser(null)}
                    className="px-3 py-2 rounded-none text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={promoting}
                    className="px-4 py-2 rounded-none font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                  >
                    {promoting ? 'UPDATING...' : 'CONFIRM PROMOTION'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
