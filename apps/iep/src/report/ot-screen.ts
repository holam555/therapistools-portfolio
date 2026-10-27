import type { GradeGroup, ScreenItem } from "./types";

/**
 * Informal fine motor screen items for occupational therapy, by grade group.
 * The openers follow the shape of school OT reports; the sample sentences are
 * fictional observations written to show the style, not taken from any report.
 * Grades 9–12 have no template of their own yet and use the 6–8 items.
 */

const K1: ScreenItem[] = [
  {
    id: "k1-grasp",
    label: "Pencil grasp",
    group: "classroom",
    opener: "{{They}} is [[handedness::handedness]] and uses a [[grasp type::grasp]] grasp on pencils and crayons. [[Pencil pressure and use of the stabilizer hand]].",
    examples: [
      "Pencil grasp – [STUDENT] is right handed and uses a quadrupod grasp on pencils and crayons. He pressed lightly, so his marks were faint and hard to read. He needed a reminder to hold the paper with his other hand.",
    ],
  },
  {
    id: "k1-design",
    label: "Design copy",
    group: "classroom",
    opener: "{{They}} was able to [[independently copy which shapes]]. [[Shapes that were hard to copy, and any associated movements]].",
    examples: [
      "Design Copy – He was able to independently copy a circle, a cross and a square. He drew the triangle with rounded corners and could not yet copy a diamond. He stuck out his tongue while concentrating on the harder shapes.",
    ],
  },
  {
    id: "k1-cutting",
    label: "Scissors / cutting",
    group: "classroom",
    opener: "{{They}} used [[scissors used]] to cut [[shape or line]]. {{They}} [[how {{they}} held the scissors]]. [[Straight and curved lines, paper rotation, and use of both hands]].",
    examples: [
      "Scissors / Cutting – He used blunt-tipped classroom scissors to cut a large square. He held the scissors with his thumb on top and his elbow tucked in. He cut the straight sides well but stopped at each corner and needed help to turn the paper rather than turning it with his helper hand.",
    ],
  },
  {
    id: "k1-coloring",
    label: "Coloring",
    group: "classroom",
    opener: "{{They}} [[following directions for coloring]]. [[Staying within the lines, and what affected it]].",
    examples: [
      "Coloring – He followed a two-step direction to color the apple red and the leaf green. He went outside the lines by about a quarter inch on the curved edges because he colored with whole-arm movements rather than moving his fingers.",
    ],
  },
  {
    id: "k1-handwriting",
    label: "Handwriting sample",
    group: "classroom",
    opener: "{{They}} was able to copy [[letters and numbers copied]]. [[Start and sequence errors and letter formation]]. [[Writing {{their}} name]].",
    examples: [
      "Handwriting sample – He was able to copy the uppercase letters in his name and the numbers 1 to 5. He started several letters at the bottom and formed the letter E with four separate strokes. He wrote his first name from memory with the letters floating above the line and the last two letters reversed.",
    ],
  },
  {
    id: "k1-bilateral",
    label: "Bilateral coordination",
    group: "supporting",
    opener: "{{They}} was able to [[gallop, skip, jumping jacks]]. [[Smoothness of motor patterns]]. [[Using both hands together]].",
    examples: [
      "Bilateral Coordination – He was able to gallop and attempt jumping jacks, moving his arms and legs at different times. He was not yet able to skip. His movements were stiff and he watched his feet. He held the paper with his helper hand when cutting after a reminder.",
    ],
  },
  {
    id: "k1-fmcoord",
    label: "Fine motor coordination",
    group: "supporting",
    opener: "{{They}} [[thumb and finger touches, imitating fine motor movements]]. [[How {{their}} grasp affects fine motor movements]].",
    examples: [
      "Fine Motor Coordination – He was able to touch his thumb to each finger in order on his right hand but skipped fingers on his left hand. He imitated simple finger positions after watching twice. His quadrupod grasp limits how far he can move the pencil with his fingers, so he moves his whole wrist instead.",
    ],
  },
  {
    id: "k1-body",
    label: "Body awareness",
    group: "supporting",
    opener: "[[Spatial awareness around others]]. {{They}} [[identifying right and left]]. When asked to draw a person, {{they}} [[drawing and details included]]. [[Body parts {{they}} could and could not identify]].",
    examples: [
      "Body Awareness – He stood very close to the examiner while waiting for his turn and bumped into the table when moving around it. He was able to point to his left hand but not to the examiner's left hand. When asked to draw a person, he drew a head with a face, a body and two legs but no arms. He named his knees and shoulders but not his wrists or ankles.",
    ],
  },
  {
    id: "k1-tone",
    label: "Muscle tone",
    group: "supporting",
    opener: "{{They}} [[muscle tone]]. [[How this affects {{their}} fine and gross motor skills]].",
    examples: [
      "Muscle Tone – He has mildly low muscle tone in his trunk and hands. He leaned on the table with his forearms while writing and tired after a few lines. This may be contributing to his light pencil pressure and his slouched sitting posture.",
    ],
  },
  {
    id: "k1-strength",
    label: "Strength",
    group: "supporting",
    opener: "Upper extremity manual muscle testing was performed to determine overall muscle strength. {{They}} [[strength findings]].",
    examples: ["Strength – Upper extremity manual muscle testing was performed to determine overall muscle strength. He showed good strength at his shoulders and elbows and mild weakness in his grip, letting go of the examiner's fingers after a few seconds."],
  },
  {
    id: "k1-tracking",
    label: "Visual tracking",
    group: "supporting",
    opener: "{{They}} [[tracking a moving object horizontally and vertically]]. [[Head movement and distractibility]]. [[Visual skills for moving around the school]].",
    examples: [
      "Visual Tracking – He was able to follow a small toy across the horizontal plane but lost it twice when it moved up and down. He turned his whole head to follow the toy rather than moving only his eyes. He glanced toward the door whenever he heard noise in the hallway. He has the visual skills to move around his school safely.",
    ],
  },
];

const G25: ScreenItem[] = [
  {
    id: "g25-dominance",
    label: "Hand dominance",
    group: "classroom",
    opener: "{{They}} is [[handedness::handedness]]. {{They}} uses {{their}} helper hand to [[how the helper hand stabilizes the paper]].",
    examples: ["Hand Dominance – [STUDENT] is left-handed. She uses her right hand to hold the top corner of her paper while writing."],
  },
  {
    id: "g25-grasp",
    label: "Pencil grasp",
    group: "classroom",
    opener: "{{They}} uses a [[grasp type::grasp]] pencil grasp. [[Finger and thumb position, and whether the grasp is functional]].",
    examples: [
      "Pencil grasp – She uses a lateral tripod grasp with her thumb wrapped over her index finger. The grasp is functional for short tasks, though she shook out her hand after a full page of writing.",
      "Pencil Grasp – He uses a functional dynamic tripod pencil grasp.",
    ],
  },
  {
    id: "g25-shapes",
    label: "Copy shapes & lines",
    group: "classroom",
    opener: "{{They}} demonstrated the motor skills to copy [[lines and shapes copied]]. [[Shapes copied with errors or not yet copied]].",
    examples: [
      "Copy Shapes & Lines – He demonstrated the motor skills to copy vertical, horizontal and diagonal lines, a circle, a cross and a square. His triangle had one bowed side, and he is not yet able to copy a diamond with pointed corners.",
      "Design Copy – She was able to copy every shape on the page, including the overlapping circles.",
    ],
  },
  {
    id: "g25-alphabet",
    label: "Copy alphabet & numbers",
    group: "classroom",
    opener: "{{They}} can copy [[numbers copied]] legibly. When copying letters from a model, {{they}} copied [[number]]/26 uppercase letters [[letters with errors]] and [[number]]/26 lowercase letters [[letters with errors]]. From memory, {{they}} [[letters or name written from memory]].",
    examples: [
      "Copy Alphabet & Numbers – He can copy numbers 1–10 legibly, reversing the 7. When copying letters from a model, he copied 25/26 uppercase letters (with an extra stroke on 'M') and 22/26 lowercase letters (with 'b' and 'd' reversed and 'g' and 'q' sitting on the line instead of below it). From memory, he wrote the alphabet to 'p' before losing his place.",
    ],
  },
  {
    id: "g25-coloring",
    label: "Coloring",
    group: "classroom",
    opener: "{{They}} demonstrated [[fine motor control]] by coloring [[target size]] with [[accuracy, such as deviation outside the boundary]].",
    examples: [
      "Coloring – He demonstrated fair fine motor control by coloring a 2-inch square with up to a quarter-inch deviation outside the boundaries on two sides.",
      "Coloring – She colored both a small and a large target with even strokes and no marks outside the line, showing good distal finger control.",
    ],
  },
  {
    id: "g25-cutting",
    label: "Cutting",
    group: "classroom",
    opener: "{{They}} demonstrated [[scissor skills]], cutting [[shape and size]] [[accuracy]]. [[How {{they}} held the scissors]].",
    examples: [
      "Cutting – He demonstrated emerging scissor skills, cutting a 3-inch square with three stray cuts into the shape at the corners. He held the scissors with his thumb up but let his elbow swing out from his side.",
      "Cutting – She was able to hold the scissors correctly and cut out a 2-inch circle within an eighth of an inch of the line.",
    ],
  },
  {
    id: "g25-drawing",
    label: "Drawing / tool use",
    group: "classroom",
    opener: "{{They}} was able to draw [[what was drawn and which parts were included]].",
    examples: [
      "Drawing / Tool Use – He was able to draw a recognizable person with a head, eyes, a mouth, a body and two legs, leaving out the arms and hands until prompted.",
    ],
  },
  {
    id: "g25-handwriting",
    label: "Handwriting sample",
    group: "classroom",
    opener: "{{They}} produced a [[legibility]] handwriting sample. [[Speed, sizing, spacing, line adherence and letter formation]].",
    examples: [
      "Handwriting Sample – She produced a mostly legible handwriting sample. She wrote slowly, finishing two sentences in the time her classmates finished four. Her letters grew larger across the line and she left no space between several words, though most letters sat on the baseline.",
    ],
  },
  {
    id: "g25-visualmotor",
    label: "Visual motor",
    group: "supporting",
    opener: "{{They}} was able to [[catching and throwing an object]]. [[Following the object with {{their}} eyes]].",
    examples: [
      "Visual Motor – She was able to catch a beanbag with two hands four times out of five and throw it back toward the examiner. She watched the beanbag all the way into her hands.",
    ],
  },
  {
    id: "g25-tracking",
    label: "Visual tracking",
    group: "supporting",
    opener: "During visual tracking {{they}} was able to [[follow a moving object horizontally and vertically]]. [[Distractibility]]. Overall {{they}} demonstrated [[ocular motor control]].",
    examples: [
      "Visual Tracking – During visual tracking she was able to follow a pen light with her eyes horizontally, vertically and in a circle. She did not look away during the task. Overall she demonstrated good ocular motor control.",
    ],
  },
  {
    id: "g25-strength",
    label: "Upper extremity strength",
    group: "supporting",
    opener: "Informal manual muscle testing was completed on both upper extremities. [[Shoulder and elbow strength]]. [[Pinch and grip against resistance]]. [[Impact on school tasks]].",
    examples: [
      "Upper Extremity Strength – Informal manual muscle testing was completed on both upper extremities. The strength in her shoulders and elbows was within expected limits. Her pinch and grip gave way against light resistance on the left. This mild weakness does not appear to limit her classroom tasks, though she may tire sooner during long writing periods.",
    ],
  },
  {
    id: "g25-tone",
    label: "Muscle tone",
    group: "supporting",
    opener: "{{Their}} hands appear [[muscle tone]]. [[Supporting observations]]. [[Possible impact]].",
    examples: [
      "Muscle Tone – Her hands appear to have typical muscle tone. She held a steady pinch during testing and kept an upright sitting posture through the session.",
    ],
  },
  {
    id: "g25-fmcoord",
    label: "Fine motor coordination",
    group: "supporting",
    opener: "{{They}} demonstrated [[finger coordination and imitation of fine motor tasks]]. [[In-hand manipulation: rotating, translating and shifting a pencil]].",
    examples: [
      "Fine Motor Coordination – He demonstrated fair finger coordination, imitating familiar finger movements but needing two tries for unfamiliar ones. With his dominant hand he could turn a pencil end over end but dropped it when asked to walk his fingers along it. His in-hand manipulation skills are still developing.",
    ],
  },
  {
    id: "g25-posture",
    label: "Postural control",
    group: "supporting",
    opener: "{{They}} was able to maintain the supine flexion (egg) pose for [[seconds]]. [[Prone extension (airplane) and plank]]. [[What this shows about core strength and postural control]].",
    examples: [
      "Postural Control – She was able to maintain the supine flexion (egg) pose for 20 seconds. She held the prone extension (airplane) pose for 8 seconds with her legs lifting only briefly, and held a plank on her elbows for 10 seconds with a sagging back. The short holds in the airplane and plank positions suggest reduced core strength for sustained postural control.",
    ],
  },
  {
    id: "g25-motorcontrol",
    label: "Motor control",
    group: "supporting",
    opener: "{{They}} was able to [[gross motor skills such as galloping, skipping and jumping jacks]], indicating [[motor control and motor planning]]. [[Steps and moving around the school]].",
    examples: [
      "Motor Control – She was able to gallop, hop on each foot and perform jumping jacks, indicating she has the motor control and motor planning skills for the gross motor activities expected in an elementary school. She goes up and down the stairs with alternating feet and moves around the school without difficulty.",
    ],
  },
  {
    id: "g25-bilateral",
    label: "Bilateral coordination",
    group: "supporting",
    opener: "{{They}} was able to [[jumping jacks and skipping]]. [[Using both hands together, such as when cutting]].",
    examples: [
      "Bilateral Coordination – He was able to perform jumping jacks but skipped with a gallop on one side. He used both hands together to cut out a 2-inch square, turning the paper with his helper hand. Mild challenges with bilateral coordination were noted during the gross motor tasks only.",
    ],
  },
];

const G68: ScreenItem[] = [
  {
    id: "g68-typing",
    label: "Typing",
    group: "paragraph",
    opener:
      "{{They}} is comfortable navigating [[devices, apps and keys used]]. On a [[length]]-minute typing test, {{their}} typing speed was [[number]] words per minute with [[percent]]% accuracy using [[fingers used]]. {{Their}} speed is affected by [[what affects speed]]. [[Assistive technology in use]]. [[Recommendation]].",
    examples: [
      "Typing: She is comfortable navigating her school laptop, logging in and opening her writing assignments on her own, and uses the Shift, Enter and Backspace keys without looking. On an informal 3-minute typing test, her typing speed was 14 words per minute with 92% accuracy using two fingers on each hand. Her speed is affected by looking down at the keyboard and by rereading each sentence before moving on. She uses word prediction for longer assignments. Continued access to a laptop for written work of more than a paragraph is recommended.",
      "Typing: He is comfortable navigating the class tablet and its keyboard, opening documents and using the Spacebar, Shift and arrow keys accurately. On a 3-minute test, his typing speed is 7 words per minute with 88% accuracy using his index fingers. His speed is affected by searching for keys and by self-correcting. He does not currently use speech-to-text, and a trial of it is recommended for longer writing tasks.",
    ],
  },
  {
    id: "g68-handwriting",
    label: "Handwriting",
    group: "paragraph",
    opener:
      "{{They}} [[writing tool and pencil grasp]]. When handwriting [[the writing sample]], {{they}} took [[time]]. [[Line adherence, spacing, sizing, letter formation and legibility]]. {{They}} might benefit from [[supports]].",
    examples: [
      "Handwriting: She prefers a gel pen and uses a thumb-wrap pencil grasp that keeps her wrist bent while she writes. When handwriting the same three sentences, she took 3 minutes and 10 seconds. About 70% of her letters sat on the baseline, her spacing between words was uneven, and her lowercase letters varied in size, which affected legibility. She might benefit from paper with a highlighted baseline, a slant board to bring her wrist into extension, and a short daily warm-up for her fingers before writing tasks.",
      "Handwriting: His handwriting is legible, with letters on the baseline and even spacing. His letters are small for the wide-ruled paper his class uses, so his teacher sometimes asks him to rewrite answers. He pressed hard enough to leave marks on the next page. He monitors his own work, going back to add a missed capital letter without a prompt.",
    ],
  },
  {
    id: "g68-sensory",
    label: "Sensory regulation",
    group: "paragraph",
    opener:
      "According to teacher reports and classroom observations, {{their}} sensory regulation is [[functional or a concern::functionalOrConcern]]. [[Sensory accommodations or supports in use]]. [[Observed responses and self-regulation strategies]]. Overall, [[impact on classroom participation]].",
    examples: [
      "Sensory Regulation: According to teacher reports and classroom observations, her sensory regulation is functional, and she takes part in all classroom routines. She uses a wobble cushion on her chair during lessons and chooses a quiet corner of the library at lunch. When the fire alarm sounded during the observation, she covered her ears, then returned to her work within a minute without a prompt. Overall, her sensory processing skills support her classroom participation.",
    ],
  },
];

export const SCREEN_ITEMS: Record<GradeGroup, ScreenItem[]> = {
  k1: K1,
  g25: G25,
  g68: G68,
  // No 9–12 template yet: use the middle-school items.
  g912: G68,
};

/** True when a grade group borrows another group's items. */
export const SCREEN_BORROWED: Partial<Record<GradeGroup, GradeGroup>> = { g912: "g68" };

export function screenItemsFor(grade: GradeGroup): ScreenItem[] {
  return SCREEN_ITEMS[grade];
}
