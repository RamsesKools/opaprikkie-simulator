import { useEffect } from "react";
import { strings } from "../lib/strings.ts";

export function RulesBooklet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="booklet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booklet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="booklet-title">{strings.booklet.title}</h2>
        {strings.booklet.sections.map(({ heading, text }) => (
          <section key={heading}>
            <h3>{heading}</h3>
            <p>{text}</p>
          </section>
        ))}
        <button type="button" onClick={onClose} autoFocus>
          {strings.close}
        </button>
      </div>
    </div>
  );
}
