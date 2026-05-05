"use client";
import { Toaster } from "@ui/components/core/toaster";
import { ServerProvider } from "@ui/Providers/ServerProvider";
import "@ui/styles/globals.css";
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          dangerouslySetInnerHTML={{
            __html: `
           var _smartsupp = _smartsupp || {};
_smartsupp.key = '936a0f3feac7e05e68b117887a45363dda48c67d';
window.smartsupp||(function(d) {
  var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
  s=d.getElementsByTagName('script')[0];c=d.createElement('script');
  c.type='text/javascript';c.charset='utf-8';c.async=true;
  c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
})(document);
          `,
          }}
        />
        <Script
          id="gtm-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MVGN2GW');
    `,
          }}
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Red+Hat+Display:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <title>QuickJOBS</title>
        <meta
          name="description"
          content="U nás zaměstnavatel nemusí čekat dny na odezvy. Nemálo zaměstnavatelů našlo přes QuickJOBS brigádníka do několika minut. Rekord máme dokonce 2 minuty."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:locale" content="cs_CZ" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="QuickJOBS" />
        <meta
          property="og:description"
          content="U nás zaměstnavatel nemusí čekat dny na odezvy. Nemálo zaměstnavatelů našlo přes QuickJOBS brigádníka do několika minut. Rekord máme dokonce 2 minuty."
        />
        <meta property="og:image" content="/images/og-image.png" />
        <link rel="icon" href="/favicon.ico" />
        <style>{`
          [data-testid="widgetButtonFrame"] {
            bottom: 100px !important;
          }
        `}</style>
      </head>
      <body className="font-sans">
        {/* <!-- Google Tag Manager (noscript) --> */}
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MVGN2GW"
            height="0" width="0" style={{ display: "none", visibility: "hidden" }}></iframe>
        </noscript>
        {/* <!-- End Google Tag Manager (noscript) --> */}
        <ServerProvider>
          <div className="h-screen overflow-hidden">{children}</div>
          <Toaster />
        </ServerProvider>
      </body>
    </html>
  );
}
