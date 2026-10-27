import { Goal } from '@/data/templates';

/**
 * Content for the /goals/:goalSlug landing pages. These exist to match how
 * parents actually search ("letter reversal worksheets", "scissor skills
 * practice") with a real, crawlable page: practical guidance + the templates
 * for that goal. Copy is general educational guidance, not individualized
 * clinical advice — keep it that way (no diagnosis, no "cure" claims).
 *
 * The slug is the Goal value itself (already kebab-case).
 */
export interface GoalCopy {
  slug: Goal;
  /** <h1> and page title. */
  heading: string;
  /** Short label for nav/footer links. */
  navLabel: string;
  /** meta description (<160 chars). */
  metaDescription: string;
  /** Intro paragraphs shown above the template grid. */
  intro: string[];
  /** Q&A — also emitted as FAQPage JSON-LD for rich results. */
  faq: { q: string; a: string }[];
}

export const GOAL_COPY: Record<Goal, GoalCopy> = {
  'letter-reversals': {
    slug: 'letter-reversals',
    heading: 'Letter Reversal Worksheets (b, d, p, q)',
    navLabel: 'Letter reversals',
    metaDescription:
      'Free printable worksheets to help children who reverse b, d, p and q. Discrimination and letter-hunt activities you can customize and print.',
    intro: [
      'Reversing b/d and p/q is completely normal up to about age seven. The brain is still learning that, unlike almost everything else in a child’s world, a letter’s direction changes what it means. Practice that works tends to focus on one confusable pair at a time and builds a memorable cue (for example, “b” has its bat before its ball).',
      'The worksheets below give two complementary formats: discrimination tasks (spot the letter that faces the wrong way) and letter-hunt cancellation grids (circle every “b” hidden among d, p and q). Both keep a single target in view so the child rehearses the correct orientation many times on one page.',
      'Pick a template, set the child’s age so the difficulty is right, and print. You can change the target letter, add the child’s name, and turn on a dyslexia-friendly font if that helps.',
    ],
    faq: [
      {
        q: 'At what age should I worry about letter reversals?',
        a: 'Occasional b/d and p/q reversals are typical through about age 7. If reversals are frequent and persistent after that, or paired with other reading and writing struggles, it’s worth mentioning to the child’s teacher or an occupational therapist.',
      },
      {
        q: 'What’s the best way to practice?',
        a: 'Work on one pair at a time, use a consistent verbal or visual cue, and keep sessions short and frequent. Multisensory practice (tracing the letter while saying its sound) tends to stick better than worksheets alone.',
      },
      {
        q: 'Are these worksheets free?',
        a: 'Yes. Every worksheet on Therapistools is free to customize and print, with no account required.',
      },
    ],
  },
  'pre-writing-strokes': {
    slug: 'pre-writing-strokes',
    heading: 'Pre-Writing Stroke Worksheets',
    navLabel: 'Pre-writing strokes',
    metaDescription:
      'Free printable pre-writing worksheets: vertical, horizontal, diagonal, curved, wavy and looping tracing paths that build the strokes behind letters.',
    intro: [
      'Before a child can form letters, they need the underlying strokes: the vertical line, horizontal line, circle, cross, and the diagonals. These “pre-writing shapes” are the building blocks of every letter, and tracing them builds the hand control, crossing-the-midline, and pencil pressure that handwriting depends on.',
      'The tracing-path worksheets here progress from simple straight lines to waves, zig-zags, spirals and loops. Each path has a green start dot, a red end dot, and a direction arrow, so the child practices moving the pencil the right way, not just filling in a line.',
      'Choose a stroke type (or “mixed” for variety), set the number of rows, and pick a line thickness that suits the child’s current control: thicker guides for beginners, thinner as they improve.',
    ],
    faq: [
      {
        q: 'What are pre-writing strokes?',
        a: 'They’re the basic lines and curves (vertical, horizontal, diagonal, circle and cross) that combine to form letters. Most children develop them roughly in that order between ages 2 and 5.',
      },
      {
        q: 'Should my child use a pencil or crayon?',
        a: 'A short, chunky crayon or golf pencil actually encourages a better grasp in young children than a full-length pencil. Let them work on a vertical surface (a taped-up sheet) sometimes too, because it strengthens the wrist.',
      },
      {
        q: 'How much practice is enough?',
        a: 'A few minutes at a time, often, beats one long session. Stop while it’s still fun so the child stays willing to come back to it.',
      },
    ],
  },
  'scissor-skills': {
    slug: 'scissor-skills',
    heading: 'Scissor Skills Worksheets (Cutting Practice)',
    navLabel: 'Scissor skills',
    metaDescription:
      'Free printable cutting practice worksheets: straight, wavy and zig-zag lines to build scissor skills and bilateral coordination. Adjustable difficulty.',
    intro: [
      'Cutting with scissors is a big fine-motor milestone. It builds hand strength, the open-thumb “thumbs-up” position, and bilateral coordination: one hand cutting while the other turns the paper. Children usually start by snipping, then cut along straight lines, then curves and corners.',
      'These worksheets give clear cutting lines at three levels: straight lines to start, gentle waves next, then zig-zags with corners that require the child to stop, turn the paper, and keep going. Set the difficulty to match where the child is now and increase it as they get steadier.',
      'Use child-safe scissors and supervise, especially early on. It’s normal for cutting to look ragged at first. Staying roughly on the line matters more than precision.',
    ],
    faq: [
      {
        q: 'When do children learn to use scissors?',
        a: 'Many children begin snipping around age 2-3, cut along a straight line by about 4, and manage simple curves and corners by 5-6. There’s a wide normal range.',
      },
      {
        q: 'My child holds the scissors upside down. How do I fix it?',
        a: 'Cue “thumbs up”: thumb through the top hole, pointing at the ceiling. A small sticker on the thumb nail and on the top handle gives a “match the stickers” reminder.',
      },
      {
        q: 'What kind of scissors are best?',
        a: 'Short-bladed, child-safe scissors sized to the child’s hand. Spring-loaded (self-opening) scissors help children who tire quickly or struggle to reopen the blades.',
      },
    ],
  },
  'attention-scanning': {
    slug: 'attention-scanning',
    heading: 'Visual Attention & Scanning Worksheets',
    navLabel: 'Attention & scanning',
    metaDescription:
      'Free printable visual scanning and attention worksheets: find-and-count, figure-ground, odd-one-out and letter-hunt activities that build visual perception.',
    intro: [
      'Visual scanning (searching a busy page in an organized way to find what you’re looking for) underpins reading, copying from the board, and finding your place on a worksheet. Related skills like figure-ground (picking a shape out of a cluttered background) and visual discrimination are grouped together as visual-perceptual skills.',
      'The activities here train those skills directly: find-and-count grids, figure-ground searches, odd-one-out rows, and letter or number hunts. Many children benefit from scanning left-to-right, top-to-bottom, the same direction they’ll read, and you can encourage that habit as they work.',
      'Set the density and difficulty to match the child. Start easy and roomy, then increase the number of distractors as their search becomes faster and more systematic.',
    ],
    faq: [
      {
        q: 'What are visual perception skills?',
        a: 'They’re how the brain makes sense of what the eyes see, including scanning, figure-ground, visual discrimination, visual memory and closure. They’re distinct from eyesight; a child can have 20/20 vision and still find these tasks hard.',
      },
      {
        q: 'How do these help with reading?',
        a: 'Efficient, organized visual scanning helps a child track along a line of text, find their place, and spot the differences between similar letters and words.',
      },
      {
        q: 'Can I make them harder?',
        a: 'Yes. Increase the grid size or density, add more distractor shapes, or turn off colour so the child relies on shape alone.',
      },
    ],
  },
  'handwriting-practice': {
    slug: 'handwriting-practice',
    heading: 'Handwriting Practice Worksheets',
    navLabel: 'Handwriting practice',
    metaDescription:
      'Free printable handwriting worksheets: tri-line and 4-line paper, name tracing and word boxes with model, trace and independent-writing rows. Fully customizable.',
    intro: [
      'Good handwriting comes from consistent letter formation on well-spaced lines, not from writing more. These worksheets use a clear model → trace → write progression: the child sees the letters formed correctly, traces dotted letters to build the motor pattern, then writes independently on the same guidelines.',
      'You can practice a child’s own name, custom words, or a sentence, on tri-line or 4-line (HK copybook) paper, with word boxes that shape letters by their tall, small and “tail” (descender) parts. Coloured guidelines help a child place letters consistently between the lines.',
      'Set the font size in millimetres to match the child’s current control (larger to start, smaller as their writing matures), and choose how many practice rows to include.',
    ],
    faq: [
      {
        q: 'What order should children learn letters?',
        a: 'Many programs group letters by how they’re formed rather than alphabetically, starting with straight-line letters and simple curves before the trickier diagonals. Practicing similar formations together helps.',
      },
      {
        q: 'Should I teach print or cursive first?',
        a: 'Print is the usual starting point in most English-speaking schools. Follow whatever approach the child’s school uses so home practice reinforces, rather than competes with, classroom instruction.',
      },
      {
        q: 'How big should the letters be?',
        a: 'Start larger while the child is building control, then gradually reduce the size. These worksheets let you set the letter height in millimetres so you can shrink it as they improve.',
      },
    ],
  },
  'copying-patterns': {
    slug: 'copying-patterns',
    heading: 'Pattern Copying & Visual-Motor Worksheets',
    navLabel: 'Pattern copying',
    metaDescription:
      'Free printable pattern copying, sequencing and mirror-image worksheets that build visual-motor integration, the eye-hand link behind handwriting and drawing.',
    intro: [
      'Copying a pattern into an empty grid, continuing a sequence, or drawing a mirror image all train visual-motor integration: the coordination between what the eyes see and what the hand does. It’s the same skill a child uses to copy letters from a model or notes from a board.',
      'The worksheets here range from copy-the-picture grids and “what comes next?” sequences to mirror-image drawing. They ask the child to hold a visual idea in mind and reproduce it accurately, which builds spatial awareness alongside pencil control.',
      'Adjust the grid size, number of exercises and difficulty to suit the child. Simpler grids with a few shapes are a good starting point; add shapes, rotation and larger grids as they succeed.',
    ],
    faq: [
      {
        q: 'What is visual-motor integration?',
        a: 'It’s the ability to coordinate visual information with hand movement: for example, seeing a shape and drawing it accurately. It’s a strong predictor of early handwriting success.',
      },
      {
        q: 'My child can see the pattern but can’t copy it. Why?',
        a: 'Seeing and reproducing are different skills. A child may perceive a pattern clearly but still find the planning and motor execution hard. Starting with smaller grids and fewer elements makes the copying step more manageable.',
      },
      {
        q: 'How do I make these more challenging?',
        a: 'Increase the grid size, add more shapes, or raise the difficulty to introduce rotation, which forces the child to attend to orientation, not just shape and position.',
      },
    ],
  },
};

export const GOAL_SLUGS = Object.keys(GOAL_COPY) as Goal[];
