/**
 * <tt-suite-bar current="scheduler"> : the slim Therapistools bar shown at the
 * top of every page, with the logo and a switcher between the tools.
 *
 * A framework-free custom element so the static home page and all three React
 * apps share one implementation. It renders into its own light DOM (styled by
 * brand.css) and never touches the network.
 */
import { BRAND, SITE_ORIGIN, TOOLS } from "./brand.js";

/** The logo mark: three squares and a circle, inherited from the worksheet app. */
export const MARK_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><circle cx="17.5" cy="17.5" r="3.5"/></svg>';

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
