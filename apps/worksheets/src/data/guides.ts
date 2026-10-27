import { Goal } from '@/data/templates';

/**
 * /guides articles — the "parent problem intent" content space (see
 * .claude/skills/seo-content). Each guide is pure data; GuidePage renders it,
 * it's prerendered for crawlers/AI, and it links out to the free worksheets
 * that solve the problem (the growth loop).
 *
 * Writing standards live in the skill and are NON-NEGOTIABLE: never diagnose,
 * age claims are ranges, never contradict "see your OT/pediatrician", every
 * guide ends with the educational-not-medical line (rendered by GuidePage).
 */
export interface GuideSection {
  heading: string;
  paragraphs: string[];
}

export interface Guide {
  slug: string;
  /** <h1> / page title base. */
  title: string;
  /** Short label for nav/footer/related links. */
  navLabel: string;
  /** <160 chars, keyword early. */
  metaDescription: string;
  /** ISO date of last review. */
  updated: string;
  relatedGoals: Goal[];
  /** Template ids to surface as "try it now" cards. */
  relatedTemplates: string[];
  sections: GuideSection[];
  /** Optional age-expectation table (ranges only). */
  milestones?: { age: string; expect: string }[];
  faq: { q: string; a: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'letter-reversals-age-6',
    title: 'Letter Reversals at Age 6: When b and d Flips Are Normal',
    navLabel: 'Letter reversals at age 6',
    metaDescription:
      'Letter reversals at age 6 (b, d, p, q) are usually normal. Here’s why kids flip letters, when they typically stop, and simple ways to help, with free printables.',
    updated: '2026-07-06',
    relatedGoals: ['letter-reversals'],
    relatedTemplates: ['letter-reversal-bd', 'letter-hunt'],
    sections: [
      {
        heading: 'Is it normal for a 6-year-old to reverse b and d?',
        paragraphs: [
          'Almost always, yes. Flipping b and d (or p and q) is one of the most common things a five- or six-year-old does as they learn to write, and on its own it is not a sign of dyslexia or a learning disability.',
          'Here’s the thing that makes letters uniquely hard: in the rest of a child’s world, a cup is a cup whether it points left or right. Letters are the first objects a child meets where direction changes the meaning. A brain that has spent years learning to ignore an object’s orientation now has to start paying attention to it. That takes time to click.',
        ],
      },
      {
        heading: 'Why kids flip letters',
        paragraphs: [
          'b, d, p and q are the same shape (a circle and a stick) in four different arrangements. Telling them apart depends on visual discrimination (noticing which way the circle faces) and remembering a consistent motor pattern for forming each one. Both skills are still developing at this age.',
          'Reversals usually fade on their own as reading and writing practice pile up and the correct forms become automatic. Practice that helps tends to do two things: work on one confusable pair at a time, and pair a memorable cue with the correct movement (for example, making a “bed” with two fists so the b and d point inward like the headboard and footboard).',
        ],
      },
      {
        heading: 'What’s typical by age',
        paragraphs: [
          'Every child is different and the ranges below are wide and normal. Use them as a rough guide, not a deadline.',
        ],
      },
      {
        heading: 'Five ways to help at home',
        paragraphs: [
          '1. Work one pair at a time. Don’t drill b, d, p and q together. Pick b vs d until it’s solid, then move on. Our free Letter Reversals worksheet does exactly this: print it at Ages 5-6, “Just right”, and it keeps a single target letter in view so your child rehearses the correct one many times on one page.',
          '2. Turn it into a hunt. A letter-hunt (cancellation) page, where you circle every b hidden among d, p and q, builds the quick left-to-right scanning that reading needs, and it feels like a game. Print our Letter Hunt worksheet and set the target to “b”.',
          '3. Use a consistent cue. The two-fists “bed” trick, or “b has its bat before its ball,” works because it ties the shape to a little story. Pick one cue and use only that one. Switching cues is what confuses kids.',
          '4. Make it multisensory. Have your child trace the letter big in the air, in sand, or on a foggy window while saying its sound. Movement plus sound sticks better than looking alone.',
          '5. Keep sessions short and frequent. Five focused minutes most days beats a long weekend session. Stop while it’s still fun so your child stays willing to come back to it.',
        ],
      },
      {
        heading: 'When to talk to a teacher or OT',
        paragraphs: [
          'Occasional reversals through about age seven are typical and rarely need a professional. It’s worth raising with your child’s teacher or an occupational therapist if reversals are frequent and persistent past seven or eight, if they come with other struggles (avoiding writing, trouble sounding out words, letters wandering all over the line), or if your child seems frustrated or is losing confidence. An evaluation isn’t alarming. It just makes sure the right kind of support is in place early.',
        ],
      },
    ],
    milestones: [
      { age: 'Ages 4-5', expect: 'Frequent reversals of b/d, p/q and some numbers, completely expected as writing begins.' },
      { age: 'Ages 5-6', expect: 'Still common, but starting to self-correct with reminders. Practice on one pair at a time helps most here.' },
      { age: 'Ages 6-7', expect: 'Reversals become less frequent as reading and writing become automatic.' },
      { age: 'Age 7+', expect: 'Occasional slips are still okay; frequent, persistent reversals are worth mentioning to a teacher or OT.' },
    ],
    faq: [
      {
        q: 'Does reversing b and d mean my child has dyslexia?',
        a: 'Not on its own. Letter reversals are typical through about age seven and, by themselves, are not a diagnosis of anything. Dyslexia involves a broader pattern, especially difficulty connecting letters to sounds. If reversals come with trouble reading or sounding out words, mention it to your child’s teacher or an evaluator.',
      },
      {
        q: 'What is the “bed” trick for b and d?',
        a: 'Have your child make a thumbs-up with both fists and touch the knuckles together. The left hand forms a “b” and the right forms a “d,” spelling “bed.” The word reminds them which way each letter faces. Use one cue consistently rather than switching between tricks.',
      },
      {
        q: 'How long does it take to fix letter reversals?',
        a: 'It varies. With short, frequent practice on one pair at a time, many children improve noticeably over a few weeks, but full consistency can take months as the correct forms become automatic. Progress isn’t linear. Expect good days and off days.',
      },
      {
        q: 'Are these worksheets free?',
        a: 'Yes. Every worksheet on Therapistools is free to customize and print, with no account required.',
      },
    ],
  },
];

export const GUIDE_SLUGS = GUIDES.map((g) => g.slug);

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidesForGoal(goal: Goal): Guide[] {
  return GUIDES.filter((g) => g.relatedGoals.includes(goal));
}
