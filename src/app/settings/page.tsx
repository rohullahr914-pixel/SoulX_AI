const settingsGroups = [
  { title: "Profile", items: ["Display name", "Username", "Avatar"] },
  { title: "Language", items: ["English", "فارسی", "دری", "العربية", "Türkçe", "Español", "Français", "Deutsch"] },
  { title: "Theme", items: ["Dark mode", "Cyan glow", "High contrast"] },
  { title: "Memory controls", items: ["Manage memories", "Auto-save preferences", "Delete stored memory"] },
  { title: "Privacy", items: ["Public profiles", "Private conversations", "Data controls"] },
  { title: "Account", items: ["Security", "Preferences", "Connected accounts"] },
];

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Settings</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.07em]">Fine-tune your SoulX experience</h1>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {settingsGroups.map((group) => (
            <section key={group.title} className="rounded-[24px] border border-white/10 bg-white/3 p-5">
              <h2 className="text-lg font-bold tracking-[-0.04em] text-white">{group.title}</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {group.items.map((item) => (
                  <li key={item} className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2">{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
