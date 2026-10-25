import { useStrings } from "../lib/language.ts";
import { Scroll } from "./scroll.tsx";

export function PlayHelp({ onClose }: { onClose: () => void }) {
  const strings = useStrings();
  return (
    <Scroll title={strings.play.helpTitle} onClose={onClose}>
      {strings.play.helpModes.map(({ heading, text }) => (
        <section key={heading}>
          <h3>{heading}</h3>
          <p>{text}</p>
        </section>
      ))}
    </Scroll>
  );
}
