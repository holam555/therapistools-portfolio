import { useEffect } from "react";
import { markTourSeen, startTour, tourSeen, type TourStep } from "../../../../shared/tour.js";

/**
 * The Report tab's guided tour: seven spotlight steps over the parts marked
 * data-tour="…", drawn by the shared tour (shared/tour.js). Shown once (the
 * flag holds nothing but "done") and again from "Show me around".
 */

const TOUR_KEY = "easyiep.tour.done";

export const tourDone = () => tourSeen(TOUR_KEY);
export const markTourDone = () => markTourSeen(TOUR_KEY);

export const TOUR_STEPS: TourStep[] = [
  { target: "setup", title: "Set up the report", text: "Evaluation or annual review, the result, the grade, he or she. The draft on the right changes as you choose." },
  { target: "assessments", title: "Tick what you did", text: "Each assessment adds its section to the draft. Checklists and rating grids open under it, and their sentences are written from your ratings." },
  { target: "preview", title: "Fill the yellow blanks", text: "Click a blank to pick from your sample sentences or type your own. [STUDENT] marks where the name goes, to be typed in Word." },
  { target: "edit", title: "Make the template yours", text: "Edit template changes any wording, blank or sample sentence, and when a paragraph appears. Greyed paragraphs are ones this report leaves out." },
  { target: "download", title: "Download the Word draft", text: "Every fixed sentence is written in. Blanks you did not fill stay yellow for you to finish." },
  { target: "prompts", title: "Finish with AI, one section at a time", text: "Copy a prompt, paste it into Gemini with your notes, and paste the answer into Word. This tool itself never calls an AI." },
  { target: "settings", title: "Settings", text: "Sign in to keep your template on any computer, export a backup, or start over with a different template." },
];

export function Tour({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const tour = startTour(TOUR_STEPS, {
      onDone: () => {
        markTourDone();
        onClose();
      },
    });
    return () => tour.stop();
    // Runs once for the life of the component; the host unmounts it to stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
