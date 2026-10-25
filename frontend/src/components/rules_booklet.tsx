import { useStrings } from "../lib/language.ts";
import { Scroll } from "./scroll.tsx";

export function RulesBooklet({ onClose }: { onClose: () => void }) {
  const strings = useStrings();
  return (
    <Scroll title={strings.booklet.title} onClose={onClose}>
      {strings.booklet.sections.map(({ heading, text }) => (
        <section key={heading}>
          <h3>{heading}</h3>
          <p>{text}</p>
        </section>
      ))}
    </Scroll>
  );
}
