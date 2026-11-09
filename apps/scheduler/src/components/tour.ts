import type { TourStep } from '../../../../shared/tour.js';

/** The Gap Board's guided tour (shared/tour.js). Shown once, under this key; "Show me around" in the top bar replays it. */
export const SCHEDULER_TOUR_KEY = 'gapboard-tour-done';

export const SCHEDULER_TOUR: TourStep[] = [
  {
    target: 'nav',
    title: 'The screens, in setup order',
    text: 'School Setup holds the school day and grade schedules, Providers your team’s on-site time, Students their IDs and service minutes. Then the Gap Board is where you book.',
  },
  { target: 'school', title: 'One or more schools', text: 'Each school keeps its own students, providers and schedules. Switch or add one here.' },
  { target: 'students-shown', title: 'Choose whose calendars to see', text: 'Tick students to show their weeks side by side.' },
  {
    target: 'board',
    title: 'Green is free for everyone shown',
    text: 'Click a green gap to book a session. It blocks that time on your calendar and on every student’s, so nothing double-books.',
  },
  { target: 'plan', title: 'Auto-Plan', text: 'Suggests a week of sessions from each student’s service minutes, inside the open gaps.' },
  { target: 'tracker', title: 'Tracker', text: 'Log sessions as they happen and keep IEP deadlines in view.' },
  {
    target: 'backup',
    title: 'Everything stays in this browser',
    text: 'Export a backup now and then; Import brings it back on another computer. Students are numbers here, never names.',
  },
];
