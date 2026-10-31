const PDFDocument = require('pdfkit');
const { generateQrBuffer } = require('./qr');

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
 * Generate Verifiable Digital Certificate PDF (Landscape A4)
 * @param {Object} data - { certificate, event, user, signatories, publicUrl }
 * @returns {Promise<Buffer>}
 */
async function generateCertificatePdf({ certificate, event, user, signatories = [], publicUrl }) {
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
         .text(event.organizingBody?.name ? event.organizingBody.name.toUpperCase() : 'COLLEGE OF ENGINEERING & TECHNOLOGY', 0, 50, { align: 'center', width: pageWidth });

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
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#334155')
         .text(
           `for actively participating in and successfully completing the\n"${event.title}"`,
           100,
           230,
           { align: 'center', width: pageWidth - 200, lineGap: 6 }
         );

      const eventDateStr = new Date(event.startDateTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.fontSize(11)
         .font('Helvetica-Oblique')
         .fillColor('#64748b')
         .text(`Conducted on ${eventDateStr} at ${event.venue}`, 0, 280, { align: 'center', width: pageWidth });

      // Signatories section (Bottom Left & Bottom Center-Right)
      const sigY = pageHeight - 120;
      const defaultSigners = signatories.length > 0 ? signatories : [
        { name: 'Dr. Ramesh Kumar', title: 'Dean of Student Affairs' },
        { name: 'Prof. Ananya Sen', title: 'Faculty Coordinator' }
      ];

      defaultSigners.slice(0, 2).forEach((sig, idx) => {
        const xPos = 80 + idx * 260;
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
      });

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
  generateCertificatePdf
};

