"use client";

export interface Step {
  icon: string;
  label: string;
}

/** Star stepper showing kids where they are in the adventure. */
export default function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <nav aria-label="Progress" className="rounded-2xl bg-white/80 p-3 shadow-sm">
      <ol className="flex items-center justify-center gap-1 sm:gap-2">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.label} className="flex items-center gap-1 sm:gap-2">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xl shadow-sm ${
                    active
                      ? "bg-amber-400 ring-4 ring-amber-200"
                      : done
                        ? "bg-green-400"
                        : "bg-slate-200"
                  }`}
                >
                  {done ? "⭐" : s.icon || i + 1}
                </span>
                <span
                  className={`mt-1 text-[11px] font-bold sm:text-xs ${
                    active ? "text-amber-600" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span className={`pb-5 text-lg ${done ? "text-green-400" : "text-slate-300"}`}>
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
