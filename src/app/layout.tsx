import type { Metadata, Viewport } from "next";
import { SITE_URL, SITE_DESCRIPTION } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import Link from "next/link";
import Script from "next/script";
import { Sparkles } from "lucide-react";
import { SocialLinks } from "@/components/social-links";
import { MobileNav } from "@/components/mobile-nav";
import { AuthActions } from "@/components/auth-actions";
import { MobileAccountMenu } from "@/components/mobile-account-menu";
import { AppShell } from "@/components/app-shell";
import { ThemeSelector } from "@/components/theme-switcher";
import "./globals.css";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

const geist = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const navItems = [
  { label: "Explore", href: "/explore" },
  { label: "Rooms", href: "/room" },
  { label: "Create", href: "/create" },
  { label: "Community", href: "/community" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "SoulX — One AI. A Thousand Minds.", template: "%s | SoulX" },
  description: SITE_DESCRIPTION,
  applicationName: "SoulX AI",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "SoulX AI", statusBarStyle: "black-translucent" },
  openGraph: { type: "website", siteName: "SoulX", title: "SoulX — One AI. A Thousand Minds.", description: SITE_DESCRIPTION, images: [{ url: "/social-preview", width: 1200, height: 630, alt: "SoulX — One AI. A Thousand Minds." }] },
  twitter: { card: "summary_large_image", title: "SoulX — One AI. A Thousand Minds.", description: SITE_DESCRIPTION, images: ["/social-preview"] },
};

export const viewport: Viewport = {
  themeColor: "#020817",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="cosmic" data-scroll-behavior="smooth" className={cn("font-sans antialiased", geist.variable)}>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-400/30 selection:text-white">
        <a href="#page-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:border focus:border-cyan-400/40 focus:bg-slate-950 focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-cyan-100">Skip to content</a>
        <JsonLd data={{ "@context": "https://schema.org", "@graph": [
          { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "SoulX", url: SITE_URL, logo: `${SITE_URL}/brand/soulx-logo.webp` },
          { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "SoulX", url: SITE_URL, description: SITE_DESCRIPTION, publisher: { "@id": `${SITE_URL}/#organization` } },
        ] }} />
        <AppShell>
          <div className="theme-shell relative flex min-h-screen flex-col bg-[#020817] text-white">
            <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-3 pt-[max(0.85rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5 lg:px-8">
              <header className="sticky top-3 z-50 rounded-[28px] border border-cyan-300/20 bg-slate-950/80 px-3 py-3 shadow-[0_12px_45px_rgba(2,8,23,0.5)] backdrop-blur-2xl transition-all duration-200 ease-out hover:shadow-[0_18px_55px_rgba(34,211,238,0.12)] sm:top-5 sm:px-5 lg:px-7">
                <div className="flex items-center justify-between gap-3">
                  <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-2xl outline-none ring-0 transition-opacity duration-200 hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 sm:gap-4">
                    <img src="/brand/soulx-logo.webp" width={48} height={48} decoding="async" alt="SOULX" className="h-11 w-11 shrink-0 rounded-2xl shadow-[0_0_24px_rgba(34,211,238,0.22)] sm:h-12 sm:w-12" />
                    <div className="min-w-0">
                      <div className="text-lg font-black tracking-[-0.07em] text-white sm:text-xl">
                        SOULX
                      </div>
                      <div className="hidden text-[9px] uppercase tracking-[0.22em] text-cyan-200/70 sm:block">One AI · A thousand minds</div>
                    </div>
                  </Link>

                  <nav aria-label="Main navigation" className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/2.5 p-1 text-sm text-slate-300 lg:flex">
                    {navItems.map((item) => (
                      <Link key={item.href} href={item.href} className="rounded-full px-4 py-2.5 transition-colors duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">
                        {item.label}
                      </Link>
                    ))}
                  </nav>

                  <div className="flex shrink-0 items-center gap-1.5 min-[390px]:gap-2">
                    <div className="hidden sm:block"><ThemeSelector compact /></div>
                    <MobileAccountMenu />
                    <MobileNav items={navItems} />
                    <div className="hidden items-center gap-2 lg:flex"><AuthActions /></div>
                  </div>
                </div>
              </header>

              <main id="page-content" tabIndex={-1} className="relative z-10 flex-1 pt-6 sm:pt-8 lg:pt-10">
                {children}
              </main>

              <footer className="relative z-10 mt-8 rounded-[28px] border border-white/10 bg-slate-950/75 px-5 py-6 text-slate-300 shadow-[0_0_20px_rgba(15,23,42,0.8)] sm:px-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-center gap-3">
                    <img src="/brand/soulx-logo.webp" width={48} height={48} decoding="async" alt="SOULX" className="h-11 w-11 rounded-xl" />
                    <div>
                      <div className="text-lg font-black tracking-[-0.06em] text-white">SOULX</div>
                      <div className="text-[9px] uppercase tracking-[0.28em] text-slate-400">One AI. A thousand minds</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between xl:flex-1 xl:justify-center">
                    <div className="flex flex-wrap items-center gap-5 text-sm">
                      {navItems.map((item) => (
                        <Link key={item.href} href={item.href} className="transition-colors duration-200 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    <SocialLinks />
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    One AI. A Thousand Minds.
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </AppShell>
      </body>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-X95L5NXFTN"
        strategy="lazyOnload"
      />
      <Script id="google-analytics-soulx" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-X95L5NXFTN');
        `}
      </Script>
    </html>
  );
}
