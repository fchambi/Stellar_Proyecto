export function WavoLogo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="wavo-gradient grid size-7 place-items-center rounded-lg shadow-lg shadow-primary/20">
        <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12c2.5-5 5-5 7.5 0s5 5 7.5 0 3.5-3 5-1" />
        </svg>
      </span>
      <span className="text-base font-semibold tracking-tight">Wavo</span>
    </span>
  );
}
