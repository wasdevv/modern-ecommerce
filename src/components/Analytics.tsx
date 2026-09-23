'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { CONSENT_KEY, GA4_ID, GTM_ID } from '@/lib/tracking';

type Consent = 'granted' | 'denied' | null;

// Loads GTM (or GA4 when GTM isn't set) only after an explicit "Accept".
// Page views come from GA4 enhanced measurement / a GTM History Change trigger, not from here.
export default function Analytics() {
  const [consent, setConsent] = useState<Consent | 'unknown'>('unknown');

  useEffect(() => {
    try {
      setConsent(localStorage.getItem(CONSENT_KEY) as Consent);
    } catch {
      setConsent(null);
    }
  }, []);

  if (!GTM_ID && !GA4_ID) return null;

  const decide = (value: 'granted' | 'denied') => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {}
    setConsent(value);
  };

  if (consent === 'granted') {
    return GTM_ID ? (
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(GTM_ID)});`}
      </Script>
    ) : (
      <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`} strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(GA4_ID)});`}
        </Script>
      </>
    );
  }

  if (consent !== null) return null; // 'denied', or still reading storage

  return (
    <div role="dialog" aria-label="Consentimento de analytics" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl border border-ink/10 bg-white p-4 shadow-lg">
      <p className="text-sm text-ink/75">
        Esta demo pode enviar eventos anônimos de e-commerce (visualização de produto, carrinho, compra) ao Google Analytics. Nome e email nunca são enviados.
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => decide('granted')} className="btn">
          Aceitar
        </button>
        <button onClick={() => decide('denied')} className="btn-outline">
          Recusar
        </button>
      </div>
    </div>
  );
}
