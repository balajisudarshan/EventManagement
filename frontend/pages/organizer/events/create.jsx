import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../../src/lib/api';
import { useAuth } from '../../../src/context/AuthContext';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function CreateEventPage() {
  const router = useRouter();
  const { user, isOrganizer, loading: authLoading } = useAuth();
  const [bodies, setBodies] = useState([]);
  const [loadingBodies, setLoadingBodies] = useState(true);

  // Form State
  const [organizingBodyId, setOrganizingBodyId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Workshop');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [venue, setVenue] = useState('');
  const [mode, setMode] = useState('OFFLINE');
  const [bannerUrl, setBannerUrl] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [eligibility, setEligibility] = useState('All College Students');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Capacity & Fees
  const [seatLimit, setSeatLimit] = useState(50);
  const [isFree, setIsFree] = useState(false);
  const [standardFee, setStandardFee] = useState(200);
  const [ieeeFee, setIeeeFee] = useState(150);

  // Team & Custom Fields
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const [minTeamSize, setMinTeamSize] = useState(2);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [customFields, setCustomFields] = useState([
    { name: 'githubUrl', label: 'GitHub Profile URL', type: 'text', required: true }
  ]);

  const [submitForApproval, setSubmitForApproval] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isOrganizer)) {
      router.push('/login?redirect=/organizer/events/create');
    }
  }, [user, isOrganizer, authLoading]);

  useEffect(() => {
    async function loadBodies() {
      try {
        const res = await api.get('/bodies/my');
        setBodies(res.bodies || []);
        if (res.bodies && res.bodies.length > 0) {
          setOrganizingBodyId(res.bodies[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingBodies(false);
      }
    }
    if (user) {
      loadBodies();
      setContactName(user.name || '');
      setContactEmail(user.email || '');
      setContactPhone(user.phone || '');
    }
  }, [user]);

  const selectedBody = bodies.find((b) => b.id === organizingBodyId);
  const isSelectedBodyIeee = selectedBody?.type === 'IEEE';

  // Cloudinary Banner upload handler
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'cems_event_banners');

    try {
      setUploadingBanner(true);
      const res = await api.upload('/upload', formData);
      setBannerUrl(res.url);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingBanner(false);
    }
  };

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      { name: `field_${Date.now().toString(36)}`, label: 'New Field', type: 'text', required: false }
    ]);
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index, key, val) => {
    const updated = [...customFields];
    updated[index][key] = val;
    setCustomFields(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!organizingBodyId) {
      setError('Please select an organizing body.');
      return;
    }

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setError('Event end date/time must be after start date/time.');
      return;
    }

    // Strict FR-7.1 validation
    if (!isFree && isSelectedBodyIeee) {
      if (Number(ieeeFee) >= Number(standardFee)) {
        setError('Business Rule FR-7.1 Violation: For IEEE events, the IEEE member fee must be strictly lower than the standard fee.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        organizingBodyId,
        title,
        description,
        category,
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: new Date(endDateTime).toISOString(),
        venue,
        mode,
        bannerUrl: bannerUrl || null,
        eligibility,
        registrationDeadline: new Date(registrationDeadline).toISOString(),
        contactName,
        contactEmail,
        contactPhone,
        seatLimit: parseInt(seatLimit, 10),
        isFree,
        standardFee: isFree ? 0 : parseFloat(standardFee),
        ieeeFee: (isFree || !isSelectedBodyIeee) ? 0 : parseFloat(ieeeFee),
        isTeamEvent,
        minTeamSize: isTeamEvent ? parseInt(minTeamSize, 10) : 1,
        maxTeamSize: isTeamEvent ? parseInt(maxTeamSize, 10) : 1,
        customFields,
        submitForApproval
      };

      await api.post('/events', payload);
      alert('Event created successfully!');
      router.push('/organizer');
    } catch (err) {
      setError(err.message || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Event Proposal | CEMS Organizer</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-8">
        <Link
          href="/organizer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizer Dashboard</span>
        </Link>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Create Event Proposal
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Specify event schedule, seat limit, IEEE discount structures, and custom participant registration requirements.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Section 1: Basic Information */}
          <div className="p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">1. Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Organizing Body *</label>
                <select
                  value={organizingBodyId}
                  onChange={(e) => setOrganizingBodyId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                >
                  {bodies.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.type})
                    </option>
                  ))}
                </select>
                {isSelectedBodyIeee && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>IEEE Organizing Body selected: discounted IEEE pricing enabled.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-medium mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                >
                  <option value="Workshop">Workshop</option>
                  <option value="Hackathon">Hackathon</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Cultural Fest">Cultural Fest</option>
                  <option value="Technical Fest">Technical Fest</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Event Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event title"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Description *</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed event syllabus, agenda, speakers, prerequisites..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              />
            </div>

            {/* Banner upload */}
            <div>
              <label className="block font-medium mb-1">Banner Image (Cloudinary Storage)</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingBanner ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                    className="hidden"
                  />
                </label>
                <span className="text-zinc-400">or enter image URL directly:</span>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
              {bannerUrl && (
                <div className="mt-3 relative h-32 w-64 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <img src={bannerUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Dates, Venue & Contact */}
          <div className="p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">2. Schedule, Venue & Contacts</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">End Date & Time *</label>
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Mode *</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                >
                  <option value="OFFLINE">Offline (In-person Campus)</option>
                  <option value="ONLINE">Online (Webinar / Virtual)</option>
                  <option value="HYBRID">Hybrid (Both)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Venue / Online Link *</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Enter venue or online meeting link"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Registration Deadline *</label>
                <input
                  type="datetime-local"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Eligibility Criteria</label>
                <input
                  type="text"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  placeholder="Specify department, year, or open eligibility"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <label className="block font-medium mb-1">Contact Coordinator *</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Contact Email *</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Capacity & Fee Structure */}
          <div className="p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">3. Capacity & Fee Structure</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Maximum Registration Limit (Seat Limit) *</label>
                <input
                  type="number"
                  min="1"
                  value={seatLimit}
                  onChange={(e) => setSeatLimit(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Enforces atomic seat cap (FR-4.2, BR-1). When filled, waitlist will automatically trigger.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="isFreeCheckbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900"
                />
                <label htmlFor="isFreeCheckbox" className="font-semibold cursor-pointer">
                  This is a Free Event (Skip fee calculations)
                </label>
              </div>
            </div>

            {!isFree && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80">
                <div>
                  <label className="block font-medium mb-1">Standard Participant Fee (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    value={standardFee}
                    onChange={(e) => setStandardFee(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold"
                  />
                </div>

                {isSelectedBodyIeee && (
                  <div>
                    <label className="block font-medium mb-1">
                      IEEE Member Fee (₹) * (Must be strictly less than standard)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={ieeeFee}
                      onChange={(e) => setIeeeFee(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold text-emerald-600 dark:text-emerald-400"
                    />
                    {Number(ieeeFee) >= Number(standardFee) && (
                      <p className="text-[11px] text-red-500 mt-1 font-semibold">
                        Error: IEEE fee must be strictly lower than standard fee (₹{standardFee}).
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Team Configuration & Custom Registration Fields */}
          <div className="p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">4. Team Settings & Custom Fields</h2>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="teamCheckbox"
                checked={isTeamEvent}
                onChange={(e) => setIsTeamEvent(e.target.checked)}
                className="w-4 h-4 rounded text-zinc-900"
              />
              <label htmlFor="teamCheckbox" className="font-semibold cursor-pointer">
                This is a Team Event (Hackathon / Group Challenge)
              </label>
            </div>

            {isTeamEvent && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80">
                <div>
                  <label className="block font-medium mb-1">Min Team Size</label>
                  <input
                    type="number"
                    min="1"
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Max Team Size</label>
                  <input
                    type="number"
                    min="1"
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>
            )}

            {/* Custom fields builder */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Custom Registration Form Fields</span>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </button>
              </div>

              {customFields.map((field, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800"
                >
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                    placeholder="Enter field label"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />

                  <select
                    value={field.type}
                    onChange={(e) => updateCustomField(idx, 'type', e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  >
                    <option value="text">Text Input</option>
                    <option value="select">Dropdown Options</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateCustomField(idx, 'required', e.target.checked)}
                      className="rounded"
                    />
                    <span>Required</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => removeCustomField(idx)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Buttons */}
          <div className="flex items-center justify-between p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={submitForApproval}
                onChange={(e) => setSubmitForApproval(e.target.checked)}
                className="w-4 h-4 rounded text-zinc-900"
              />
              <span className="font-semibold">
                Submit directly to Approver for review (FR-4.4)
              </span>
            </label>

            <div className="flex items-center gap-3">
              <Link
                href="/organizer"
                className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 transition shadow-md"
              >
                {submitting ? 'Creating Event...' : 'Create & Publish Proposal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

