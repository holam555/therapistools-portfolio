/**
 * Brand facts shared by every Therapistools app and the home page.
 * This is the one place the name, the address and the tool list live.
 * Plain JavaScript with no imports, so any app can use it.
 */
export const BRAND = "Therapistools";
export const SITE_ORIGIN = "https://www.therapistools.com";
export const TAGLINE = "Free tools for K-12 educators and school therapists";

/** The tools, in display order: plan, write, print. Each tool's color is --tt-cat-<id> in brand.css. */
export const TOOLS = [
  { id: "scheduler", name: "Scheduler", path: "/scheduler/", blurb: "Caseload gaps and session booking" },
  { id: "iep", name: "IEP Writer", path: "/iep/", blurb: "IEP sections from your own sentences" },
  { id: "worksheets", name: "Worksheets", path: "/worksheets/", blurb: "Printable practice worksheets" },
];

/** The one privacy page for the whole site. Tool sections: #worksheets, #scheduler, #iep. */
export const PRIVACY_PATH = "/privacy/";

/** Online forms (hosted by Tally) people can choose to open. Nothing is sent unless they submit one. */
export const FEEDBACK_URL = "https://tally.so/r/VLWjRj";
export const UPDATES_URL = "https://tally.so/r/ODxlpY";
