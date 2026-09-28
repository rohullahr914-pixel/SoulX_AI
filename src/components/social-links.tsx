import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.35" cy="6.65" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M14.5 3v10.6a3.85 3.85 0 1 1-3.85-3.85c.45 0 .88.08 1.28.22" />
      <path d="M14.5 3c.67 2.2 2.3 3.88 4.5 4.62" />
    </svg>
  );
}

function TelegramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m21 3-7.5 18-3.8-7.7L2 9.5 21 3Z" />
      <path d="m9.7 13.3 4.5-4.2" />
    </svg>
  );
}

const socialLinks = [
  { name: "Instagram", href: "https://www.instagram.com/soulx_ai", Icon: InstagramIcon },
  { name: "TikTok", href: "https://www.tiktok.com/@soulx_ai", Icon: TikTokIcon },
  { name: "Telegram", href: "https://t.me/PersonaXAI_bot", Icon: TelegramIcon },
] as const;

type SocialLinksProps = {
  className?: string;
};

export function SocialLinks({ className = "" }: SocialLinksProps) {
  return (
    <section aria-label="Follow SoulX on social media" className={`flex flex-wrap items-center gap-3 ${className}`}>
      <p className="mr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Follow SoulX</p>
      <div className="flex items-center gap-2">
        {socialLinks.map(({ name, href, Icon }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Follow SoulX on ${name} (opens in a new tab)`}
            className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-slate-300 shadow-[0_0_0_rgba(34,211,238,0)] transition-[transform,border-color,background-color,color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-400/[0.09] hover:text-cyan-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Icon className="h-[17px] w-[17px] transition-transform duration-200 group-hover:scale-110" />
            <span className="sr-only">{name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
