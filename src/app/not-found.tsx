import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 text-white">
      <div className="rounded-[30px] border border-white/10 bg-slate-950/70 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">404</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.08em]">Page not found</h1>
        <p className="mt-4 text-slate-300">The requested SoulX experience could not be found.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white">
          Return home
        </Link>
      </div>
    </main>
  );
}
