import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Stage,
  Layer,
  Rect,
  Text,
  Image as KonvaImage,
  Line,
  Circle,
  Ellipse,
  Transformer
} from 'react-konva';
import useImage from 'use-image';
import QRCode from 'qrcode';
import { api } from '../../lib/api';
import {
  Type,
  Image as ImageIcon,
  PenTool,
  QrCode,
  Square,
  Minus,
  Trash2,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload
} from 'lucide-react';
import {
  makeTextElement,
  makeImageElement,
  makeSignatureElement,
  makeQrCodeElement,
  makeShapeElement,
  makeLineElement,
  injectVariables
} from '../../utils/editorDataRenderer';

function normaliseElement(el) {
  return {
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    ...el
  };
}

function KonvaBackgroundImage({ src, width, height }) {
  const crossOrigin = src && (src.startsWith('data:') || src.startsWith('blob:')) ? undefined : 'anonymous';
  const [image] = useImage(src, crossOrigin);
  if (!image) return <Rect x={0} y={0} width={width} height={height} fill="#ffffff" />;
  return <KonvaImage image={image} x={0} y={0} width={width} height={height} />;
}

function KonvaUrlImage({ el, variables, isSelected, onSelect, onChange }) {
  const effectiveSrc = el.properties?.src || (el.type === 'signature' ? variables?.signatureUrl : '') || '';
  const crossOrigin =
    effectiveSrc && (effectiveSrc.startsWith('data:') || effectiveSrc.startsWith('blob:'))
      ? undefined
      : 'anonymous';
  const [image] = useImage(effectiveSrc, crossOrigin);
  const imageRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, image]);

  return (
    <>
      {!image && (
        <>
          <Rect
            x={el.x}
            y={el.y}
            width={el.width}
            height={el.height}
            stroke="#71717a"
            strokeWidth={1}
            dash={[6, 4]}
            fill="rgba(161,161,170,0.08)"
            draggable={!el.locked}
            onClick={() => onSelect(el.id)}
            onTap={() => onSelect(el.id)}
            onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
          />
          <Text
            x={el.x}
            y={el.y + Math.max(4, el.height / 2 - 7)}
            width={el.width}
            text={el.type === 'signature' ? 'CLICK TO UPLOAD SIGNATURE' : 'IMAGE SLOT'}
            fontFamily="monospace"
            fontSize={11}
            fill="#71717a"
            align="center"
            listening={false}
          />
        </>
      )}
      <KonvaImage
        ref={imageRef}
        image={image}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        rotation={el.rotation}
        opacity={el.opacity}
        draggable={!el.locked}
        onClick={() => onSelect(el.id)}
        onTap={() => onSelect(el.id)}
        onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = imageRef.current;
          onChange({
            ...el,
            x: node.x(),
            y: node.y(),
            width: Math.max(10, node.width() * node.scaleX()),
            height: Math.max(10, node.height() * node.scaleY()),
            rotation: node.rotation()
          });
          node.scaleX(1);
          node.scaleY(1);
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          anchorSize={12}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
            'middle-left',
            'middle-right',
            'top-center',
            'bottom-center'
          ]}
        />
      )}
    </>
  );
}

function QrCodeElement({ el, variables, isSelected, onSelect, onChange }) {
  const rawValue = injectVariables(el.properties.value || '', variables);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let active = true;
    const fallbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify-certificate/search` : '/verify-certificate/search';
    QRCode.toDataURL(rawValue || fallbackUrl, {
      width: Math.max(120, Math.round(el.width)),
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [rawValue, el.width]);

  return (
    <KonvaUrlImage
      el={{ ...el, properties: { src: qrDataUrl } }}
      isSelected={isSelected}
      onSelect={onSelect}
      onChange={onChange}
    />
  );
}

function TextElement({ el, variables, isSelected, onSelect, onChange }) {
  const textRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const displayText = injectVariables(el.properties.text || '', variables);
  const props = el.properties;
  const fontStyle =
    [
      (props.fontStyle || '').includes('bold') ? 'bold' : '',
      (props.fontStyle || '').includes('italic') ? 'italic' : ''
    ]
      .filter(Boolean)
      .join(' ') || 'normal';

  return (
    <>
      <Text
        ref={textRef}
        x={el.x}
        y={el.y}
        width={el.width}
        text={displayText}
        fontFamily={props.fontFamily || 'sans-serif'}
        fontSize={props.fontSize || 16}
        fontStyle={fontStyle}
        fill={props.fill || '#000000'}
        align={props.align || 'left'}
        rotation={el.rotation}
        opacity={el.opacity}
        draggable={!el.locked}
        onClick={() => onSelect(el.id)}
        onTap={() => onSelect(el.id)}
        onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = textRef.current;
          onChange({
            ...el,
            x: node.x(),
            y: node.y(),
            width: Math.max(50, node.width() * node.scaleX()),
            rotation: node.rotation()
          });
          node.scaleX(1);
          node.scaleY(1);
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          anchorSize={12}
          enabledAnchors={['middle-left', 'middle-right']}
        />
      )}
    </>
  );
}

function ShapeElement({ el, isSelected, onSelect, onChange }) {
  const ref = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && ref.current) {
      trRef.current.nodes([ref.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const props = el.properties;
  const commonProps = {
    ref,
    x: el.x,
    y: el.y,
    fill: props.fill || 'transparent',
    stroke: props.stroke || 'transparent',
    strokeWidth: props.strokeWidth || 0,
    rotation: el.rotation,
    opacity: el.opacity,
    draggable: !el.locked,
    onClick: () => onSelect(el.id),
    onTap: () => onSelect(el.id),
    onDragEnd: (e) => onChange({ ...el, x: e.target.x(), y: e.target.y() }),
    onTransformEnd: () => {
      const node = ref.current;
      onChange({
        ...el,
        x: node.x(),
        y: node.y(),
        width: Math.max(10, node.width() * node.scaleX()),
        height: Math.max(10, node.height() * node.scaleY()),
        rotation: node.rotation()
      });
      node.scaleX(1);
      node.scaleY(1);
    }
  };

  const shape =
    props.shapeType === 'circle' ? (
      <Circle {...commonProps} radius={Math.min(el.width, el.height) / 2} />
    ) : props.shapeType === 'ellipse' ? (
      <Ellipse {...commonProps} radiusX={el.width / 2} radiusY={el.height / 2} />
    ) : (
      <Rect {...commonProps} width={el.width} height={el.height} cornerRadius={props.cornerRadius || 0} />
    );

  return (
    <>
      {shape}
      {isSelected && <Transformer ref={trRef} rotateEnabled anchorSize={12} />}
    </>
  );
}

function LineElement({ el, isSelected, onSelect, onChange }) {
  const props = el.properties;
  return (
    <Line
      x={el.x}
      y={el.y}
      points={[0, 0, el.width, 0]}
      stroke={isSelected ? '#3b82f6' : props.stroke || '#000'}
      strokeWidth={Math.max(props.strokeWidth || 1, isSelected ? 3 : 1)}
      hitStrokeWidth={12}
      rotation={el.rotation}
      opacity={el.opacity}
      draggable={!el.locked}
      onClick={() => onSelect(el.id)}
      onTap={() => onSelect(el.id)}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
    />
  );
}

function PropertiesPanel({ element, onUpdate, onDelete }) {
  const [uploadingAsset, setUploadingAsset] = useState(false);

  if (!element) {
    return (
      <div className="w-60 bg-white dark:bg-black border-l border-zinc-200 dark:border-zinc-800 p-4 flex-shrink-0 font-mono">
        <p className="text-[11px] text-zinc-500 text-center mt-10 uppercase">
          SELECT AN ELEMENT ON CANVAS TO EDIT PROPERTIES
        </p>
      </div>
    );
  }

  const { type, properties: props = {} } = element;
  const updateProp = (key, value) => onUpdate({ ...element, properties: { ...props, [key]: value } });
  const updateEl = (key, value) => onUpdate({ ...element, [key]: value });

  const inputCls =
    'w-full px-2 py-1 rounded-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 text-xs font-mono text-zinc-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white';

  return (
    <div className="w-60 bg-white dark:bg-black border-l border-zinc-200 dark:border-zinc-800 p-3.5 overflow-y-auto flex-shrink-0 space-y-4 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
        <span className="font-bold uppercase text-zinc-950 dark:text-white">{type}</span>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-none bg-red-600 text-white text-[10px] font-bold hover:bg-red-500"
        >
          <Trash2 className="w-3 h-3" />
          <span>DEL</span>
        </button>
      </div>

      {/* Transform */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase text-zinc-500 block">TRANSFORM</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-zinc-500">X</label>
            <input type="number" value={Math.round(element.x)} onChange={(e) => updateEl('x', parseFloat(e.target.value) || 0)} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">Y</label>
            <input type="number" value={Math.round(element.y)} onChange={(e) => updateEl('y', parseFloat(e.target.value) || 0)} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">W</label>
            <input type="number" value={Math.round(element.width)} onChange={(e) => updateEl('width', parseFloat(e.target.value) || 10)} className={inputCls} />
          </div>
          {type !== 'line' && (
            <div>
              <label className="text-[10px] text-zinc-500">H</label>
              <input type="number" value={Math.round(element.height)} onChange={(e) => updateEl('height', parseFloat(e.target.value) || 10)} className={inputCls} />
            </div>
          )}
          <div>
            <label className="text-[10px] text-zinc-500">ROT (°)</label>
            <input type="number" value={Math.round(element.rotation || 0)} onChange={(e) => updateEl('rotation', parseFloat(e.target.value) || 0)} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">Z-IDX</label>
            <input type="number" value={element.zIndex || 0} onChange={(e) => updateEl('zIndex', parseInt(e.target.value, 10) || 0)} className={inputCls} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-zinc-500">OPACITY ({Math.round((element.opacity ?? 1) * 100)}%)</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={element.opacity ?? 1}
            onChange={(e) => updateEl('opacity', parseFloat(e.target.value))}
            className="w-24"
          />
        </div>

        <label className="flex items-center gap-2 pt-1 cursor-pointer text-[11px]">
          <input type="checkbox" checked={Boolean(element.locked)} onChange={(e) => updateEl('locked', e.target.checked)} />
          <span>LOCK ELEMENT</span>
        </label>
      </div>

      {type === 'text' && (
        <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-bold uppercase text-zinc-500 block">TEXT CONTENT</span>
          <div>
            <label className="text-[10px] text-zinc-500">TEXT / PLACEHOLDER</label>
            <textarea
              rows={3}
              value={props.text || ''}
              onChange={(e) => updateProp('text', e.target.value)}
              className={inputCls}
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {['{{recipientName}}', '{{certificateId}}', '{{eventTitle}}', '{{issuedAt}}'].map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => updateProp('text', `${props.text || ''}${props.text ? ' ' : ''}${token}`)}
                  className="px-1.5 py-0.5 text-[9px] border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white bg-zinc-50 dark:bg-zinc-950"
                >
                  +{token}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">VARIABLE KEY</label>
            <input
              type="text"
              value={props.variable || ''}
              onChange={(e) => updateProp('variable', e.target.value || null)}
              placeholder="e.g. recipientName"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">FONT FAMILY</label>
            <select value={props.fontFamily || 'sans-serif'} onChange={(e) => updateProp('fontFamily', e.target.value)} className={inputCls}>
              {['sans-serif', 'serif', 'Georgia', 'Arial', 'Courier New', 'Times New Roman', 'Verdana'].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500">SIZE (PX)</label>
              <input type="number" value={props.fontSize || 16} onChange={(e) => updateProp('fontSize', parseFloat(e.target.value) || 12)} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500">ALIGN</label>
              <select value={props.align || 'left'} onChange={(e) => updateProp('align', e.target.value)} className={inputCls}>
                <option value="left">LEFT</option>
                <option value="center">CENTER</option>
                <option value="right">RIGHT</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">STYLE</label>
            <select value={props.fontStyle || 'normal'} onChange={(e) => updateProp('fontStyle', e.target.value)} className={inputCls}>
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="italic">Italic</option>
              <option value="bold italic">Bold Italic</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">COLOR</label>
            <div className="flex items-center gap-2">
              <input type="color" value={props.fill || '#000000'} onChange={(e) => updateProp('fill', e.target.value)} className="w-7 h-7 border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer" />
              <input type="text" value={props.fill || '#000000'} onChange={(e) => updateProp('fill', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
      )}

      {(type === 'image' || type === 'signature') && (
        <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-bold uppercase text-zinc-500 block">{type.toUpperCase()} SOURCE</span>
          <div>
            <input
              type="file"
              accept="image/*"
              id={`uploader-${element.id}`}
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Instant local data-URI preview
                const reader = new FileReader();
                reader.onload = (ev) => {
                  onUpdate({ ...element, properties: { ...element.properties, src: ev.target.result } });
                };
                reader.readAsDataURL(file);

                // Upload to Cloudinary / asset storage immediately
                try {
                  setUploadingAsset(true);
                  const fd = new FormData();
                  fd.append('file', file);
                  fd.append('folder', type === 'signature' ? 'cems_signatures' : 'cems_certificate_assets');
                  const upRes = await api.upload('/upload', fd);
                  if (upRes?.url) {
                    onUpdate({ ...element, properties: { ...element.properties, src: upRes.url } });
                  }
                } catch (err) {
                  console.warn('Immediate asset upload fallback kept:', err.message);
                } finally {
                  setUploadingAsset(false);
                }
              }}
            />
            <label
              htmlFor={`uploader-${element.id}`}
              className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-none bg-black dark:bg-white text-white dark:text-black font-bold text-[11px] cursor-pointer hover:opacity-90"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingAsset ? 'UPLOADING...' : type === 'signature' ? 'UPLOAD SIGNATURE' : 'UPLOAD IMAGE'}</span>
            </label>
          </div>
          {props.src && (
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between gap-2">
              <img src={props.src} alt="Preview" className="h-10 max-w-[120px] object-contain bg-white p-0.5" />
              <button
                type="button"
                onClick={() => updateProp('src', '')}
                className="text-[10px] text-red-500 hover:underline"
              >
                CLEAR
              </button>
            </div>
          )}
          <div>
            <label className="text-[10px] text-zinc-500">OR IMAGE URL</label>
            <input type="text" value={props.src || ''} onChange={(e) => updateProp('src', e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
        </div>
      )}

      {type === 'qrcode' && (
        <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-bold uppercase text-zinc-500 block">QR CODE DATA</span>
          <div>
            <label className="text-[10px] text-zinc-500">VALUE / PLACEHOLDER</label>
            <input type="text" value={props.value || ''} onChange={(e) => updateProp('value', e.target.value)} placeholder="{{verificationUrl}}" className={inputCls} />
          </div>
        </div>
      )}

      {type === 'shape' && (
        <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-bold uppercase text-zinc-500 block">SHAPE STYLE</span>
          <div>
            <label className="text-[10px] text-zinc-500">SHAPE TYPE</label>
            <select value={props.shapeType || 'rect'} onChange={(e) => updateProp('shapeType', e.target.value)} className={inputCls}>
              <option value="rect">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="ellipse">Ellipse</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">FILL</label>
            <div className="flex items-center gap-1.5">
              <input type="color" value={props.fill === 'transparent' ? '#ffffff' : props.fill || '#ffffff'} onChange={(e) => updateProp('fill', e.target.value)} className="w-7 h-7 border border-zinc-300 dark:border-zinc-700 cursor-pointer" />
              <button type="button" onClick={() => updateProp('fill', 'transparent')} className="px-2 py-1 border border-zinc-300 dark:border-zinc-700 text-[10px]">
                NONE
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">STROKE COLOR</label>
            <div className="flex items-center gap-2">
              <input type="color" value={props.stroke || '#000000'} onChange={(e) => updateProp('stroke', e.target.value)} className="w-7 h-7 border border-zinc-300 dark:border-zinc-700 cursor-pointer" />
              <input type="text" value={props.stroke || '#000000'} onChange={(e) => updateProp('stroke', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">STROKE WIDTH</label>
            <input type="number" value={props.strokeWidth || 0} onChange={(e) => updateProp('strokeWidth', parseFloat(e.target.value) || 0)} className={inputCls} />
          </div>
        </div>
      )}

      {type === 'line' && (
        <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-bold uppercase text-zinc-500 block">LINE STYLE</span>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">COLOR</label>
            <div className="flex items-center gap-2">
              <input type="color" value={props.stroke || '#000000'} onChange={(e) => updateProp('stroke', e.target.value)} className="w-7 h-7 border border-zinc-300 dark:border-zinc-700 cursor-pointer" />
              <input type="text" value={props.stroke || '#000000'} onChange={(e) => updateProp('stroke', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">THICKNESS</label>
            <input type="number" value={props.strokeWidth || 1} onChange={(e) => updateProp('strokeWidth', parseFloat(e.target.value) || 1)} className={inputCls} />
          </div>
        </div>
      )}
    </div>
  );
}

const TOOLBAR_ITEMS = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'signature', label: 'Signature', icon: PenTool },
  { type: 'qrcode', label: 'QR Code', icon: QrCode },
  { type: 'shape', label: 'Shape', icon: Square },
  { type: 'line', label: 'Line', icon: Minus }
];

export default function CanvasEditor({ initialData, orientation = 'LANDSCAPE', onChange, variables = {}, stageRef }) {
  const isLandscape = orientation === 'LANDSCAPE';
  const canvasWidth = isLandscape ? 1200 : 900;
  const canvasHeight = isLandscape ? 900 : 1200;

  const [editorData, setEditorData] = useState(() => {
    if (initialData) return initialData;
    return {
      version: 1,
      width: canvasWidth,
      height: canvasHeight,
      background: { type: 'color', value: '#ffffff' },
      elements: []
    };
  });

  useEffect(() => {
    if (initialData) {
      setEditorData(initialData);
    }
  }, [initialData]);

  const [selectedId, setSelectedId] = useState(null);
  const canvasContainerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 700, height: 520 });
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setContainerSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const PAD = 32;
  const availW = Math.max(containerSize.width - PAD, 200);
  const availH = Math.max(containerSize.height - PAD, 200);
  const effectiveW = editorData.width || canvasWidth;
  const effectiveH = editorData.height || canvasHeight;
  const baseScale = Math.min(availW / effectiveW, availH / effectiveH);
  const displayScale = baseScale * zoomLevel;
  const stageWidth = Math.round(effectiveW * displayScale);
  const stageHeight = Math.round(effectiveH * displayScale);

  const emit = useCallback(
    (data) => {
      const normalised = {
        ...data,
        elements: (data.elements || []).map(normaliseElement)
      };
      setEditorData(normalised);
      onChange?.(normalised);
    },
    [onChange]
  );

  const updateElement = useCallback(
    (updated) => {
      emit({
        ...editorData,
        elements: editorData.elements.map((el) => (el.id === updated.id ? updated : el))
      });
    },
    [editorData, emit]
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    emit({
      ...editorData,
      elements: editorData.elements.filter((el) => el.id !== selectedId)
    });
    setSelectedId(null);
  }, [selectedId, editorData, emit]);

  const addElement = useCallback(
    (type) => {
      const w = effectiveW;
      const h = effectiveH;
      const nextZ = (editorData.elements || []).length + 1;
      let newEl;
      switch (type) {
        case 'text':
          newEl = makeTextElement(w, h, { zIndex: nextZ });
          break;
        case 'image':
          newEl = makeImageElement('', w, h, { zIndex: nextZ });
          break;
        case 'signature':
          newEl = makeSignatureElement(w, h, { zIndex: nextZ });
          break;
        case 'qrcode':
          newEl = makeQrCodeElement(w, h, { zIndex: nextZ });
          break;
        case 'shape':
          newEl = makeShapeElement(w, h, { zIndex: nextZ });
          break;
        case 'line':
          newEl = makeLineElement(w, h, { zIndex: nextZ });
          break;
        default:
          return;
      }
      const normalisedEl = normaliseElement(newEl);
      emit({ ...editorData, elements: [...(editorData.elements || []), normalisedEl] });
      setSelectedId(normalisedEl.id);
    },
    [editorData, effectiveW, effectiveH, emit]
  );

  const setBgColor = useCallback(
    (color) => {
      emit({ ...editorData, background: { type: 'color', value: color } });
    },
    [editorData, emit]
  );

  const handleBgImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      emit({ ...editorData, background: { type: 'image', value: ev.target.result } });
    };
    reader.readAsDataURL(file);
  };

  const toggleLock = useCallback(
    (id) => {
      emit({
        ...editorData,
        elements: editorData.elements.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el))
      });
    },
    [editorData, emit]
  );

  const selectedElement = (editorData.elements || []).find((el) => el.id === selectedId) ?? null;
  const sorted = [...(editorData.elements || [])].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const layersDesc = [...(editorData.elements || [])].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));
  const bg = editorData.background || { type: 'color', value: '#ffffff' };

  return (
    <div className="flex flex-col h-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black font-mono overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase text-zinc-500 mr-1">ADD:</span>
          {TOOLBAR_ITEMS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => addElement(type)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-none border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black text-zinc-800 dark:text-zinc-200 hover:border-black dark:hover:border-white text-[11px] font-semibold transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}

          <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-zinc-300 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase text-zinc-500">BG:</span>
            <input
              type="color"
              value={bg.type === 'color' ? bg.value : '#ffffff'}
              onChange={(e) => setBgColor(e.target.value)}
              title="Background Color"
              className="w-6 h-6 border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer"
            />
            <label className="px-2 py-1 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black text-[10px] cursor-pointer hover:border-black dark:hover:border-white">
              BG IMG
              <input type="file" accept="image/*" onChange={handleBgImageUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.15))}
            className="p-1.5 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black hover:border-black dark:hover:border-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1)}
            className="px-2 py-1 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black text-[11px] font-bold min-w-[48px]"
            title="Reset Zoom"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.15))}
            className="p-1.5 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black hover:border-black dark:hover:border-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body: Layers + Stage + Properties */}
      <div className="flex flex-1 min-h-[540px] overflow-hidden">
        {/* Layers */}
        <div className="hidden lg:flex w-40 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex-shrink-0">
          <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase text-zinc-500">
            LAYERS ({layersDesc.length})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900">
            {layersDesc.map((el) => (
              <div
                key={el.id}
                onClick={() => setSelectedId(el.id)}
                className={`px-2.5 py-2 flex items-center justify-between gap-1.5 cursor-pointer text-[11px] ${
                  selectedId === el.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <span className="truncate">
                  {el.type === 'text' ? (el.properties?.text || 'Text').slice(0, 14) : `${el.type.toUpperCase()}`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLock(el.id);
                  }}
                  className="opacity-75 hover:opacity-100"
                >
                  {el.locked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Konva Canvas Area */}
        <div
          ref={canvasContainerRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
          className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-950 vercel-dots flex items-center justify-center p-4"
        >
          <div
            style={{ width: stageWidth, height: stageHeight }}
            className="shadow-2xl border border-zinc-300 dark:border-zinc-700 bg-white flex-shrink-0"
          >
            <Stage
              ref={stageRef}
              width={stageWidth}
              height={stageHeight}
              scaleX={displayScale}
              scaleY={displayScale}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
              onTouchStart={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
            >
              <Layer>
                {bg.type === 'image' && bg.value ? (
                  <KonvaBackgroundImage src={bg.value} width={effectiveW} height={effectiveH} />
                ) : (
                  <Rect x={0} y={0} width={effectiveW} height={effectiveH} fill={bg.value || '#ffffff'} />
                )}

                {sorted.map((el) => {
                  const isSelected = el.id === selectedId;
                  const cp = { el, isSelected, onSelect: setSelectedId, onChange: updateElement };
                  switch (el.type) {
                    case 'text':
                      return <TextElement key={el.id} {...cp} variables={variables} />;
                    case 'image':
                    case 'signature':
                      return <KonvaUrlImage key={el.id} {...cp} variables={variables} />;
                    case 'qrcode':
                      return <QrCodeElement key={el.id} {...cp} variables={variables} />;
                    case 'shape':
                      return <ShapeElement key={el.id} {...cp} />;
                    case 'line':
                      return <LineElement key={el.id} {...cp} />;
                    default:
                      return null;
                  }
                })}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Right Properties Inspector */}
        <PropertiesPanel
          element={selectedElement}
          onUpdate={updateElement}
          onDelete={deleteSelected}
        />
      </div>
    </div>
  );
}

