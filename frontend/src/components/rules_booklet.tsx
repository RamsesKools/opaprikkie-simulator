import { useEffect, useRef } from "react";
import { strings } from "../lib/strings.ts";

export function RulesBooklet({ onClose }: { onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // Close is the only control, so Tab keeps focus there.
      if (event.key === "Tab") {
        event.preventDefault();
        close.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement) opener.focus();
    };
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
        <button type="button" onClick={onClose} ref={close}>
          {strings.close}
        </button>
      </div>
    </div>
  );
}
