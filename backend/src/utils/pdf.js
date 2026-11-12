const PDFDocument = require('pdfkit');
const { generateQrBuffer } = require('./qr');

/**
 * Inject {{variable}} placeholders into a template string
 */
function injectVariables(template, variables = {}) {
  if (!template) return '';
  return String(template).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
    const trimmed = key.trim();
    const value = variables[trimmed];
    return value !== undefined && value !== null ? String(value) : match;
  });
}

/**
 * Resolve remote URL or base64 data URI to Buffer for PDFKit
 */
async function resolveImageBuffer(src) {
  if (!src || typeof src !== 'string') return null;
  if (src.startsWith('data:image/')) {
    const base64 = src.split(',')[1];
    if (!base64) return null;
    return Buffer.from(base64, 'base64');
  }
  if (src.startsWith('http://') || src.startsWith('https://')) {
    let fetchUrl = src;
    if (fetchUrl.includes('res.cloudinary.com') && fetchUrl.includes('/upload/') && !fetchUrl.includes('f_png')) {
      fetchUrl = fetchUrl.replace('/upload/', '/upload/f_png/');
    }
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
  return null;
}

/**
 * Map web font family + bold/italic to PDFKit built-in standard font
 */
function mapPdfFont(fontFamily = 'sans-serif', fontStyle = '') {
  const family = (fontFamily || '').toLowerCase();
  const isBold = fontStyle.includes('bold');
  const isItalic = fontStyle.includes('italic');

  if (family.includes('serif') || family.includes('georgia') || family.includes('times')) {
    if (isBold && isItalic) return 'Times-BoldItalic';
    if (isBold) return 'Times-Bold';
    if (isItalic) return 'Times-Italic';
    return 'Times-Roman';
  }
  if (family.includes('courier') || family.includes('mono')) {
    if (isBold && isItalic) return 'Courier-BoldOblique';
    if (isBold) return 'Courier-Bold';
    if (isItalic) return 'Courier-Oblique';
    return 'Courier';
  }
  if (isBold && isItalic) return 'Helvetica-BoldOblique';
  if (isBold) return 'Helvetica-Bold';
  if (isItalic) return 'Helvetica-Oblique';
  return 'Helvetica';
}

/**
 * Generate Certificate PDF directly from Konva editorData JSON
 */
async function generateCertificatePdfFromEditorData(editorData, variables = {}, status = 'VALID') {
  let data = editorData;
  if (typeof data === 'string') {
    data = JSON.parse(data);
  }
  const { width = 1200, height = 900, background = {}, elements = [] } = data;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: [width, height], margin: 0 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Background
      if (background.type === 'image' && background.value) {
        try {
          const bgBuf = await resolveImageBuffer(background.value);
          if (bgBuf) {
            doc.image(bgBuf, 0, 0, { width, height });
          } else {
            doc.rect(0, 0, width, height).fill('#ffffff');
          }
        } catch {
          doc.rect(0, 0, width, height).fill('#ffffff');
        }
      } else {
        doc.rect(0, 0, width, height).fill(background.value || '#ffffff');
      }

      const sorted = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

      for (const el of sorted) {
        const { x = 0, y = 0, width: elW = 100, height: elH = 50, rotation = 0, opacity = 1, properties = {} } = el;
        doc.save();
        doc.opacity(opacity);

        if (rotation) {
          if (el.type === 'line') {
            doc.rotate(rotation, { origin: [x, y + (properties.strokeWidth || 1) / 2] });
          } else {
            doc.rotate(rotation, { origin: [x + elW / 2, y + elH / 2] });
          }
        }

        try {
          if (el.type === 'shape') {
            const shapeType = properties.shapeType || 'rect';
            const fill = properties.fill && properties.fill !== 'transparent' ? properties.fill : null;
            const stroke = properties.stroke && properties.stroke !== 'transparent' ? properties.stroke : null;
            const strokeWidth = properties.strokeWidth || 0;

            if (shapeType === 'rect') {
              const r = properties.cornerRadius || 0;
              if (r > 0) {
                doc.roundedRect(x, y, elW, elH, r);
              } else {
                doc.rect(x, y, elW, elH);
              }
            } else if (shapeType === 'circle' || shapeType === 'ellipse') {
              doc.ellipse(x + elW / 2, y + elH / 2, elW / 2, elH / 2);
            }

            if (fill && stroke && strokeWidth > 0) {
              doc.lineWidth(strokeWidth).fillAndStroke(fill, stroke);
            } else if (fill) {
              doc.fill(fill);
            } else if (stroke && strokeWidth > 0) {
              doc.lineWidth(strokeWidth).stroke(stroke);
            }
          } else if (el.type === 'line') {
            const stroke = properties.stroke || '#000000';
            const strokeWidth = properties.strokeWidth || 1;
            doc.moveTo(x, y).lineTo(x + elW, y).lineWidth(strokeWidth).stroke(stroke);
          } else if (el.type === 'text') {
            const text = injectVariables(properties.text || '', variables);
            const fontSize = properties.fontSize || 16;
            const pdfFont = mapPdfFont(properties.fontFamily, properties.fontStyle || '');
            doc.font(pdfFont)
               .fontSize(fontSize)
               .fillColor(properties.fill || '#000000')
               .text(text, x, y, {
                 width: elW,
                 align: properties.align || 'left',
                 lineGap: fontSize * 0.2
               });
          } else if (el.type === 'qrcode') {
            const rawValue = injectVariables(properties.value || '', variables);
            const qrBuf = await generateQrBuffer(rawValue || variables.verificationUrl || 'CEMS');
            doc.image(qrBuf, x, y, { width: elW, height: elH });
          } else if (el.type === 'image' || el.type === 'signature') {
            const imgSrc = properties.src || (el.type === 'signature' ? variables.signatureUrl : '');
            if (imgSrc) {
              const imgBuf = await resolveImageBuffer(imgSrc);
              if (imgBuf) {
                doc.image(imgBuf, x, y, { fit: [elW, elH], align: 'center', valign: 'center' });
              }
            }
          }
        } catch (elErr) {
          console.warn('PDF element draw warning:', el.type, elErr.message);
        }

        doc.restore();
      }

      // Draw uploaded signature if template had no signature slot
      const hasSignatureSlot = elements.some((el) => el.type === 'signature');
      if (!hasSignatureSlot && variables.signatureUrl) {
        try {
          const sigBuf = await resolveImageBuffer(variables.signatureUrl);
          if (sigBuf) {
            doc.image(sigBuf, width - 320, height - 220, { fit: [200, 80], align: 'center', valign: 'center' });
          }
        } catch {}
      }

      // Always render Certificate ID on PDF if template doesn't already place it
      const hasCertIdEl = elements.some(
        (el) =>
          el.type === 'text' &&
          (String(el.properties?.text || '').includes('certificateId') ||
            String(el.properties?.text || '').includes('verificationCode') ||
            el.properties?.variable === 'certificateId')
      );
      if (variables.certificateId && !hasCertIdEl) {
        doc.save();
        doc.font('Courier-Bold')
           .fontSize(13)
           .fillColor('#52525b')
           .text(`Certificate ID: ${variables.certificateId}`, 0, height - 74, { width, align: 'center' });
        doc.restore();
      }

      if (status === 'REVOKED') {
        doc.save();
        doc.fontSize(72)
           .font('Helvetica-Bold')
           .fillColor('red')
           .opacity(0.28)
           .rotate(-25, { origin: [width / 2, height / 2] })
           .text('REVOKED - INVALID', width / 2 - 350, height / 2 - 40, { width: 700, align: 'center' });
        doc.restore();
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate Event Registration Ticket PDF
 * @param {Object} data - { registration, event, user }
 * @returns {Promise<Buffer>}
 */
async function generateTicketPdf({ registration, event, user }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A5', layout: 'portrait', margin: 30 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Ticket Header / Border
      doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30)
         .lineWidth(2)
         .strokeColor('#0f172a')
         .stroke();

      // Top Header Banner
      doc.rect(15, 15, doc.page.width - 30, 60)
         .fillColor('#0f172a')
         .fill();

      doc.fillColor('#ffffff')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('COLLEGE EVENT MANAGEMENT SYSTEM', 20, 28, { align: 'center', width: doc.page.width - 40 });

      doc.fontSize(10)
         .font('Helvetica')
         .text('OFFICIAL EVENT ENTRY TICKET', 20, 50, { align: 'center', width: doc.page.width - 40 });

      // Event Info Box
      doc.moveDown(2);
      const startY = 95;

      doc.fillColor('#0f172a')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text(event.title, 30, startY, { width: doc.page.width - 60 });

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#475569')
         .text(`Organized by: ${event.organizingBody?.name || 'College Chapter'}`, 30, startY + 45);

      // Metadata Grid
      const infoY = startY + 70;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text('Date & Time:', 30, infoY);
      doc.font('Helvetica').fillColor('#334155');
      doc.text(`${new Date(event.startDateTime).toLocaleString()} - ${new Date(event.endDateTime).toLocaleTimeString()}`, 110, infoY);

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text('Venue / Mode:', 30, infoY + 18);
      doc.font('Helvetica').fillColor('#334155');
      doc.text(`${event.venue} (${event.mode})`, 110, infoY + 18);

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text('Ticket ID:', 30, infoY + 36);
      doc.font('Helvetica-Bold').fillColor('#0284c7');
      doc.text(registration.ticketCode, 110, infoY + 36);

      // Attendee Info Box
      const attendeeY = infoY + 65;
      doc.rect(25, attendeeY, doc.page.width - 50, 75)
         .fillColor('#f8fafc')
         .fill();

      doc.rect(25, attendeeY, doc.page.width - 50, 75)
         .lineWidth(1)
         .strokeColor('#e2e8f0')
         .stroke();

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);
      doc.text('Attendee Information', 35, attendeeY + 10);

      doc.font('Helvetica').fontSize(9).fillColor('#334155');
      doc.text(`Name: ${user.name}`, 35, attendeeY + 28);
      doc.text(`Roll No: ${user.rollNo || 'N/A'} | Dept: ${user.department || 'N/A'}`, 35, attendeeY + 43);
      doc.text(`Fee Status: Rs. ${registration.feeApplied} (${registration.feeType}) | Status: ${registration.status}`, 35, attendeeY + 58);

      // QR Code Section
      const qrY = attendeeY + 90;
      const qrText = registration.ticketCode;
      const qrBuffer = await generateQrBuffer(qrText);

      doc.image(qrBuffer, (doc.page.width - 130) / 2, qrY, { width: 130, height: 130 });

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#64748b')
         .text('Scan this QR code at event entrance for entry validation', 20, qrY + 138, { align: 'center', width: doc.page.width - 40 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate Verifiable Digital Certificate PDF (Uses template editorData if available, else default Landscape A4)
 * @param {Object} data - { certificate, event, user, signatories, publicUrl }
 * @returns {Promise<Buffer>}
 */
async function generateCertificatePdf({ certificate, event, user, signatories = [], publicUrl }) {
  // If certificate has a template with Konva editorData, render it accurately!
  if (certificate.template?.editorData && certificate.template.editorData.elements) {
    const issuedDateStr = certificate.issueDate ? new Date(certificate.issueDate).toLocaleDateString() : new Date().toLocaleDateString();
    const extraData = (certificate.credentialData && typeof certificate.credentialData === 'object') ? certificate.credentialData : {};
    const variables = {
      recipientName: user?.name || certificate.recipientName,
      recipient_name: user?.name || certificate.recipientName,
      recipientEmail: certificate.recipientEmail || user?.email || '',
      eventTitle: certificate.eventTitle || event?.title || '',
      courseTitle: certificate.eventTitle || event?.title || '',
      certificateId: certificate.certificateId,
      verificationCode: certificate.certificateId,
      verificationUrl: publicUrl,
      issuedAt: issuedDateStr,
      issuedDate: issuedDateStr,
      issued_date: issuedDateStr,
      type: certificate.type || 'PARTICIPATION',
      ...extraData
    };
    return generateCertificatePdfFromEditorData(certificate.template.editorData, variables, certificate.status);
  }

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Decorative double borders
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
         .lineWidth(3)
         .strokeColor('#0f172a')
         .stroke();

      doc.rect(26, 26, pageWidth - 52, pageHeight - 52)
         .lineWidth(1)
         .strokeColor('#d97706')
         .stroke();

      // Header Institution / Chapter
      doc.moveDown(1.5);
      doc.fillColor('#0f172a')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text(event?.organizingBody?.name ? event.organizingBody.name.toUpperCase() : 'COLLEGE OF ENGINEERING & TECHNOLOGY', 0, 50, { align: 'center', width: pageWidth });

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#64748b')
         .text('COLLEGE EVENT MANAGEMENT SYSTEM (CEMS)', 0, 72, { align: 'center', width: pageWidth });

      // Certificate Title
      doc.moveDown(1);
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor('#b45309')
         .text('CERTIFICATE OF ' + (certificate.type || 'PARTICIPATION'), 0, 115, { align: 'center', width: pageWidth });

      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#475569')
         .text('This is proudly presented to', 0, 160, { align: 'center', width: pageWidth });

      // Recipient Name
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#0f172a')
         .text(user?.name || certificate.recipientName, 0, 185, { align: 'center', width: pageWidth });

      // Underline for name
      const nameWidth = doc.widthOfString(user?.name || certificate.recipientName);
      doc.moveTo((pageWidth - nameWidth) / 2 - 20, 215)
         .lineTo((pageWidth + nameWidth) / 2 + 20, 215)
         .lineWidth(1)
         .strokeColor('#cbd5e1')
         .stroke();

      // Certificate body description
      const titleText = event?.title || certificate.eventTitle;
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#334155')
         .text(
           `for actively participating in and successfully completing\n"${titleText}"`,
           100,
           230,
           { align: 'center', width: pageWidth - 200, lineGap: 6 }
         );

      if (event?.startDateTime) {
        const eventDateStr = new Date(event.startDateTime).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.fontSize(11)
           .font('Helvetica-Oblique')
           .fillColor('#64748b')
           .text(`Conducted on ${eventDateStr}${event.venue ? ` at ${event.venue}` : ''}`, 0, 280, { align: 'center', width: pageWidth });
      }

      // Signatories section (Bottom Left & Bottom Center-Right)
      const sigY = pageHeight - 120;
      const customSignerName = certificate.credentialData?.signatoryName;
      const customSigUrl = certificate.credentialData?.signatureUrl;
      const defaultSigners = signatories.length > 0 ? signatories : [
        { name: customSignerName || 'Dr. Ramesh Kumar', title: 'Authorized Signatory', signatureUrl: customSigUrl },
        { name: 'Prof. Ananya Sen', title: 'Faculty Coordinator' }
      ];

      for (let idx = 0; idx < Math.min(defaultSigners.length, 2); idx++) {
        const sig = defaultSigners[idx];
        const xPos = 80 + idx * 260;

        const sigImg = sig.signatureUrl || (idx === 0 ? customSigUrl : null);
        if (sigImg) {
          try {
            const sigBuf = await resolveImageBuffer(sigImg);
            if (sigBuf) {
              doc.image(sigBuf, xPos + 20, sigY - 52, { fit: [140, 48], align: 'center', valign: 'bottom' });
            }
          } catch {}
        }

        doc.moveTo(xPos, sigY)
           .lineTo(xPos + 180, sigY)
           .lineWidth(1)
           .strokeColor('#475569')
           .stroke();

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#0f172a')
           .text(sig.name, xPos, sigY + 6, { width: 180, align: 'center' });

        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#64748b')
           .text(sig.title, xPos, sigY + 20, { width: 180, align: 'center' });
      }

      // Verification QR Code & ID (Bottom Right)
      const qrBuffer = await generateQrBuffer(publicUrl || `http://localhost:3000/verify-certificate/${certificate.certificateId}`);
      const qrSize = 75;
      const qrX = pageWidth - 160;
      const qrY = pageHeight - 140;

      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#0f172a')
         .text('VERIFY AUTHENTICITY', qrX - 25, qrY + qrSize + 5, { width: qrSize + 50, align: 'center' });

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#0284c7')
         .text(certificate.certificateId, qrX - 25, qrY + qrSize + 16, { width: qrSize + 50, align: 'center' });

      // Revoked watermark if certificate is revoked
      if (certificate.status === 'REVOKED') {
        doc.save();
        doc.fontSize(60)
           .font('Helvetica-Bold')
           .fillColor('red')
           .opacity(0.3)
           .rotate(-30, { origin: [pageWidth / 2, pageHeight / 2] })
           .text('REVOKED - INVALID', pageWidth / 2 - 250, pageHeight / 2 - 30);
        doc.restore();
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateTicketPdf,
  generateCertificatePdf,
  generateCertificatePdfFromEditorData
};
