import type { GradeGroup, ScreenItem } from "./types";

/**
 * Informal fine motor screen items for occupational therapy, by grade group.
 * This is the generic sample that ships with the tool: plain school-OT
 * wording with fictional observations as samples. A writer's own version
 * lives in their template edits (and in their account), never in the code.
 * Grades 9–12 have no items of their own yet and use the 6–8 items.
 */

const K1: ScreenItem[] = [
  {
    id: "k1-grasp",
    label: "Pencil grasp",
    group: "classroom",
    opener: "{{They}} is [[handedness::handedness]] and uses a [[grasp type::grasp]] grasp on pencils and crayons. [[Pencil pressure and use of the helper hand]].",
    examples: [
      "Pencil grasp – [STUDENT] is left handed and holds crayons in a fisted grasp, moving to a tripod grasp when reminded. She pressed hard enough to tear the paper twice and kept her other hand in her lap instead of holding the page.",
    ],
  },
  {
    id: "k1-design",
    label: "Design copy",
    group: "classroom",
    opener: "{{They}} copied [[shapes copied without help]] from a model. [[Shapes not yet copied, and how {{they}} approached them]].",
    examples: [
      "Design copy – She copied a vertical line, a horizontal line and a circle from the model. Her square had rounded corners, and she drew the cross as two marks that did not meet. She watched the examiner's hand before each try.",
    ],
  },
  {
    id: "k1-cutting",
    label: "Scissors / cutting",
    group: "classroom",
    opener: "Using [[scissors used]], {{they}} cut [[line or shape cut]]. [[Scissor grip, helper hand, and accuracy on straight and curved lines]].",
    examples: [
      "Scissors / cutting – Using child-safe scissors, she cut along a 6-inch straight line and a wide curve. She held the scissors with her thumb up for most of the task and used her helper hand to hold the paper after a prompt. She stayed within half an inch of the straight line and drifted further on the curve.",
    ],
  },
  {
    id: "k1-coloring",
    label: "Coloring",
    group: "classroom",
    opener: "{{They}} colored [[what was colored]] [[following a direction, if one was given]]. [[Staying inside the lines, stroke pattern and pressure]].",
    examples: [
      "Coloring – She colored a large balloon and a small star after a one-step direction for each color. She used short back-and-forth strokes and stayed inside the balloon, with marks outside the points of the star.",
    ],
  },
  {
    id: "k1-handwriting",
    label: "Handwriting sample",
    group: "classroom",
    opener: "{{They}} copied [[letters and numbers copied]]. [[Formation, starting points and reversals]]. [[Writing {{their}} first name]].",
    examples: [
      "Handwriting sample – She copied the capital letters in her name and the numbers 1 to 3. She started most letters at the top but drew the S from the bottom and reversed the 3. She wrote her first name from memory with the letters in order and uneven in size.",
    ],
  },
  {
    id: "k1-bilateral",
    label: "Bilateral coordination",
    group: "supporting",
    opener: "{{They}} [[two-sided movements tried, such as jumping jacks, galloping or skipping]]. [[Rhythm and timing]]. [[Using both hands together at the table]].",
    examples: [
      "Bilateral coordination – She galloped with a lead foot and tried jumping jacks, moving her arms and legs out of time with each other. She did not yet skip. At the table she held the paper with her helper hand while cutting after one reminder.",
    ],
  },
  {
    id: "k1-fmcoord",
    label: "Fine motor coordination",
    group: "supporting",
    opener: "{{They}} [[finger-to-thumb touches and copying finger positions]]. [[Picking up and placing small items]].",
    examples: [
      "Fine motor coordination – She touched her thumb to each finger on her right hand in order and skipped her ring finger on the left. She picked up six small beads one at a time with a pincer grasp and dropped two on the way to the cup.",
    ],
  },
  {
    id: "k1-body",
    label: "Body awareness",
    group: "supporting",
    opener: "[[Awareness of {{their}} body near people and objects]]. {{They}} [[naming body parts and telling right from left]]. When asked to draw a person, {{they}} [[parts included]].",
    examples: [
      "Body awareness – She bumped the corner of the table twice while walking around the room and stood close to the examiner while waiting. She named her elbows and knees but not her wrists, and pointed to her own right hand on request. When asked to draw a person, she drew a head, eyes, a mouth, a body and two legs.",
    ],
  },
  {
    id: "k1-tone",
    label: "Muscle tone",
    group: "supporting",
    opener: "{{They}} [[muscle tone observed]]. [[Effect on sitting posture and hand use]].",
    examples: ["Muscle tone – She appears to have low muscle tone in her trunk and hands. She slid down in her chair during table work and propped her head on one hand while coloring."],
  },
  {
    id: "k1-strength",
    label: "Strength",
    group: "supporting",
    opener: "Upper extremity strength was checked informally. {{They}} [[strength at the shoulders, elbows and hands]].",
    examples: ["Strength – Upper extremity strength was checked informally. She pushed and pulled against the examiner's hands with even strength on both sides, and her grip tired after a few seconds of squeezing."],
  },
  {
    id: "k1-tracking",
    label: "Visual tracking",
    group: "supporting",
    opener: "{{They}} [[following a moving object side to side and up and down]]. [[Head movement and attention]].",
    examples: ["Visual tracking – She followed a small toy from side to side with her eyes and lost it once when it moved up and down. She moved her head with the toy and looked away when a door closed in the hallway."],
  },
];

const G25: ScreenItem[] = [
  {
    id: "g25-dominance",
    label: "Hand dominance",
    group: "classroom",
    opener: "{{They}} is [[handedness::handedness]]. {{Their}} helper hand [[how it holds the paper or tools]].",
    examples: ["Hand dominance – [STUDENT] is right-handed. His helper hand rests on the paper and moves it when he reaches the bottom of the page."],
  },
  {
    id: "g25-grasp",
    label: "Pencil grasp",
    group: "classroom",
    opener: "{{They}} uses a [[grasp type::grasp]] pencil grasp. [[Finger position, pressure, and whether the grasp works for longer writing]].",
    examples: [
      "Pencil grasp – He uses a dynamic tripod pencil grasp with his fingers close to the tip. He pressed hard and shook out his hand after half a page.",
      "Pencil grasp – She uses a lateral tripod grasp that works well for short tasks.",
    ],
  },
  {
    id: "g25-shapes",
    label: "Copy shapes & lines",
    group: "classroom",
    opener: "{{They}} copied [[lines and shapes copied]] from a model. [[Shapes copied with errors or not yet copied]].",
    examples: [
      "Copy shapes & lines – He copied vertical, horizontal and diagonal lines, a circle, a cross, a square and a triangle. His diamond had rounded corners, and he drew the overlapping circles side by side.",
    ],
  },
  {
    id: "g25-alphabet",
    label: "Copy alphabet & numbers",
    group: "classroom",
    opener: "{{They}} copied the numbers [[numbers copied]] legibly. From a model, {{they}} copied [[number]] of 26 uppercase letters [[errors]] and [[number]] of 26 lowercase letters [[errors]]. From memory, {{they}} [[letters or words written from memory]].",
    examples: [
      "Copy alphabet & numbers – He copied the numbers 1 to 10 legibly with the 6 and the 9 reversed. From a model, he copied 24 of 26 uppercase letters, leaving the N and the M open at the top, and 20 of 26 lowercase letters, with the b, d and p turned around. From memory, he wrote the alphabet in order as far as the letter m.",
    ],
  },
  {
    id: "g25-coloring",
    label: "Coloring",
    group: "classroom",
    opener: "{{They}} colored [[what was colored]] with [[control and accuracy]].",
    examples: ["Coloring – He colored a 2-inch circle with even strokes and went outside the line by about a quarter inch on one side."],
  },
  {
    id: "g25-cutting",
    label: "Cutting",
    group: "classroom",
    opener: "{{They}} cut [[shape and size]] [[accuracy]]. [[Scissor grip and helper hand]].",
    examples: ["Cutting – He cut out a 3-inch square within an eighth of an inch of the line and a circle with two flat spots. He held the scissors with his thumb up and turned the paper with his helper hand."],
  },
  {
    id: "g25-drawing",
    label: "Drawing / tool use",
    group: "classroom",
    opener: "When asked to draw [[what]], {{they}} [[parts included and how the tool was used]].",
    examples: ["Drawing / tool use – When asked to draw a person, he drew a head, a body, arms, legs, hands and a face, and added hair without a prompt."],
  },
  {
    id: "g25-handwriting",
    label: "Handwriting sample",
    group: "classroom",
    opener: "{{They}} wrote [[the writing sample]]. [[Legibility, speed, letter size, spacing and line placement]].",
    examples: [
      "Handwriting sample – He wrote two sentences from a model in three minutes. His writing was legible, with letters sitting on the baseline and even spaces between words. His letters grew larger toward the end of each line.",
    ],
  },
  {
    id: "g25-visualmotor",
    label: "Visual motor",
    group: "supporting",
    opener: "{{They}} [[catching, throwing and other eye-hand tasks]].",
    examples: ["Visual motor – He caught a beanbag with two hands on four of five throws and threw it back into the examiner's hands each time."],
  },
  {
    id: "g25-tracking",
    label: "Visual tracking",
    group: "supporting",
    opener: "{{They}} [[following a moving object side to side, up and down and in a circle]]. [[Head movement, attention and overall eye control]].",
    examples: ["Visual tracking – He followed a pen light with his eyes side to side, up and down and in a circle with no head movement and no loss of attention. His eye control appeared typical for his age."],
  },
  {
    id: "g25-strength",
    label: "Upper extremity strength",
    group: "supporting",
    opener: "Upper extremity strength was checked informally. [[Shoulder and elbow strength]]. [[Grip and pinch]]. [[Effect on school tasks]].",
    examples: [
      "Upper extremity strength – Upper extremity strength was checked informally. His shoulders and elbows held steady against resistance. His grip and pinch were weaker on the left than on the right. This did not limit his table work during the session.",
    ],
  },
  {
    id: "g25-tone",
    label: "Muscle tone",
    group: "supporting",
    opener: "{{Their}} muscle tone appears [[tone observed]]. [[Posture and endurance during table work]].",
    examples: ["Muscle tone – His muscle tone appears typical. He sat upright through twenty minutes of table work and kept a steady pinch on small items."],
  },
  {
    id: "g25-fmcoord",
    label: "Fine motor coordination",
    group: "supporting",
    opener: "{{They}} [[finger movements and copying hand positions]]. [[Moving a pencil within the hand]].",
    examples: [
      "Fine motor coordination – He copied unfamiliar finger positions on the second try and touched his thumb to each finger in order on both hands. He turned a pencil end over end within his hand but needed his other hand to walk his fingers up it.",
    ],
  },
  {
    id: "g25-posture",
    label: "Postural control",
    group: "supporting",
    opener: "{{They}} held the supine flexion (curled) position for [[seconds]] and the prone extension (airplane) position for [[seconds]]. [[What this shows about core strength]].",
    examples: [
      "Postural control – He held the supine flexion position for 25 seconds and the prone extension position for 10 seconds, with his legs lowering before the time was up. His core strength supports sitting at a desk, with fatigue over longer periods.",
    ],
  },
  {
    id: "g25-motorcontrol",
    label: "Motor control",
    group: "supporting",
    opener: "{{They}} [[gross motor skills tried, such as galloping, skipping and jumping jacks]]. [[Stairs and moving around the school]].",
    examples: ["Motor control – He galloped, skipped and did ten jumping jacks in rhythm. He climbs stairs with alternating feet and moves through the hallway without bumping into others."],
  },
  {
    id: "g25-bilateral",
    label: "Bilateral coordination",
    group: "supporting",
    opener: "{{They}} [[two-sided movements tried]]. [[Using both hands together, such as holding the paper while cutting or writing]].",
    examples: ["Bilateral coordination – He did jumping jacks with his arms and legs in time and skipped with a gallop on the left. He held the paper steady with his helper hand while cutting and writing."],
  },
];

const G68: ScreenItem[] = [
  {
    id: "g68-typing",
    label: "Typing",
    group: "paragraph",
    opener:
      "{{They}} [[comfort with the devices and programs used at school]]. On a [[length]]-minute typing test, {{they}} typed [[number]] words per minute with [[percent]]% accuracy using [[fingers used]]. [[What affects {{their}} speed]]. [[Assistive technology in use, and any recommendation]].",
    examples: [
      "Typing: She logs in to her school laptop and opens her writing assignments on her own, and uses the Shift, Enter and Backspace keys without looking. On a 3-minute typing test, she typed 16 words per minute with 94% accuracy using two fingers on each hand. Her speed is affected by looking down at the keyboard and rereading each sentence before moving on. She uses word prediction for longer assignments, and continued access to a laptop for written work longer than a paragraph is recommended.",
      "Typing: He is comfortable with the class tablet and its keyboard and uses the Spacebar, Shift and arrow keys accurately. On a 3-minute typing test, he typed 8 words per minute with 90% accuracy using his index fingers. His speed is affected by searching for keys and correcting himself. He does not use speech-to-text at present, and a trial of it for longer writing tasks is recommended.",
    ],
  },
  {
    id: "g68-handwriting",
    label: "Handwriting",
    group: "paragraph",
    opener:
      "{{They}} wrote [[the writing sample]] with [[writing tool and grasp]] in [[time]]. [[Legibility, letter size, spacing and line placement]]. [[Supports that might help]].",
    examples: [
      "Handwriting: She wrote the same three sentences by hand with a gel pen and a thumb-wrap grasp in 3 minutes and 10 seconds. About three quarters of her letters sat on the baseline, her spacing between words was uneven, and her lowercase letters varied in size, which affected legibility. Paper with a highlighted baseline, a slant board and a short hand warm-up before writing might help.",
      "Handwriting: He wrote the paragraph with a standard pencil and a tripod grasp in 4 minutes. His writing is legible, with letters on the baseline and even spacing, though his letters are small for the wide-ruled paper his class uses. He went back to add a missed capital letter without a prompt.",
    ],
  },
  {
    id: "g68-sensory",
    label: "Sensory regulation",
    group: "paragraph",
    opener:
      "Based on teacher report and classroom observation, {{their}} sensory regulation is [[functional or a concern::functionalOrConcern]]. [[Supports in use]]. [[How {{they}} responds to noise, movement and transitions]]. Overall, [[effect on classroom participation]].",
    examples: [
      "Sensory regulation: Based on teacher report and classroom observation, her sensory regulation is functional, and she takes part in all classroom routines. She uses a wobble cushion during lessons and chooses a quiet corner of the library at lunch. When the fire alarm sounded during the observation, she covered her ears and then returned to her work within a minute without a prompt. Overall, her sensory processing supports her classroom participation.",
    ],
  },
];

export const SCREEN_ITEMS: Record<GradeGroup, ScreenItem[]> = {
  k1: K1,
  g25: G25,
  g68: G68,
  // No 9–12 items yet: use the middle-school ones.
  g912: G68,
};

/** True when a grade group borrows another group's items. */
export const SCREEN_BORROWED: Partial<Record<GradeGroup, GradeGroup>> = { g912: "g68" };

export function screenItemsFor(grade: GradeGroup): ScreenItem[] {
  return SCREEN_ITEMS[grade];
}
