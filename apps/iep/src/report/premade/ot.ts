import type { GridDef } from "../grids";
import { blankPack, type PackAssessment, type PackBlock, type PackSection, type TemplatePack } from "../pack";

/**
 * A ready-made occupational therapy report template. The section headings are
 * the ones school OT reports usually carry; everything under them is generic
 * wording with blanks for what the writer knows, written fresh for this tool.
 * Every example is fictional and is only ever shown to an AI prompt as a
 * style sample. Nothing here follows any one district's form.
 */

const CLOSING =
  "School-based occupational therapy supports a student's access to the school day: written work, classroom tools, routines and participation. It is not the same as medical or clinic-based therapy. Questions about this report can be directed to the occupational therapist.";

// ---------- teacher rating checklist: a grid the teacher's ratings are written from ----------

function teacherGrid(): GridDef {
  return {
    id: "teacher",
    title: "Rate each classroom task",
    layout: "byGroup",
    blank: "[[ratings for this group]]",
    allClear: "within expectations on every task rated",
    levels: [
      { value: "typical", label: "Typical", sentence: "{Items} {was} rated as typical for the class." },
      { value: "some", label: "Some difficulty", sentence: "Difficulty with {items} was noted some of the time.", concern: true },
      { value: "often", label: "Frequent difficulty", sentence: "{Items} {was} rated as a frequent difficulty.", concern: true },
      { value: "na", label: "Not observed", sentence: "" },
    ],
    groups: [
      {
        id: "written",
        label: "Written work",
        rows: [
          { id: "letters", label: "forming letters and numbers" },
          { id: "sizing", label: "sizing and spacing" },
          { id: "copying", label: "copying from the board or a book" },
          { id: "finishing", label: "finishing written work in the time given" },
          { id: "pressure", label: "pencil pressure and grip" },
        ],
      },
      {
        id: "tools",
        label: "Classroom tools",
        rows: [
          { id: "scissors", label: "using scissors" },
          { id: "coloring", label: "coloring and drawing" },
          { id: "glue", label: "gluing and folding" },
          { id: "ruler", label: "using a ruler" },
          { id: "keyboard", label: "keyboard and mouse use" },
        ],
      },
      {
        id: "routines",
        label: "Daily routines",
        rows: [
          { id: "clothing", label: "managing a coat, zipper and buttons" },
          { id: "lunch", label: "opening food packages and containers at lunch" },
          { id: "materials", label: "organizing materials and a desk" },
          { id: "moving", label: "lining up and moving with the class" },
        ],
      },
      {
        id: "regulation",
        label: "Attention and regulation",
        rows: [
          { id: "sitting", label: "sitting upright at a desk" },
          { id: "still", label: "keeping hands and body still" },
          { id: "noise", label: "tolerating noise and busy settings" },
          { id: "messy", label: "handling messy materials" },
        ],
      },
    ],
  };
}

function teacherChecklist(): PackAssessment {
  return {
    id: "teacher",
    label: "Teacher rating checklist",
    grid: teacherGrid(),
    sections: [
      {
        id: "teacher",
        title: "Teacher Rating Checklist",
        blocks: [
          {
            kind: "para",
            id: "intro",
            text: "{{student}}'s [[who completed it::completedBy]] rated how {{they}} manages everyday classroom tasks compared with classmates. Each task was marked as typical, some difficulty, frequent difficulty, or not observed.",
          },
          { kind: "grid", id: "grid-teacher", grid: "teacher" },
          { kind: "para", id: "comments", text: "In the comments, the teacher wrote that {{they}} [[what the teacher wrote, in plain words]]." },
          { kind: "para", id: "strategies", text: "To support {{their}} needs in the classroom, accommodations such as [[accommodations in use::accommodations]] are in place." },
        ],
        examples: [
          "[STUDENT]'s classroom teacher rated how he manages everyday classroom tasks compared with classmates. Forming letters and numbers and finishing written work in the time given were rated as a frequent difficulty. Difficulty with copying from the board or a book was noted some of the time. Using scissors, coloring and drawing, and gluing and folding were rated as typical for the class. In the comments, the teacher wrote that he is the last to finish any page with writing on it and often asks to type instead. To support his needs in the classroom, accommodations such as extra time and a slant board are in place.",
          "[STUDENT]'s special education teacher rated how she manages everyday classroom tasks compared with classmates. Every task under written work was rated as typical for the class. Difficulty with managing a coat, zipper and buttons and opening food packages and containers at lunch was noted some of the time. Tolerating noise and busy settings was rated as a frequent difficulty. In the comments, the teacher wrote that she covers her ears during assemblies and asks to eat lunch in the classroom. To support her needs in the classroom, accommodations such as noise-canceling headphones and a designated seating spot are in place.",
        ],
        notesHint: "Who filled in the checklist, the ratings, and anything the teacher wrote in the comments.",
      },
    ],
  };
}

// ---------- informal fine motor screen: tick boxes per grade ----------

type Item = { id: string; label: string; text: string };

const item = (i: Item): PackBlock => ({ kind: "bullet", id: i.id, label: i.label, text: i.text, optional: true });
const sub = (id: string, text: string): PackBlock => ({ kind: "subheading", id, text });

const SCREEN_INTRO =
  "An informal fine motor screen was completed with {{student}} to see how {{they}} manages the hand skills expected in {{their}} grade. The items below were done one to one in [[where it was done]].";

function screenSection(id: string, grades: NonNullable<PackSection["when"]>["grades"], blocks: PackBlock[], examples: string[]): PackSection {
  return {
    id,
    title: "Informal Fine Motor Screen",
    when: { grades },
    blocks: [{ kind: "para", id: "intro", text: SCREEN_INTRO }, ...blocks],
    examples,
    notesHint: "What you saw on each item you ticked, with any times, counts or measurements.",
  };
}

function fineMotorScreen(): PackAssessment {
  return {
    id: "screen",
    label: "Informal fine motor screen",
    sections: [
      screenSection(
        "screen-k1",
        ["k1"],
        [
          sub("h-writing", "Writing and drawing"),
          item({ id: "k1-name", label: "Name writing", text: "{{They}} wrote {{their}} first name [[from memory or from a model]], with [[which letters were formed correctly, reversed or left out]]." }),
          item({ id: "k1-strokes", label: "Prewriting strokes", text: "{{They}} copied a vertical line, a horizontal line, a circle, a cross and a square; [[which were copied and which were not]]." }),
          item({ id: "k1-grasp", label: "Crayon and pencil grasp", text: "{{They}} held the crayon with a [[handedness::handedness]] [[grasp type::grasp]] grasp and [[switched hands or kept to one hand]]." }),
          item({ id: "k1-coloring", label: "Coloring", text: "{{They}} colored a simple picture [[staying inside the lines or going well outside them]] using [[small strokes or large scribbles]]." }),
          sub("h-tools", "Scissors and tools"),
          item({ id: "k1-scissors", label: "Scissors", text: "{{They}} held the scissors [[thumb up or with a turned wrist]], snipped the edge of the paper [[how]], and cut along a straight line [[staying on it or how far off]]." }),
          item({ id: "k1-glue", label: "Glue and paper", text: "{{They}} [[spread glue, tore paper or folded a sheet in half]] with [[the result]]." }),
          item({ id: "k1-small", label: "Small objects", text: "{{They}} strung [[number]] beads in [[time]] and picked up small pieces with [[fingertips or a raking grasp]]." }),
          sub("h-hands", "Hands and posture"),
          item({ id: "k1-fasteners", label: "Fasteners", text: "{{They}} [[managed or needed help with]] a zipper, large buttons and snaps on [[a practice vest or own clothing]]." }),
          item({ id: "k1-posture", label: "Sitting and helper hand", text: "At the table {{they}} sat [[upright, slumped or leaning on an elbow]], and {{their}} helper hand [[held the paper or stayed in the lap]]." }),
        ],
        [
          "An informal fine motor screen was completed with [STUDENT] to see how he manages the hand skills expected in his grade. The items below were done one to one in the classroom at a back table. He wrote his first name from a model, with every letter formed and the two capitals reversed. He copied a vertical line, a horizontal line and a circle; the cross and the square came out as loops. He held the crayon with a right-handed fisted grasp and switched hands twice. He held the scissors thumb up, snipped the edge of the paper in short bites, and cut along a straight line about half an inch off. At the table he sat leaning on an elbow, and his helper hand stayed in the lap until reminded.",
          "An informal fine motor screen was completed with [STUDENT] to see how she manages the hand skills expected in her grade. The items below were done one to one in the therapy room. She wrote her first name from memory, with every letter formed correctly. She colored a simple picture staying inside the lines using small strokes. She strung twelve beads in under a minute and picked up small pieces with her fingertips. She managed a zipper and snaps on a practice vest and needed help with the large buttons.",
        ],
      ),
      screenSection(
        "screen-g25",
        ["g25"],
        [
          sub("h-handwriting", "Handwriting"),
          item({ id: "g25-near", label: "Copying from the desk", text: "{{They}} copied a sentence from a card on the desk in [[time]] with [[legibility, spacing and sizing]]." }),
          item({ id: "g25-far", label: "Copying from the board", text: "{{They}} copied two lines from the board in [[time]], looking up [[once per word or once per letter]]." }),
          item({ id: "g25-alphabet", label: "Alphabet from memory", text: "Asked to write the alphabet from memory, {{they}} finished in [[time]] with [[letters out of order, missing or reversed]]." }),
          item({ id: "g25-sizing", label: "Letter size and spacing", text: "{{Their}} letters were [[consistent in size, mixed, or floating above the line]] with [[spacing between words]]." }),
          item({ id: "g25-grasp", label: "Grasp and pressure", text: "{{They}} used a [[handedness::handedness]] [[grasp type::grasp]] grasp and pressed [[too hard, too lightly or evenly]]." }),
          sub("h-tools", "Scissors and tools"),
          item({ id: "g25-cutting", label: "Cutting", text: "{{They}} cut out a [[shape]] [[within the line or how far off]] and turned the paper with {{their}} helper hand [[smoothly or not at all]]." }),
          item({ id: "g25-ruler", label: "Ruler and folding", text: "{{They}} drew a line with a ruler [[holding it still or letting it slip]] and folded a sheet into [[halves or quarters]] with [[matched or uneven edges]]." }),
          item({ id: "g25-keyboard", label: "Keyboarding", text: "{{They}} typed a short sentence using [[one finger, two fingers or home row]] at about [[words per minute]] words per minute." }),
          sub("h-hands", "Hands and posture"),
          item({ id: "g25-inhand", label: "In-hand manipulation", text: "{{They}} moved coins from {{their}} palm to {{their}} fingertips [[one at a time or dropping them]] and turned the pencil to erase [[without or with help from the other hand]]." }),
          item({ id: "g25-bilateral", label: "Two-handed tasks", text: "{{They}} [[opened a container, tied a knot or threaded a shoelace]] using [[both hands together or one hand only]]." }),
          item({ id: "g25-posture", label: "Posture and endurance", text: "{{They}} sat [[upright or slumped]] at the desk and, after [[minutes]] minutes of writing, [[kept the same quality or shook out the hand]]." }),
        ],
        [
          "An informal fine motor screen was completed with [STUDENT] to see how she manages the hand skills expected in her grade. The items below were done one to one in the therapy room. She copied a sentence from a card on the desk in two minutes with legible letters that drifted below the line. She copied two lines from the board in four minutes, looking up once per letter. Asked to write the alphabet from memory, she finished in just over a minute with the b and the d reversed. She used a left-handed thumb wrap grasp and pressed too hard. She sat slumped at the desk and, after five minutes of writing, shook out the hand and asked to stop.",
          "An informal fine motor screen was completed with [STUDENT] to see how he manages the hand skills expected in his grade. The items below were done one to one in the classroom. He cut out a circle within the line and turned the paper with his helper hand smoothly. He drew a line with a ruler holding it still and folded a sheet into quarters with matched edges. He typed a short sentence using two fingers at about eight words per minute. He moved coins from his palm to his fingertips one at a time and turned the pencil to erase without help from the other hand.",
        ],
      ),
      screenSection(
        "screen-older",
        ["g68", "g912"],
        [
          sub("h-written", "Written work"),
          item({ id: "older-notes", label: "Note taking", text: "{{They}} took notes from a short spoken passage, producing [[how much was captured and how legible it was]]." }),
          item({ id: "older-endurance", label: "Writing endurance", text: "After [[minutes]] minutes of continuous writing {{their}} handwriting [[stayed the same, grew larger or became hard to read]], and {{they}} reported [[fatigue, pain or neither]]." }),
          item({ id: "older-forms", label: "Forms and worksheets", text: "{{They}} filled in a worksheet with small answer spaces [[fitting the spaces or writing over the lines]]." }),
          sub("h-keyboard", "Keyboarding and organization"),
          item({ id: "older-typing", label: "Keyboarding", text: "{{They}} typed a paragraph at about [[words per minute]] words per minute with [[accuracy]] using [[home row, two fingers or hunt and peck]]." }),
          item({ id: "older-organize", label: "Organization", text: "{{Their}} binder, backpack or locker was [[organized or how it looked]], and {{they}} found a requested paper in [[time]]." }),
          item({ id: "older-tools", label: "Tools for class", text: "{{They}} used [[a compass, protractor, calculator or lab equipment]] [[with or without difficulty]]." }),
          sub("h-regulation", "Hands and regulation"),
          item({ id: "older-selfcare", label: "Self-care at school", text: "{{They}} [[managed or needed help with]] [[a combination lock, lunch packaging or sports clothing]]." }),
          item({ id: "older-regulation", label: "Regulation during class", text: "During the session {{they}} [[sat still, fidgeted or needed breaks]] and said that [[what helps in class]]." }),
          item({ id: "older-supports", label: "Using supports", text: "{{They}} [[named the supports that help, or could not say what helps]] and [[uses them or does not]] in class." }),
        ],
        [
          "An informal fine motor screen was completed with [STUDENT] to see how he manages the hand skills expected in his grade. The items below were done one to one in the resource room. He took notes from a short spoken passage, producing about half the key words in writing that was hard to read. After ten minutes of continuous writing his handwriting grew larger and drifted off the lines, and he reported an aching hand. He typed a paragraph at about twenty words per minute with few errors using home row. His binder was organized by subject, and he found a requested paper in under thirty seconds. He named the supports that help and said he uses the laptop in two of his classes.",
          "An informal fine motor screen was completed with [STUDENT] to see how she manages the hand skills expected in her grade. The items below were done one to one in the therapy room. She filled in a worksheet with small answer spaces writing over the lines in every box. She used a protractor with difficulty, holding it with both hands and losing her place. She needed help with the combination lock on her locker. During the session she fidgeted with her sleeves and said that moving to the back of the room helps her concentrate.",
        ],
      ),
    ],
  };
}

// ---------- Beery VMI ----------

function beery(): PackAssessment {
  return {
    id: "beery",
    label: "Beery VMI",
    sections: [
      {
        id: "beery",
        title: "Beery-Buktenica Developmental Test of Visual-Motor Integration",
        blocks: [
          {
            kind: "para",
            id: "intro",
            text: "The Beery VMI asks {{student}} to copy a series of geometric forms that become harder as the test goes on. Two supplemental tests separate what {{they}} sees from what {{their}} hands do: Visual Perception (matching forms without drawing) and Motor Coordination (tracing forms within a path). Standard scores have a mean of 100; 90 to 109 is average.",
          },
          { kind: "para", id: "vmi", label: "Visual-Motor Integration", text: "Standard score [[score]], percentile rank [[percentile]], [[descriptor::beeryDescriptor]]. {{They}} copied the forms [[how: which forms were lost, line quality, rotations]]." },
          { kind: "para", id: "vp", label: "Visual Perception", text: "Standard score [[score]], percentile rank [[percentile]], [[descriptor::beeryDescriptor]], with [[time taken and the kinds of errors]]." },
          { kind: "para", id: "mc", label: "Motor Coordination", text: "Standard score [[score]], percentile rank [[percentile]], [[descriptor::beeryDescriptor]], with [[where the pencil left the path]]." },
          { kind: "para", id: "pattern", text: "Taken together, the three scores suggest that [[whether the difficulty is in seeing the form, in drawing it, or in putting the two together]]." },
          { kind: "para", id: "overall", text: "Overall, {{their}} performance on this assessment fell in the [[overall range::range]] range." },
          { kind: "para", id: "behavior", text: "During testing {{they}} [[attention, effort and pace]]." },
        ],
        examples: [
          "The Beery VMI asks [STUDENT] to copy a series of geometric forms that become harder as the test goes on. Visual-Motor Integration: standard score 82, percentile rank 12, Below Average. He copied the forms with wobbly lines and lost the diagonal forms, drawing the triangle with rounded corners. Visual Perception: standard score 104, percentile rank 61, Average, with no errors in the time allowed. Motor Coordination: standard score 79, percentile rank 8, Below Average, with the pencil leaving the path on every curved form. Taken together, the three scores suggest that the difficulty is in drawing the form rather than in seeing it. Overall, his performance on this assessment fell in the below average range. During testing he worked carefully and asked to erase several forms.",
          "The Beery VMI asks [STUDENT] to copy a series of geometric forms that become harder as the test goes on. Visual-Motor Integration: standard score 97, percentile rank 42, Average. She copied the forms with firm lines and lost only the last three. Visual Perception: standard score 95, percentile rank 37, Average, with two errors near the end. Motor Coordination: standard score 101, percentile rank 53, Average, with the pencil leaving the path once. Taken together, the three scores suggest that seeing, drawing and putting the two together are all within the expected range. Overall, her performance on this assessment fell in the average range. During testing she worked quickly and said the task was easy.",
        ],
        notesHint: "The three scores, what you saw while the student copied, and how the student approached the task.",
      },
    ],
  };
}

// ---------- SPM-2 School form ----------

const SPM_SCALES = ["Social Participation", "Vision", "Hearing", "Touch", "Taste and Smell", "Body Awareness", "Balance and Motion", "Planning and Ideas", "Sensory Total"];

function spmGrid(): GridDef {
  return {
    id: "spm2",
    title: "Choose the range for each scale",
    layout: "byLevel",
    blank: "[[scales in this range, or none]]",
    none: "None",
    allClear: "within the typical range on every scale",
    levels: [
      { value: "typical", label: "Typical Processing", sentence: "{items}" },
      { value: "moderate", label: "Moderate Difficulties", sentence: "{items}", concern: true },
      { value: "severe", label: "Severe Difficulties", sentence: "{items}", concern: true },
    ],
    groups: [{ id: "scales", label: "Scales", rows: SPM_SCALES.map((s) => ({ id: s, label: s, ...(s === "Sensory Total" ? { composite: true } : {}) })) }],
  };
}

function spm2(): PackAssessment {
  return {
    id: "spm2",
    label: "SPM-2 School form",
    grid: spmGrid(),
    sections: [
      {
        id: "spm2",
        title: "Sensory Processing Measure-2: Child School Form",
        blocks: [
          {
            kind: "para",
            id: "intro",
            text: "The SPM-2 is a questionnaire about how a student responds to everyday sensory input at school. {{student}}'s [[who completed it::completedBy]] completed the school form. Each scale falls in one of three ranges: Typical Processing, Moderate Difficulties, or Severe Difficulties.",
          },
          { kind: "grid", id: "grid-spm2", grid: "spm2" },
          { kind: "para", id: "meaning", text: "Scales in the Moderate or Severe range describe sensory responses that are noticed more often than in most classmates. At school this looks like {{them}} [[what the teacher sees, in plain words]]." },
          { kind: "para", id: "typical", text: "Scales in the Typical range are areas where {{their}} responses match those of most classmates: [[what works well for the student]]." },
        ],
        examples: [
          "The SPM-2 is a questionnaire about how a student responds to everyday sensory input at school. [STUDENT]'s classroom teacher completed the school form. Typical Processing: Social Participation, Vision, Taste and Smell, and Planning and Ideas. Moderate Difficulties: Hearing, Body Awareness, and Sensory Total. Severe Difficulties: Touch and Balance and Motion. Scales in the Moderate or Severe range describe sensory responses that are noticed more often than in most classmates. At school this looks like him pulling away from glue and paint, leaning on walls and furniture while he waits, and tipping his chair back during lessons. Scales in the Typical range are areas where his responses match those of most classmates: he joins group work readily and follows a visual schedule without help.",
          "The SPM-2 is a questionnaire about how a student responds to everyday sensory input at school. [STUDENT]'s special education teacher completed the school form. Typical Processing: Vision, Hearing, Touch, Taste and Smell, Body Awareness, Balance and Motion, Planning and Ideas, and Sensory Total. Moderate Difficulties: Social Participation. Severe Difficulties: None. Scales in the Moderate or Severe range describe sensory responses that are noticed more often than in most classmates. At school this looks like her standing at the edge of a group at recess and waiting to be invited in. Scales in the Typical range are areas where her responses match those of most classmates: she handles every classroom material and moves through transitions with the class.",
        ],
        notesHint: "Who completed the form, which scales were in which range, and what the sensory responses look like in class.",
      },
    ],
  };
}

// ---------- the sections around the assessments ----------

function aroundSections(): PackSection[] {
  return [
    {
      id: "present-levels",
      title: "Present Level of Performance",
      place: "before",
      when: { reportType: "annual" },
      blocks: [
        { kind: "para", id: "reported-by", label: "Occupational Therapy", text: "Reported by [[your name and credentials]]" },
        { kind: "subheading", id: "h-progress", text: "Progress on current goals" },
        { kind: "para", id: "progress", text: "{{student}} has been working on [[the current goal in a few words]]. {{They}} has met [[number met::objectivesMet]] of [[total::objectivesTotal]] objectives: [[the latest data for each objective]]." },
        { kind: "subheading", id: "h-present", text: "Present levels" },
        { kind: "para", id: "present", text: "{{They}} currently receives [[minutes and frequency::minutes]] of occupational therapy [[where::location]]. In class {{they}} now [[what the student can do in each area of need, with data]], and still finds [[what remains hard]] difficult." },
      ],
      examples: [
        "[STUDENT] has been working on legible handwriting at the pace of the class. He has met 2 of 3 objectives: he forms every lowercase letter correctly in 4 out of 5 samples, he leaves a finger space between words in 4 out of 5 samples, and he finishes a five-sentence paragraph in the time given in 2 out of 5 samples. He currently receives 30 minutes weekly of occupational therapy both inside and outside the classroom. In class he now completes short written answers without a scribe, and still finds longer writing tasks and copying from the board difficult.",
      ],
      notesHint: "The current goal, the latest data on each objective, the current service, and what the student can do now.",
    },
    {
      id: "summary",
      title: "Evaluation Summary",
      place: "after",
      when: { reportType: "evaluation", concerns: true },
      blocks: [
        { kind: "para", id: "overview", text: "The teacher checklist, the screen, testing and observation give a consistent picture: {{student}} has difficulty with [[areas of need::skillAreas]], which shows up in class as [[concern areas::concernAreas]]." },
        { kind: "para", id: "motor", label: "Motor", text: "{{Their}} fine motor and visual-motor skills are an area of concern: [[what the screen and testing showed]].", when: { concernIn: { motor: true } } },
        { kind: "para", id: "motor-none", label: "Motor", text: "{{Their}} fine motor and visual-motor skills are within the range expected for {{their}} grade.", when: { concernIn: { motor: false } } },
        { kind: "para", id: "teacher", text: "On the teacher checklist, {{their}} classroom performance was {summary:teacher}.", when: { assessments: { teacher: true } } },
        { kind: "para", id: "sensory", text: "On the SPM-2, {{their}} sensory processing at school was {summary:spm2}.", when: { assessments: { spm2: true } } },
        { kind: "para", id: "sensory-concern", label: "Sensory", text: "{{Their}} sensory processing is an area of concern: [[what it looks like in class and what helps]].", when: { concernIn: { sensory: true } } },
        { kind: "para", id: "sensory-none", label: "Sensory", text: "No sensory concerns that interfere with learning or participation were found.", when: { concernIn: { sensory: false } } },
        { kind: "para", id: "strengths", text: "Strengths include [[what the student does well, in your own words]]." },
        { kind: "para", id: "why", text: "These difficulties matter because [[how they affect written work, participation or independence at school]]." },
      ],
      examples: [
        "The teacher checklist, the screen, testing and observation give a consistent picture: [STUDENT] has difficulty with handwriting, visual motor integration skills, and postural control, which shows up in class as letter formation, task completion rate, and desk and floor posture. Motor: His fine motor and visual-motor skills are an area of concern: he forms letters from the bottom up and loses the diagonal forms when copying. On the teacher checklist, his classroom performance was affected with Frequent difficulty for forming letters and numbers and finishing written work in the time given. On the SPM-2, his sensory processing at school was affected with Moderate Difficulties for Body Awareness. Sensory: His sensory processing is an area of concern: he leans on furniture and tips his chair during lessons, and settles with a movement break before writing. Strengths include his willingness to try every task, his ideas for stories, and his ability to explain what is hard for him. These difficulties matter because written work is how he is asked to show what he knows in every subject.",
      ],
      notesHint: "The main findings across every assessment, the strengths, and what the findings mean for the student at school.",
    },
    {
      id: "summary-none",
      title: "Evaluation Summary",
      place: "after",
      when: { reportType: "evaluation", concerns: false },
      blocks: [
        { kind: "para", id: "overview", text: "The results of this evaluation place {{student}}'s fine motor, visual-motor and sensory processing skills within the range expected for {{their}} age and grade. [[The findings in a few lines]]." },
        { kind: "para", id: "recommendation", text: "Occupational therapy is not recommended at this time. [[Suggestions for the classroom, if any]]." },
      ],
      examples: [
        "The results of this evaluation place [STUDENT]'s fine motor, visual-motor and sensory processing skills within the range expected for her age and grade. Every task on the teacher checklist was rated as typical, her Beery VMI scores were in the average range, and she completed every screen item with age-expected quality. Occupational therapy is not recommended at this time. The classroom teacher may want to keep offering the pencil grip she already uses, since she said it helps her hand feel less tired.",
      ],
      notesHint: "The findings that show skills are within the expected range, and any suggestions for the classroom.",
    },
    {
      id: "next-steps",
      title: "Next Steps",
      place: "after",
      when: { concerns: true },
      blocks: [
        { kind: "para", id: "eligibility", text: "Based on these results, {{student}} needs occupational therapy as a related service to benefit from {{their}} special education program under the category of [[disability category::disability]]. The IEP team will meet to review this report and agree on services and goals." },
        { kind: "para", id: "closing", text: CLOSING },
      ],
      examples: [
        "Based on these results, [STUDENT] needs occupational therapy as a related service to benefit from his special education program under the category of Other Health Impairment. The IEP team will meet to review this report and agree on services and goals.",
      ],
      notesHint: "The eligibility category and why occupational therapy is needed.",
    },
    {
      id: "impact",
      title: "Impact of Disability Statement",
      place: "after",
      when: { concerns: true },
      blocks: [
        { kind: "para", id: "impact", text: "{{student}}'s difficulty with [[areas of need::skillAreas]] affects {{their}} ability to [[what is hard at school: written work, classroom tools, routines, participation]]. Without support {{they}} would [[what would happen in the general education setting]], so {{they}} needs [[supports::supports]] to access the curriculum." },
      ],
      examples: [
        "[STUDENT]'s difficulty with handwriting and visual motor integration skills affects her ability to finish written work in the time given and to copy from the board. Without support she would hand in incomplete work and fall behind in note-based subjects, so she needs specialized instruction, assistive technology, and adapted paper to access the curriculum.",
      ],
      notesHint: "How the motor or sensory difficulties affect access and participation at school.",
    },
    {
      id: "service",
      title: "Service Delivery Statement",
      place: "after",
      when: { concerns: true },
      blocks: [
        { kind: "para", id: "intro", text: "{{student}} will receive occupational therapy as a related service for [[minutes and frequency::minutes]], [[where::location]], to address [[areas of need::skillAreas]]." },
        { kind: "para", id: "direct", text: "Services will be direct: the occupational therapist will work with {{them}} on [[what the sessions will target]] and will check in with {{their}} teacher about carryover to class.", when: { serviceType: "direct" } },
        {
          kind: "para",
          id: "indirect",
          text: "These services will be indirect, to support [[what they support, such as accommodations or strategies]]. They will consist of collaborating with {{their}} special education team and general education teachers, or working one to one with the occupational therapist to assess or learn new skills as needed.",
          when: { serviceType: "indirect" },
        },
        { kind: "para", id: "accommodations", text: "Accommodations include [[accommodations::accommodations]]." },
      ],
      examples: [
        "[STUDENT] will receive occupational therapy as a related service for 30 minutes weekly, both inside and outside the classroom, to address handwriting and postural control. Services will be direct: the occupational therapist will work with him on letter formation and sitting posture and will check in with his teacher about carryover to class. Accommodations include a slant board, adapted paper, and extra time.",
        "[STUDENT] will receive occupational therapy as a related service for 20 minutes semesterly, inside the classroom, to address handwriting and sensory processing. These services will be indirect, to support accommodations related to written expression and strategies for sensory processing and regulation as needed. They will consist of collaborating with her special education team and general education teachers, or working one to one with the occupational therapist to assess or learn new skills as needed. Accommodations include noise-canceling headphones and a designated seating spot.",
      ],
      notesHint: "Minutes, frequency, location, areas, whether services are direct or indirect, and the accommodations.",
    },
    {
      id: "goal",
      title: "Motor Goal",
      place: "after",
      when: { concerns: true },
      blocks: [
        { kind: "para", id: "frame", text: "By [[month::month]] [[year::year]], {{student}} will [[the skill and the condition]] with [[level of support]], as measured by [[how progress is measured]] in [[data points::dataDates]] data collections, by meeting the {count} objectives below." },
        { kind: "subheading", id: "h-objectives", text: "Objectives" },
        { kind: "numbered", id: "objective", text: "{{They}} will [[the step toward the goal]] in [[percent::percent]]% of opportunities.", repeat: "objectives" },
        { kind: "subheading", id: "h-standards", text: "Related Standards" },
        { kind: "bullet", id: "standard-writing", text: "Writing: [[the writing standard this goal supports, with its code]]", when: { goalArea: "writing" } },
        { kind: "bullet", id: "standard-cutting", text: "Tool use: [[the art or practical-skills standard this goal supports, with its code]]", when: { goalArea: "cutting" } },
        { kind: "bullet", id: "standard-selfcare", text: "Independence: [[the life-skills or health standard this goal supports, with its code]]", when: { goalArea: "selfcare" } },
      ],
      examples: [
        "By May 2027, [STUDENT] will write a five-sentence paragraph that a reader unfamiliar with his writing can read with a visual model of the letters, as measured by work samples in 4 out of 5 data collections, by meeting the 3 objectives below. He will form every lowercase letter starting at the top in 80% of opportunities. He will leave a finger space between words in 80% of opportunities. He will finish the paragraph in the time given to the class in 70% of opportunities.",
      ],
      notesHint: "The target skill, the condition and level of support, how progress is measured, and one step per objective.",
    },
    {
      id: "ending",
      title: "Ending",
      place: "after",
      when: { reportType: "annual", concerns: false },
      blocks: [
        { kind: "para", id: "ending", text: "{{student}} has met {{their}} motor goals and now manages the written work, tools and routines of {{their}} grade [[with or without accommodations]]. Occupational therapy is no longer needed for {{them}} to benefit from {{their}} special education program. [[Any suggestions for staff going forward]]. With the team's agreement, occupational therapy will end." },
        { kind: "para", id: "closing", text: CLOSING },
      ],
      examples: [
        "[STUDENT] has met her motor goals and now manages the written work, tools and routines of her grade with the slant board she already uses. Occupational therapy is no longer needed for her to benefit from her special education program. Staff can keep the slant board available and allow typing for assignments longer than a page. With the team's agreement, occupational therapy will end.",
      ],
      notesHint: "Which goals were met and any suggestions for staff.",
    },
  ];
}

export function otPack(): TemplatePack {
  const base = blankPack("Occupational therapy");
  return {
    version: 1,
    titles: { evaluation: "Occupational Therapy Evaluation Report", annual: "Occupational Therapy Annual Review" },
    assessments: [teacherChecklist(), fineMotorScreen(), beery(), spm2()],
    sections: aroundSections(),
    lists: base.lists,
  };
}
