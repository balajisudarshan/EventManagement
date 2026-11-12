import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { buildCertificatePreviewSrcDoc } from '../utils/editorDataRenderer';

/**
 * Renders a certificate preview inside a scaled iframe using a dynamically
 * generated QR code pointing to the current browser origin so verification
 * links never point to a stale localhost domain.
 */
export default function CertificatePreviewFrame({
  editorData,
  cert,
  title = 'Certificate Live Preview',
  height = 540,
  className = 'w-full border border-zinc-300 dark:border-zinc-800 bg-white'
}) {
  const [liveQrDataUrl, setLiveQrDataUrl] = useState(null);

  useEffect(() => {
    let active = true;
    if (typeof window === 'undefined' || !cert?.certificateId) {
      setLiveQrDataUrl(null);
      return;
    }

    const verifyUrl = `${window.location.origin}/verify-certificate/${cert.certificateId}`;
    QRCode.toDataURL(verifyUrl, { width: 240, margin: 1 })
      .then((dataUrl) => {
        if (active) setLiveQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setLiveQrDataUrl(null);
      });

    return () => {
      active = false;
    };
  }, [cert?.certificateId]);

  const srcDoc = useMemo(
    () => buildCertificatePreviewSrcDoc(editorData, cert, liveQrDataUrl),
    [editorData, cert, liveQrDataUrl]
  );

  return (
    <iframe
      title={title}
      srcDoc={srcDoc}
      className={className}
      style={{ height }}
    />
  );
}

