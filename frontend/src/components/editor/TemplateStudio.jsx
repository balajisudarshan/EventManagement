import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import {
  createDefaultEditorData,
  makeTextElement,
  makeSignatureElement
} from '../../utils/editorDataRenderer';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Sparkles,
  LayoutTemplate,
  Eye,
  Upload,
  PenTool,
  Hash
} from 'lucide-react';

// Load Konva editor client-side only (SSR disabled)
const CanvasEditor = dynamic(() => import('./CanvasEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 min-h-[540px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center font-mono text-xs text-zinc-500">
      INITIALIZING VISUAL CANVAS EDITOR...
    </div>
  )
});

export default function TemplateStudio({ templateId = null }) {
  const router = useRouter();
  const stageRef = useRef(null);

  const [loading, setLoading] = useState(Boolean(templateId));
  const [saving, setSaving] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [error, setError] = useState('');

  // Template fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState('');
  const [orientation, setOrientation] = useState('LANDSCAPE');
  const [schemaFields, setSchemaFields] = useState([
    { key: 'courseTitle', label: 'Event / Course Title', type: 'text', required: false }
  ]);
  const [editorData, setEditorData] = useState(() => createDefaultEditorData('LANDSCAPE'));

  // Available events to optionally bind template
  const [events, setEvents] = useState([]);

  // Preview variable substitution test values
  const [testValues, setTestValues] = useState({
    recipientName: 'Alex Mercer',
    eventTitle: 'National AI & Robotics Hackathon 2026',
    courseTitle: 'National AI & Robotics Hackathon 2026',
    issuedAt: new Date().toLocaleDateString(),
    certificateId: 'CERT-CEMS-2026-DEMO99',
    verificationUrl: 'https://cems.edu/verify-certificate/CERT-CEMS-2026-DEMO99'
  });

  useEffect(() => {
    async function fetchInit() {
      try {
        const evRes = await api.get('/events/organizer/my-events').catch(() => ({ events: [] }));
        setEvents(evRes.events || []);

        if (templateId) {
          setLoading(true);
          const tRes = await api.get(`/certificates/templates/${templateId}`);
          const tpl = tRes.template;
          if (tpl) {
            setName(tpl.name || '');
            setDescription(tpl.description || '');
            setEventId(tpl.eventId || '');
            setOrientation(tpl.orientation || 'LANDSCAPE');
            setSchemaFields(Array.isArray(tpl.schemaDefinition) ? tpl.schemaDefinition : []);
            if (tpl.editorData) {
              setEditorData(tpl.editorData);
            } else {
              setEditorData(createDefaultEditorData(tpl.orientation || 'LANDSCAPE'));
            }
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load template data.');
      } finally {
        setLoading(false);
      }
    }
    fetchInit();
  }, [templateId]);

  const handleOrientationChange = (nextOri) => {
    if (nextOri === orientation) return;
    const oldW = orientation === 'LANDSCAPE' ? 1200 : 900;
    const oldH = orientation === 'LANDSCAPE' ? 900 : 1200;
    const newW = nextOri === 'LANDSCAPE' ? 1200 : 900;
    const newH = nextOri === 'LANDSCAPE' ? 900 : 1200;

    setOrientation(nextOri);
    setEditorData((prev) => {
      if (!prev || !prev.elements) return createDefaultEditorData(nextOri);
      const xScale = newW / oldW;
      const yScale = newH / oldH;
      const updatedElements = prev.elements.map((el) => ({
        ...el,
        x: Math.round(el.x * xScale),
        y: Math.round(el.y * yScale),
        width: Math.round(el.width * xScale),
        height: el.type === 'line' ? el.height : Math.round(el.height * yScale)
      }));
      return {
        ...prev,
        width: newW,
        height: newH,
        elements: updatedElements
      };
    });
  };

  const addSchemaField = () => {
    let idx = 1;
    while (schemaFields.some((f) => f.key === `customField_${idx}`)) idx++;
    const key = `customField_${idx}`;
    const label = `Custom Field ${idx}`;
    setSchemaFields([...schemaFields, { key, label, type: 'text', required: false }]);
    setTestValues((prev) => ({ ...prev, [key]: `Sample ${label}` }));

    // Add matching text placeholder onto canvas
    setEditorData((prev) => {
      const w = prev?.width || 1200;
      const h = prev?.height || 900;
      const newEl = makeTextElement(w, h, {
        y: Math.min(360 + idx * 55, h - 100),
        width: 420,
        zIndex: (prev?.elements?.length || 0) + 1,
        properties: {
          text: `{{${key}}}`,
          fontFamily: 'sans-serif',
          fontSize: 22,
          fontStyle: 'bold',
          fill: '#18181b',
          align: 'center',
          variable: key
        }
      });
      return { ...prev, elements: [...(prev?.elements || []), newEl] };
    });
  };

  const updateSchemaField = (i, prop, val) => {
    const oldKey = schemaFields[i].key;
    const next = [...schemaFields];
    next[i] = { ...next[i], [prop]: val };
    setSchemaFields(next);

    if (prop === 'key' && oldKey && val && oldKey !== val) {
      setEditorData((prev) => ({
        ...prev,
        elements: (prev?.elements || []).map((el) =>
          el.properties?.variable === oldKey
            ? {
                ...el,
                properties: {
                  ...el.properties,
                  variable: val,
                  text: `{{${val}}}`
                }
              }
            : el
        )
      }));
    }
  };

  const removeSchemaField = (i) => {
    const key = schemaFields[i]?.key;
    setSchemaFields(schemaFields.filter((_, idx) => idx !== i));
    if (key) {
      setEditorData((prev) => ({
        ...prev,
        elements: (prev?.elements || []).filter((el) => el.properties?.variable !== key)
      }));
    }
  };

  const currentSignatureEl = (editorData?.elements || []).find((el) => el.type === 'signature');
  const currentSignatureSrc = currentSignatureEl?.properties?.src || '';

  const applySignatureSrc = (src) => {
    setEditorData((prev) => {
      const elements = prev?.elements || [];
      const hasSig = elements.some((el) => el.type === 'signature');
      if (hasSig) {
        return {
          ...prev,
          elements: elements.map((el) =>
            el.type === 'signature' ? { ...el, properties: { ...el.properties, src } } : el
          )
        };
      }
      const w = prev?.width || 1200;
      const h = prev?.height || 900;
      const newSig = makeSignatureElement(w, h, {
        x: Math.round(w - 360),
        y: Math.round(h - 280),
        zIndex: elements.length + 1,
        properties: { src }
      });
      return { ...prev, elements: [...elements, newSig] };
    });
  };

  const handleQuickSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediate preview with Data URI
    const reader = new FileReader();
    reader.onload = (ev) => applySignatureSrc(ev.target.result);
    reader.readAsDataURL(file);

    try {
      setUploadingSignature(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'cems_signatures');
      const upRes = await api.upload('/upload', fd);
      if (upRes?.url) {
        applySignatureSrc(upRes.url);
      }
    } catch (err) {
      console.warn('Signature upload fallback kept:', err.message);
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleAddCertificateIdElement = () => {
    setEditorData((prev) => {
      const w = prev?.width || 1200;
      const h = prev?.height || 900;
      const idEl = makeTextElement(w, h, {
        x: Math.round(w / 2 - 190),
        y: Math.round(h - 140),
        width: 380,
        height: 24,
        zIndex: (prev?.elements?.length || 0) + 1,
        properties: {
          text: 'Certificate ID: {{certificateId}}',
          fontFamily: 'Courier New',
          fontSize: 13,
          fontStyle: 'bold',
          fill: '#52525b',
          align: 'center',
          variable: 'certificateId'
        }
      });
      return { ...prev, elements: [...(prev?.elements || []), idEl] };
    });
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a Template Name before saving.');
      return;
    }

    try {
      setSaving(true);
      let finalEditorData = editorData;

      // Upload any local attached images/signatures first
      if (editorData?.elements) {
        const processed = await Promise.all(
          editorData.elements.map(async (el) => {
            if (el._file) {
              const fd = new FormData();
              fd.append('file', el._file);
              fd.append('folder', 'cems_certificate_assets');
              const upRes = await api.upload('/upload', fd);
              const { _file, ...rest } = el;
              return { ...rest, properties: { ...rest.properties, src: upRes.url } };
            }
            return el;
          })
        );
        finalEditorData = { ...editorData, elements: processed };
      }

      // Generate live canvas thumbnail
      let thumbnailUrl = undefined;
      if (stageRef.current) {
        try {
          const transformers = stageRef.current.find('Transformer') || [];
          transformers.forEach((t) => t.hide());
          const dataUrl = stageRef.current.toDataURL({ pixelRatio: 0.35 });
          transformers.forEach((t) => t.show());

          const blob = await fetch(dataUrl).then((r) => r.blob());
          const file = new File([blob], 'template-thumb.png', { type: 'image/png' });
          const fd = new FormData();
          fd.append('file', file);
          fd.append('folder', 'cems_template_thumbs');
          const thumbRes = await api.upload('/upload', fd);
          thumbnailUrl = thumbRes.url;
        } catch (thumbErr) {
          console.warn('Thumbnail capture skipped:', thumbErr.message);
        }
      }

      await api.post('/certificates/templates', {
        id: templateId || undefined,
        name: name.trim(),
        description: description.trim() || null,
        eventId: eventId || null,
        orientation,
        thumbnailUrl,
        editorData: finalEditorData,
        schemaDefinition: schemaFields,
        isPublished: true
      });

      router.push('/organizer/templates');
    } catch (err) {
      setError(err.message || 'Failed to save certificate template.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center font-mono text-xs text-zinc-500 uppercase">
        LOADING TEMPLATE STUDIO...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 font-mono">
        <div className="space-y-1">
          <Link
            href="/organizer/templates"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO TEMPLATES</span>
          </Link>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white uppercase flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            <span>{templateId ? 'Edit Certificate Template' : 'Certificate Template Studio'}</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none text-xs font-bold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'SAVING TEMPLATE...' : templateId ? 'UPDATE TEMPLATE' : 'SAVE TEMPLATE'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-none bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Config Sidebar (3 cols) */}
        <div className="xl:col-span-3 space-y-4 font-mono text-xs">
          {/* Template Metadata */}
          <div className="p-4 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3">
            <span className="text-[10px] font-bold uppercase text-zinc-500 block border-b border-zinc-200 dark:border-zinc-800 pb-2">
              TEMPLATE SETTINGS
            </span>

            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-1">TEMPLATE NAME *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hackathon Winner 2026"
                className="w-full px-2.5 py-1.5 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-1">DESCRIPTION</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className="w-full px-2.5 py-1.5 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-1">LINK TO EVENT (OPTIONAL)</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs focus:outline-none focus:border-black dark:focus:border-white"
              >
                <option value="">GLOBAL (ANY EVENT OR DIRECT ISSUE)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-1">ORIENTATION</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['LANDSCAPE', 'PORTRAIT'].map((ori) => (
                  <button
                    key={ori}
                    type="button"
                    onClick={() => handleOrientationChange(ori)}
                    className={`py-1.5 border text-[10px] font-bold transition-colors ${
                      orientation === ori
                        ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                        : 'bg-white dark:bg-black text-zinc-500 border-zinc-300 dark:border-zinc-800 hover:border-zinc-500'
                    }`}
                  >
                    {ori}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Authorized Signature & Certificate ID Quick Controls */}
          <div className="p-4 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3">
            <span className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <PenTool className="w-3.5 h-3.5" />
              <span>SIGNATURE &amp; CERTIFICATE ID</span>
            </span>

            {currentSignatureSrc ? (
              <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between gap-2">
                <img src={currentSignatureSrc} alt="Signature Preview" className="h-10 max-w-[140px] object-contain bg-white p-0.5" />
                <button
                  type="button"
                  onClick={() => applySignatureSrc('')}
                  className="text-[10px] text-red-500 hover:underline font-bold"
                >
                  REMOVE
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-500">Upload a PNG/JPG signature to display on the certificate:</p>
            )}

            <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-black dark:bg-white text-white dark:text-black font-bold text-[11px] cursor-pointer hover:opacity-90">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingSignature ? 'UPLOADING...' : currentSignatureSrc ? 'CHANGE SIGNATURE' : 'UPLOAD SIGNATURE'}</span>
              <input type="file" accept="image/*" onChange={handleQuickSignatureUpload} className="hidden" />
            </label>

            <button
              type="button"
              onClick={handleAddCertificateIdElement}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white text-[10px] font-bold"
            >
              <Hash className="w-3 h-3" />
              <span>+ ADD CERTIFICATE ID TO CANVAS</span>
            </button>
          </div>

          {/* Dynamic Variables & Schema Builder */}
          <div className="p-4 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <span className="text-[10px] font-bold uppercase text-zinc-500">DYNAMIC PLACEHOLDERS</span>
              <button
                type="button"
                onClick={addSchemaField}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold"
              >
                <Plus className="w-3 h-3" />
                <span>FIELD</span>
              </button>
            </div>

            <div className="text-[10px] text-zinc-500 space-y-1 bg-zinc-50 dark:bg-zinc-950 p-2 border border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 block">BUILT-IN VARIABLES:</span>
              <p className="leading-relaxed">
                {'{{recipientName}}'}, {'{{eventTitle}}'}, {'{{issuedAt}}'}, {'{{certificateId}}'}, {'{{verificationUrl}}'}
              </p>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {schemaFields.map((field, idx) => (
                <div key={idx} className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateSchemaField(idx, 'key', e.target.value.replace(/\s+/g, '_'))}
                      placeholder="key"
                      className="flex-1 px-2 py-1 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeSchemaField(idx)}
                      className="p-1 text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateSchemaField(idx, 'label', e.target.value)}
                    placeholder="Display Label"
                    className="w-full px-2 py-1 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-[11px]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Live Test Preview Values */}
          <div className="p-4 rounded-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-2.5">
            <span className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Eye className="w-3.5 h-3.5" />
              <span>LIVE PREVIEW DATA</span>
            </span>

            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-0.5">RECIPIENT NAME</label>
              <input
                type="text"
                value={testValues.recipientName}
                onChange={(e) => setTestValues((p) => ({ ...p, recipientName: e.target.value }))}
                className="w-full px-2 py-1 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-0.5">EVENT / COURSE TITLE</label>
              <input
                type="text"
                value={testValues.eventTitle}
                onChange={(e) => setTestValues((p) => ({ ...p, eventTitle: e.target.value, courseTitle: e.target.value }))}
                className="w-full px-2 py-1 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Right Interactive Canvas Editor (9 cols) */}
        <div className="xl:col-span-9 h-[640px]">
          <CanvasEditor
            initialData={editorData}
            orientation={orientation}
            onChange={setEditorData}
            variables={testValues}
            stageRef={stageRef}
          />
        </div>
      </div>
    </div>
  );
}

