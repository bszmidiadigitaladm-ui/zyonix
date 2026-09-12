/**
 * Decorative ambient glow — a CSS stand-in for the reference brand's glossy
 * 3D glass-ribbon renders. Absolutely positioned; place inside a `relative`
 * container and put content in a sibling with `relative z-10`.
 */
export function GlowBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-[-10%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />
      <div className="absolute right-[-10%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,var(--background)_70%)]" />
    </div>
  );
}
