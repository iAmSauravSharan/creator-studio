"use client";

// Each step is ONE inline-flex unit (dot + label together) so they can
// never visually separate, at any width — that was the root cause of the
// earlier misalignment bug.
export default function Stepper({ steps, currentIndex, onStepClick }: { steps: string[]; currentIndex: number; onStepClick?: (i: number) => void }) {
  return (
    <div className="stepper-wrap">
      <div className="stepper-inner">
        {steps.map((label, i) => {
          const current = i === currentIndex;
          const done = i < currentIndex;
          return (
            <div className="step-unit" key={i} style={{ flex: i < steps.length - 1 ? 1 : "none" }}>
              <button className="step-btn" onClick={() => onStepClick?.(i)} disabled={!onStepClick}>
                <span className={`step-dot ${done ? "done" : current ? "current" : "todo"}`}>
                  {done ? "✓" : i + 1}
                </span>
                <span className={`step-label ${current ? "current" : "notcurrent"}`}>{label}</span>
              </button>
              {i < steps.length - 1 && <span className="step-connector" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
