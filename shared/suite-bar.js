/**
 * <tt-suite-bar current="scheduler"> : the slim Therapistools bar shown at the
 * top of every page, with the logo and a switcher between the tools.
 *
 * A framework-free custom element so the static home page and all three React
 * apps share one implementation. It renders into its own light DOM (styled by
 * brand.css) and never touches the network.
 */
import { BRAND, SITE_ORIGIN, TOOLS } from "./brand.js";

/** The logo mark: a T whose stem is a pencil (shared/logo.svg, without the teal square). */
export const MARK_SVG =
  '<svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true"><rect x="13" y="12" width="38" height="10" rx="5" fill="#fff"/><rect x="27" y="21" width="10" height="4" fill="#ee7c2b"/><rect x="27" y="25" width="10" height="21" fill="#fff"/><path d="M27 46h10l-5 9z" fill="#f4e3c4"/><path d="M30 51.2h4L32 55z" fill="#1b5b54"/></svg>';

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Links work on the site; from a downloaded offline file they point at the live site instead. */
function href(path) {
  return typeof location !== "undefined" && location.protocol === "file:" ? SITE_ORIGIN + path : path;
}

export function renderSuiteBar(current) {
  const tools = TOOLS.map((t) => {
    const on = t.id === current;
    return `<a class="tt-suite-tool${on ? " is-current" : ""}" href="${href(t.path)}" style="--tool:var(--tt-cat-${t.id})"${on ? ' aria-current="page"' : ""}><span class="tt-suite-dot" aria-hidden="true"></span>${escape(t.name)}</a>`;
  }).join("");
  return `<div class="tt-suite-inner">
  <a class="tt-suite-brand" href="${href("/")}" aria-label="${escape(BRAND)} home"><span class="tt-mark">${MARK_SVG}</span><span class="tt-wordmark">${escape(BRAND)}</span></a>
  <nav class="tt-suite-tools" aria-label="${escape(BRAND)} tools">${tools}</nav>
</div>`;
}

if (typeof window !== "undefined" && window.customElements && !window.customElements.get("tt-suite-bar")) {
  class SuiteBar extends HTMLElement {
    static get observedAttributes() {
      return ["current"];
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    render() {
      this.innerHTML = renderSuiteBar(this.getAttribute("current") || "");
    }
  }
  window.customElements.define("tt-suite-bar", SuiteBar);
}
