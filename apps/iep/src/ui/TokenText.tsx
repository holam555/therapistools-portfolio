import type { Library } from "../model/types";
import { isReservedToken, parseTokens } from "../model/template";

/** Shows template text with {{tokens}} highlighted. Unknown variables are flagged. */
export function TokenText({ text, lib }: { text: string; lib: Library }) {
  const parts: React.ReactNode[] = [];
  let pos = 0;
  parseTokens(text).forEach((t, i) => {
    if (t.start > pos) parts.push(text.slice(pos, t.start));
    const reserved = isReservedToken(t.name);
    const known = reserved || lib.variables.some((v) => v.name === t.name);
    parts.push(
      <span key={i} className={`tok ${reserved ? "tok-reserved" : known ? "tok-var" : "tok-unknown"}`} title={known ? t.name : `"${t.name}" is not defined yet`}>
        {t.raw}
      </span>,
    );
    pos = t.end;
  });
  if (pos < text.length) parts.push(text.slice(pos));
  return <span className="token-text">{parts}</span>;
}
