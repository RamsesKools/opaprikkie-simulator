import { useEffect, useId, useRef, type ReactNode } from "react";
import { useStrings } from "../lib/language.ts";

type Props = { title: string; onClose: () => void; children: ReactNode };

/** A modal old paper scroll: the rolled header and footer stay put while the text scrolls. */
export function Scroll({ title, onClose, children }: Props) {
  const strings = useStrings();
  const titleId = useId();
  const body = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // The text and Close are the only stops, so Tab swaps between them.
      if (event.key === "Tab") {
        event.preventDefault();
        (document.activeElement === close.current ? body : close).current?.focus();
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
        className="scroll"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="roll top">
          <h2 id={titleId}>{title}</h2>
        </div>
        <div className="paper" ref={body} tabIndex={0} role="region" aria-labelledby={titleId}>
          {children}
        </div>
        <div className="roll bottom">
          <button type="button" onClick={onClose} ref={close}>
            {strings.close}
          </button>
        </div>
      </div>
    </div>
  );
}
