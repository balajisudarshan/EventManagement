import React, { useState } from 'react';
import { api } from '../lib/api';
import { Ticket, Download, Calendar, MapPin, CheckCircle, Clock, X, AlertCircle } from 'lucide-react';

export default function TicketModal({ registration, isOpen, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !registration) return null;

  const event = registration.event || {};
  const isConfirmed = registration.status === 'CONFIRMED';
  const isWaitlisted = registration.status === 'WAITLISTED';

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const blob = await api.download(`/registrations/${registration.id}/ticket.pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${registration.ticketCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download ticket PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rounded-none bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-none bg-black dark:bg-white text-white dark:text-black border border-zinc-800">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-950 dark:text-white font-mono">EVENT ENTRY PASS</h3>
              <p className="text-[10px] font-mono text-zinc-500 uppercase">OFFICIAL CREDENTIAL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-none border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ticket Body */}
        <div className="p-5 space-y-5">
          {/* Status Banner */}
          <div
            className={`p-3 rounded-none border flex items-center gap-3 ${
              isConfirmed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : isWaitlisted
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {isConfirmed ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : isWaitlisted ? (
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            )}
            <div className="text-xs font-mono">
              <span className="font-bold uppercase tracking-wider block">
                STATUS: {registration.status}
              </span>
              <span className="text-[11px] opacity-90 block mt-0.5">
                {isConfirmed
                  ? 'Seat reserved. Scan QR code upon check-in.'
                  : isWaitlisted
                  ? 'Queued on waitlist. Automatic promotion if a seat opens.'
                  : 'Registration cancelled.'}
              </span>
            </div>
          </div>

          {/* QR Code Presentation */}
          {isConfirmed && registration.qrCode && (
            <div className="flex flex-col items-center justify-center p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <div className="p-2 bg-white rounded-none border border-zinc-300">
                <img
                  src={registration.qrCode}
                  alt={`QR Code for ${registration.ticketCode}`}
                  className="w-44 h-44 object-contain"
                />
              </div>
              <div className="mt-2.5 text-center font-mono">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">
                  TICKET CODE
                </span>
                <p className="text-sm font-bold text-zinc-950 dark:text-white mt-0.5">
                  {registration.ticketCode}
                </p>
              </div>
            </div>
          )}

          {/* Event & Attendee Info */}
          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-zinc-500 font-mono text-[10px] uppercase">EVENT</span>
              <p className="font-semibold text-sm text-zinc-950 dark:text-white">{event.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-800 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">DATE</span>
                <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                  {event.startDateTime ? new Date(event.startDateTime).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">VENUE</span>
                <p className="text-zinc-800 dark:text-zinc-200 font-medium truncate">{event.venue || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-800 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">FEE</span>
                <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                  ₹{registration.feeApplied} ({registration.feeType})
                </p>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">ATTENDANCE</span>
                <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                  {registration.attended ? 'Present' : 'Not marked'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-none text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            Close
          </button>
          {isConfirmed && (
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-xs font-mono font-semibold bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'GENERATING...' : 'DOWNLOAD PDF'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
