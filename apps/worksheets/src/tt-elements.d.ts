// The shared <tt-suite-bar> custom element (shared/suite-bar.js).
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "tt-suite-bar": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { current?: string };
    }
  }
}
