export function PageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-aurora-light dark:bg-aurora-dark" />
      <div className="absolute inset-0 bg-grid-overlay opacity-60 dark:opacity-100" />
      <div className="absolute -top-40 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-400/10" />
      <div className="absolute top-1/3 left-0 h-[420px] w-[420px] rounded-full bg-purple-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[480px] w-[480px] rounded-full bg-blue-400/10 blur-3xl" />
    </div>
  );
}
