/**
 * editorDataRenderer.js
 *
 * Client-side canvas data factories and HTML renderer for live certificate previews
 * (ported from blazexr-in/certificate and adapted for CEMS).
 */

export function injectVariables(template, variables = {}) {
  if (!template) return '';
  return String(template).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
    const trimmed = key.trim();
    const value = variables[trimmed];
    return value !== undefined && value !== null ? String(value) : `[${trimmed}]`;
  });
}

export function generateElementId() {
  return 'el-' + Math.random().toString(36).slice(2, 10);
}

export function createDefaultEditorData(orientation = 'LANDSCAPE') {
  const isLandscape = orientation === 'LANDSCAPE';
  const canvasWidth = isLandscape ? 1200 : 900;
  const canvasHeight = isLandscape ? 900 : 1200;

  return {
    version: 1,
    width: canvasWidth,
    height: canvasHeight,
    background: { type: 'color', value: '#ffffff' },
    elements: [
      {
        id: generateElementId(),
        type: 'shape',
        x: 36,
        y: 36,
        width: canvasWidth - 72,
        height: canvasHeight - 72,
        rotation: 0,
        opacity: 1,
        locked: true,
        zIndex: 1,
        properties: {
          shapeType: 'rect',
          fill: 'transparent',
          stroke: '#09090b',
          strokeWidth: 6,
          cornerRadius: 0
        }
      },
      {
        id: generateElementId(),
        type: 'shape',
        x: 48,
        y: 48,
        width: canvasWidth - 96,
        height: canvasHeight - 96,
        rotation: 0,
        opacity: 1,
        locked: true,
        zIndex: 2,
        properties: {
          shapeType: 'rect',
          fill: 'transparent',
          stroke: '#d97706',
          strokeWidth: 2,
          cornerRadius: 0
        }
      },
      {
        id: generateElementId(),
        type: 'text',
        x: 100,
        y: isLandscape ? 130 : 180,
        width: canvasWidth - 200,
        height: 36,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 3,
        properties: {
          text: 'COLLEGE EVENT MANAGEMENT SYSTEM',
          fontFamily: 'sans-serif',
          fontSize: 16,
          fontStyle: 'bold',
          fill: '#71717a',
          align: 'center',
          variable: null
        }
      },
      {
        id: generateElementId(),
        type: 'text',
        x: 100,
        y: isLandscape ? 185 : 240,
        width: canvasWidth - 200,
        height: 60,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 4,
        properties: {
          text: 'CERTIFICATE OF COMPLETION',
          fontFamily: 'Georgia',
          fontSize: isLandscape ? 42 : 34,
          fontStyle: 'bold',
          fill: '#09090b',
          align: 'center',
          variable: null
        }
      },
      {
        id: generateElementId(),
        type: 'text',
        x: 100,
        y: isLandscape ? 275 : 330,
        width: canvasWidth - 200,
        height: 30,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 5,
        properties: {
          text: 'This is proudly presented to',
          fontFamily: 'serif',
          fontSize: 18,
          fontStyle: 'italic',
          fill: '#52525b',
          align: 'center',
          variable: null
        }
      },
      {
        id: generateElementId(),
        type: 'text',
        x: 100,
        y: isLandscape ? 325 : 390,
        width: canvasWidth - 200,
        height: 60,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 6,
        properties: {
          text: '{{recipientName}}',
          fontFamily: 'Georgia',
          fontSize: isLandscape ? 48 : 40,
          fontStyle: 'bold',
          fill: '#b45309',
          align: 'center',
          variable: 'recipientName'
        }
      },
      {
        id: generateElementId(),
        type: 'line',
        x: Math.round(canvasWidth / 2 - 220),
        y: isLandscape ? 395 : 460,
        width: 440,
        height: 2,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 7,
        properties: {
          stroke: '#d4d4d8',
          strokeWidth: 2
        }
      },
      {
        id: generateElementId(),
        type: 'text',
        x: 100,
        y: isLandscape ? 425 : 500,
        width: canvasWidth - 200,
        height: 36,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 8,
        properties: {
          text: 'for active participation and successful completion of',
          fontFamily: 'sans-serif',
          fontSize: 16,
          fontStyle: 'normal',
          fill: '#52525b',
          align: 'center',
          variable: null
        }
      },
      {
        id: generateElementId(),
        type: 'text',
        x: 100,
        y: isLandscape ? 470 : 550,
        width: canvasWidth - 200,
        height: 50,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 9,
        properties: {
          text: '{{eventTitle}}',
          fontFamily: 'sans-serif',
          fontSize: isLandscape ? 30 : 26,
          fontStyle: 'bold',
          fill: '#09090b',
          align: 'center',
          variable: 'eventTitle'
        }
      },
      {
        id: generateElementId(),
        type: 'text',
        x: isLandscape ? 140 : 90,
        y: isLandscape ? 650 : 830,
        width: 240,
        height: 30,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 10,
        properties: {
          text: 'Issued: {{issuedAt}}',
          fontFamily: 'sans-serif',
          fontSize: 14,
          fontStyle: 'normal',
          fill: '#27272a',
          align: 'center',
          variable: 'issuedAt'
        }
      },
      {
        id: generateElementId(),
        type: 'text',
        x: isLandscape ? 140 : 90,
        y: isLandscape ? 685 : 865,
        width: 240,
        height: 24,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 11,
        properties: {
          text: 'Date of Issue',
          fontFamily: 'sans-serif',
          fontSize: 12,
          fontStyle: 'bold',
          fill: '#71717a',
          align: 'center',
          variable: null
        }
      },
      {
        id: generateElementId(),
        type: 'signature',
        x: isLandscape ? canvasWidth - 360 : canvasWidth - 310,
        y: isLandscape ? 595 : 775,
        width: 200,
        height: 80,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 12,
        properties: {
          src: ''
        }
      },
      {
        id: generateElementId(),
        type: 'text',
        x: isLandscape ? canvasWidth - 380 : canvasWidth - 330,
        y: isLandscape ? 685 : 865,
        width: 240,
        height: 24,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 13,
        properties: {
          text: 'Authorized Signatory',
          fontFamily: 'sans-serif',
          fontSize: 12,
          fontStyle: 'bold',
          fill: '#71717a',
          align: 'center',
          variable: null
        }
      },
      {
        id: generateElementId(),
        type: 'qrcode',
        x: Math.round(canvasWidth / 2 - 50),
        y: isLandscape ? 600 : 720,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 14,
        properties: {
          value: '{{verificationUrl}}',
          variable: 'verificationUrl'
        }
      },
      {
        id: generateElementId(),
        type: 'text',
        x: Math.round(canvasWidth / 2 - 190),
        y: isLandscape ? 712 : 832,
        width: 380,
        height: 24,
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 15,
        properties: {
          text: 'Certificate ID: {{certificateId}}',
          fontFamily: 'Courier New',
          fontSize: 13,
          fontStyle: 'bold',
          fill: '#52525b',
          align: 'center',
          variable: 'certificateId'
        }
      }
    ]
  };
}

export function makeTextElement(canvasWidth, canvasHeight, overrides = {}) {
  return {
    id: generateElementId(),
    type: 'text',
    x: Math.round(canvasWidth / 2 - 150),
    y: Math.round(canvasHeight / 2 - 20),
    width: 300,
    height: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    properties: {
      text: 'New Text',
      fontFamily: 'sans-serif',
      fontSize: 24,
      fontStyle: 'normal',
      fill: '#09090b',
      align: 'center',
      variable: null
    },
    ...overrides
  };
}

export function makeImageElement(src, canvasWidth, canvasHeight, overrides = {}) {
  return {
    id: generateElementId(),
    type: 'image',
    x: Math.round(canvasWidth / 2 - 75),
    y: Math.round(canvasHeight / 2 - 50),
    width: 150,
    height: 100,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    properties: { src: src || '', objectFit: 'contain' },
    ...overrides
  };
}

export function makeSignatureElement(canvasWidth, canvasHeight, overrides = {}) {
  return {
    id: generateElementId(),
    type: 'signature',
    x: Math.round(canvasWidth / 2 - 100),
    y: Math.round(canvasHeight - 150),
    width: 200,
    height: 80,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    properties: { src: '' },
    ...overrides
  };
}

export function makeQrCodeElement(canvasWidth, canvasHeight, overrides = {}) {
  return {
    id: generateElementId(),
    type: 'qrcode',
    x: Math.round(canvasWidth - 140),
    y: Math.round(canvasHeight - 140),
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    properties: {
      value: '{{verificationUrl}}',
      variable: 'verificationUrl'
    },
    ...overrides
  };
}

export function makeShapeElement(canvasWidth, canvasHeight, overrides = {}) {
  return {
    id: generateElementId(),
    type: 'shape',
    x: Math.round(canvasWidth / 2 - 100),
    y: Math.round(canvasHeight / 2 - 60),
    width: 200,
    height: 120,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    properties: {
      shapeType: 'rect',
      fill: 'transparent',
      stroke: '#09090b',
      strokeWidth: 2,
      cornerRadius: 0
    },
    ...overrides
  };
}

export function makeLineElement(canvasWidth, canvasHeight, overrides = {}) {
  return {
    id: generateElementId(),
    type: 'line',
    x: 60,
    y: Math.round(canvasHeight / 2),
    width: canvasWidth - 120,
    height: 2,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    properties: {
      stroke: '#d4d4d8',
      strokeWidth: 2
    },
    ...overrides
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderText(el, variables) {
  const { x, y, width, height, rotation, opacity, properties = {} } = el;
  const text = injectVariables(properties.text || '', variables);
  const style = [
    'position:absolute',
    `left:${x}px`,
    `top:${y}px`,
    `width:${width}px`,
    `min-height:${height}px`,
    `font-family:${properties.fontFamily || 'sans-serif'}`,
    `font-size:${properties.fontSize || 16}px`,
    `font-weight:${(properties.fontStyle || '').includes('bold') ? 'bold' : 'normal'}`,
    `font-style:${(properties.fontStyle || '').includes('italic') ? 'italic' : 'normal'}`,
    `color:${properties.fill || '#000000'}`,
    `text-align:${properties.align || 'left'}`,
    `opacity:${opacity !== undefined ? opacity : 1}`,
    `transform:rotate(${rotation || 0}deg)`,
    'transform-origin:center center',
    'word-break:break-word',
    'box-sizing:border-box'
  ].join(';');
  return `<div style="${style}">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
}

function renderImage(el, variables = {}) {
  const { x, y, width, height, rotation, opacity, properties = {} } = el;
  const src = properties.src || (el.type === 'signature' ? variables.signatureUrl : '') || '';
  if (!src) return '';
  const objectFit = properties.objectFit || 'contain';
  const style = [
    'position:absolute',
    `left:${x}px`,
    `top:${y}px`,
    `width:${width}px`,
    `height:${height}px`,
    `object-fit:${objectFit}`,
    `opacity:${opacity !== undefined ? opacity : 1}`,
    `transform:rotate(${rotation || 0}deg)`,
    'transform-origin:center center'
  ].join(';');
  return `<img src="${src}" style="${style}" alt="" />`;
}

function renderQrCode(el, variables, qrDataUrl) {
  const { x, y, width, height, rotation, opacity, properties = {} } = el;
  const rawValue = injectVariables(properties.value || '', variables);
  const effectiveValue = (!rawValue || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\b/i.test(rawValue))
    ? (variables.verificationUrl || rawValue || '')
    : rawValue;
  const qrSrc = qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=${Math.round(width)}x${Math.round(height)}&data=${encodeURIComponent(effectiveValue)}`;
  const style = [
    'position:absolute',
    `left:${x}px`,
    `top:${y}px`,
    `width:${width}px`,
    `height:${height}px`,
    `opacity:${opacity !== undefined ? opacity : 1}`,
    `transform:rotate(${rotation || 0}deg)`,
    'transform-origin:center center'
  ].join(';');
  return `<img src="${qrSrc}" style="${style}" alt="QR Code" />`;
}

function renderShape(el) {
  const { x, y, width, height, rotation, opacity, properties = {} } = el;
  const shapeType = properties.shapeType || 'rect';
  const fill = properties.fill || 'transparent';
  const stroke = properties.stroke || 'transparent';
  const strokeWidth = properties.strokeWidth || 0;
  const cornerRadius = properties.cornerRadius || 0;

  const baseStyle = [
    'position:absolute',
    `left:${x}px`,
    `top:${y}px`,
    `width:${width}px`,
    `height:${height}px`,
    `background-color:${fill}`,
    `border:${strokeWidth}px solid ${stroke}`,
    `opacity:${opacity !== undefined ? opacity : 1}`,
    `transform:rotate(${rotation || 0}deg)`,
    'transform-origin:center center',
    'box-sizing:border-box'
  ];

  if (shapeType === 'rect') {
    baseStyle.push(`border-radius:${cornerRadius}px`);
  } else if (shapeType === 'circle' || shapeType === 'ellipse') {
    baseStyle.push('border-radius:50%');
  }

  return `<div style="${baseStyle.join(';')}"></div>`;
}

function renderLine(el) {
  const { x, y, width, rotation, opacity, properties = {} } = el;
  const stroke = properties.stroke || '#000000';
  const strokeWidth = properties.strokeWidth || 1;
  const style = [
    'position:absolute',
    `left:${x}px`,
    `top:${y}px`,
    `width:${width}px`,
    `height:${strokeWidth}px`,
    `background-color:${stroke}`,
    'border:none',
    `opacity:${opacity !== undefined ? opacity : 1}`,
    `transform:rotate(${rotation || 0}deg)`,
    'transform-origin:left center'
  ].join(';');
  return `<div style="${style}"></div>`;
}

export function renderEditorDataToHtml(editorData, variables = {}, qrDataUrl = null) {
  if (!editorData) return '<p>(No template content)</p>';

  let data = editorData;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (err) {
      return `<p>(Invalid template content: ${escapeHtml(err.message)})</p>`;
    }
  }

  const { width = 1200, height = 900, background = {}, elements = [] } = data;

  let backgroundCss = '';
  if (background.type === 'image' && background.value) {
    backgroundCss = `background-image:url(${background.value});background-size:cover;background-position:center;`;
  } else {
    backgroundCss = `background-color:${background.value || '#ffffff'};`;
  }

  const sorted = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  const renderedElements = sorted
    .map((el) => {
      try {
        switch (el.type) {
          case 'text':
            return renderText(el, variables);
          case 'image':
          case 'signature':
            return renderImage(el, variables);
          case 'qrcode':
            return renderQrCode(el, variables, qrDataUrl);
          case 'shape':
            return renderShape(el);
          case 'line':
            return renderLine(el);
          default:
            return '';
        }
      } catch {
        return '';
      }
    })
    .join('\n');

  const hasCertIdEl = elements.some(
    (el) =>
      el.type === 'text' &&
      (String(el.properties?.text || '').includes('certificateId') ||
        String(el.properties?.text || '').includes('verificationCode') ||
        el.properties?.variable === 'certificateId')
  );

  const fallbackCertIdHtml =
    variables.certificateId && !hasCertIdEl
      ? `<div style="position:absolute;left:0;bottom:54px;width:${width}px;text-align:center;font-family:Courier New,monospace;font-size:13px;font-weight:bold;color:#52525b;">Certificate ID: ${escapeHtml(variables.certificateId)}</div>`
      : '';

  const hasSignatureSlot = elements.some((el) => el.type === 'signature');
  const fallbackSignatureHtml =
    variables.signatureUrl && !hasSignatureSlot
      ? `<img src="${variables.signatureUrl}" style="position:absolute;right:120px;bottom:140px;width:200px;height:80px;object-fit:contain;" alt="Signature" />`
      : '';

  return `<div style="position:relative;width:${width}px;height:${height}px;${backgroundCss}overflow:hidden;box-sizing:border-box;">\n${renderedElements}\n${fallbackSignatureHtml}\n${fallbackCertIdHtml}\n</div>`;
}

export function buildCertificatePreviewSrcDoc(editorData, cert, liveQrDataUrl = null) {
  if (!editorData || !cert) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const issuedDateStr = cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : '';
  const extraData = cert.credentialData && typeof cert.credentialData === 'object' ? cert.credentialData : {};
  const replacements = {
    recipientName: cert.recipientName || '',
    recipient_name: cert.recipientName || '',
    recipientEmail: cert.recipientEmail || '',
    eventTitle: cert.eventTitle || '',
    courseTitle: cert.eventTitle || '',
    certificateId: cert.certificateId || '',
    verificationCode: cert.certificateId || '',
    issuedAt: issuedDateStr,
    issuedDate: issuedDateStr,
    issued_date: issuedDateStr,
    verificationUrl: `${origin}/verify-certificate/${cert.certificateId}`,
    ...extraData
  };

  const certHtml = renderEditorDataToHtml(editorData, replacements, liveQrDataUrl || null);
  const width = editorData.width || 1200;
  const height = editorData.height || 900;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden;background:#fff}#w{width:${width}px;height:${height}px;transform-origin:top left}</style></head><body><div id="w">${certHtml}</div><script>function adj(){const s=window.innerWidth/${width};document.getElementById('w').style.transform='scale('+s+')';}window.addEventListener('resize',adj);adj();</script></body></html>`;
}

