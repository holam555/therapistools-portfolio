import type { GridDef } from "../grids";
import { blankPack, type PackAssessment, type PackSection, type TemplatePack } from "../pack";

/**
 * A ready-made speech-language pathology report template. Generic school
 * wording with blanks for everything the writer knows; the examples are
 * fictional and only ever shown to an AI prompt as style samples.
 */

const SCORE = "Standard score: [[score]]. Percentile: [[percentile]]. [[descriptor::scoreDescriptor]].";

function communicationGrid(): GridDef {
  return {
    id: "communication", title: "Rate each communication skill", layout: "byLevel", blank: "[[skills at this level, or none]]", none: "None", allClear: "typical for every skill on the checklist",
    levels: [
      { value: "typical", label: "Typical for grade", sentence: "{items}" },
      { value: "sometimes", label: "Sometimes a concern", sentence: "{items}", concern: true },
      { value: "often", label: "Often a concern", sentence: "{items}", concern: true },
    ],
    groups: [
      { id: "listening", label: "Listening", rows: [{ id: "directions", label: "following classroom directions" }, { id: "questions", label: "understanding questions" }, { id: "vocabulary", label: "learning new vocabulary" }] },
      { id: "speaking", label: "Speaking", rows: [{ id: "understood", label: "being understood by others" }, { id: "sentences", label: "using complete sentences" }, { id: "retelling", label: "retelling a story or event" }, { id: "wordfinding", label: "finding the right word" }] },
      { id: "social", label: "Social communication", rows: [{ id: "turns", label: "taking turns in conversation" }, { id: "topic", label: "staying on topic" }, { id: "starting", label: "starting conversations with peers" }] },
    ],
  };
}

function checklist(): PackAssessment {
  return {
    id: "checklist", label: "Teacher and parent communication checklist", grid: communicationGrid(),
    sections: [
      {
        id: "checklist", title: "Communication Checklist",
        blocks: [
          { kind: "para", id: "intro", text: "A communication checklist was completed by {{student}}'s [[who completed it::completedBy]] to describe how {{they}} listens, speaks and interacts during the school day. Each skill was rated as typical for grade, sometimes a concern, or often a concern." },
          { kind: "grid", id: "grid-communication", grid: "communication" },
          { kind: "para", id: "comments", text: "The rater added that {{they}} [[comments written on the checklist]]." },
        ],
        examples: [
          "A communication checklist was completed by [STUDENT]'s classroom teacher to describe how he listens, speaks and interacts during the school day. Following classroom directions and retelling a story or event were often a concern; the rest were typical for grade. The teacher added that he needs directions repeated and gives short answers during sharing time.",
          "A communication checklist was completed by [STUDENT]'s parent and classroom teacher. Both rated being understood by others as often a concern. The teacher added that she is a willing talker but peers ask her to repeat herself.",
        ],
        notesHint: "Who filled in the checklist, the ratings, and any comments they wrote.",
      },
    ],
  };
}

function languageTest(): PackAssessment {
  return {
    id: "language", label: "Standardized language assessment",
    sections: [
      {
        id: "language", title: "Standardized Language Assessment",
        blocks: [
          { kind: "para", id: "intro", text: "The [[test name]] was given to {{student}} to measure {{their}} understanding and use of spoken language. Standard scores have a mean of 100 and a standard deviation of 15; scores from 85 to 115 are in the average range." },
          { kind: "para", id: "core", label: "Core language", text: SCORE },
          { kind: "para", id: "receptive", label: "Receptive language", text: SCORE },
          { kind: "para", id: "expressive", label: "Expressive language", text: SCORE },
          { kind: "para", id: "subtests", text: "Across the subtests, {{they}} did best with [[strongest subtests and what they ask for]] and had the most difficulty with [[weakest subtests and what they ask for]]. Testing behavior: {{they}} [[attention, effort and response style during testing]]." },
        ],
        examples: [
          "Across the subtests, [STUDENT] did best with the tasks that asked him to point to a picture after hearing a sentence, and had the most difficulty with repeating sentences and making up a sentence from given words. He stayed with each task but asked for several items to be repeated.",
          "Across the subtests, [STUDENT] did best with naming vocabulary and had the most difficulty with following directions that had two or more steps. Her attention was good for the first half of the session and she needed a short break before finishing.",
        ],
        notesHint: "The test name, the scores for each index, which subtests were strongest and weakest, and how testing went.",
      },
    ],
  };
}

function articulation(): PackAssessment {
  const intro = (how: string) => `Speech sound production was assessed ${how}. {{student}} `;
  const younger: PackSection = {
    id: "artic-k1", title: "Articulation and Phonology", when: { grades: ["k1"] },
    blocks: [
      { kind: "para", id: "intro", text: `${intro("with a single-word articulation test and in play")}produced errors on [[sounds in error::articulationErrors]]. Phonological patterns noted were [[patterns::phonologicalPatterns]]. Many of these patterns are still expected at this age; those that are not include [[patterns past the expected age]].` },
      { kind: "para", id: "intelligibility", text: "In conversation with an unfamiliar listener {{they}} was [[intelligibility::intelligibility]]. {{They}} [[was or was not]] able to say the target sounds correctly when given a model." },
    ],
    examples: ["Speech sound production was assessed with a single-word articulation test and in play. [STUDENT] produced errors on /k/, /g/ and consonant blends. Phonological patterns noted were fronting and cluster reduction. Fronting is no longer expected at his age. In conversation with an unfamiliar listener he was intelligible about half the time, and he was able to say /k/ correctly when given a model."],
    notesHint: "The sounds in error, the patterns, intelligibility, and whether the student could imitate the sounds.",
  };
  const elementary: PackSection = {
    id: "artic-g25", title: "Articulation and Phonology", when: { grades: ["g25"] },
    blocks: [
      { kind: "para", id: "intro", text: `${intro("with a single-word articulation test and a reading passage")}produced errors on [[sounds in error::articulationErrors]] in [[word positions::wordPositions]]. In connected speech {{they}} was [[intelligibility::intelligibility]].` },
      { kind: "para", id: "stimulability", text: "{{They}} was [[stimulable or not]] for the error sounds at the [[sound, syllable, word or sentence]] level. The errors [[do or do not]] draw attention from peers or affect {{their}} willingness to speak in class." },
    ],
    examples: ["Speech sound production was assessed with a single-word articulation test and a reading passage. [STUDENT] produced errors on /r/ and /s/ in all word positions. In connected speech she was mostly intelligible with known context. She was stimulable for /s/ at the word level but not yet for /r/. The errors do draw comments from peers, and she has started to answer with fewer words."],
    notesHint: "The sounds in error and where, intelligibility, stimulability, and any effect on classroom talk.",
  };
  const older: PackSection = {
    id: "artic-older", title: "Articulation and Phonology", when: { grades: ["g68", "g912"] },
    blocks: [
      { kind: "para", id: "intro", text: `${intro("in conversation and while reading aloud")}produced errors on [[sounds in error::articulationErrors]]. {{Their}} speech was [[intelligibility::intelligibility]], and {{they}} [[self-corrects, is aware of the errors, or is not]].` },
      { kind: "para", id: "impact", text: "{{They}} reports that [[how the student feels about speaking in class, presentations and with peers]]." },
    ],
    examples: ["Speech sound production was assessed in conversation and while reading aloud. [STUDENT] produced errors on /r/ in words and blends. His speech was fully intelligible, and he corrected a few errors himself when reading. He reports that he avoids reading aloud in class because classmates have mentioned the way he says certain words."],
    notesHint: "The remaining sound errors, intelligibility, self-awareness, and what the student says about it.",
  };
  return { id: "articulation", label: "Articulation and phonology", sections: [younger, elementary, older] };
}

function languageSample(): PackAssessment {
  return {
    id: "sample", label: "Language sample and classroom observation",
    sections: [
      {
        id: "sample", title: "Language Sample and Classroom Observation",
        blocks: [
          { kind: "para", id: "observation", text: "{{student}} was observed in [[setting]] during [[activity]]. During the observation {{they}} [[how the student took part, followed directions and talked with others]]." },
          { kind: "para", id: "sample", text: "A language sample of [[number]] utterances was collected during [[conversation, play or a picture description task]]. {{Their}} sentences averaged [[number]] words. {{They}} used [[grammar forms used correctly]] and had errors with [[grammar forms in error]]. Vocabulary was [[specific or general, with examples]]. When retelling [[a story or event]], {{they}} [[included or left out the main parts, in order or not]]." },
        ],
        examples: [
          "[STUDENT] was observed in his classroom during a small-group reading lesson. During the observation he raised his hand for every question but answered in one or two words, and he looked to a peer before following the teacher's directions. A language sample of 50 utterances was collected during conversation about a video game. His sentences averaged four words. He used plurals and past tense correctly and had errors with pronouns and conjunctions.",
          "A language sample of 75 utterances was collected during play with a farm set. [STUDENT] used sentences averaging six words. She used a range of verbs and adjectives and had errors with irregular past tense. When retelling a familiar story, she included the beginning and the ending but left out the problem in the middle.",
        ],
        notesHint: "Where you observed, what the student did, the size of the sample, sentence length, grammar, vocabulary and narrative skills.",
      },
    ],
  };
}

function fluencyVoice(): PackAssessment {
  return {
    id: "fluency", label: "Fluency and voice",
    sections: [
      {
        id: "fluency", title: "Fluency and Voice",
        blocks: [
          { kind: "para", id: "fluency", label: "Fluency", text: "{{student}}'s speech was [[fluent, or the types and frequency of disfluencies]] during conversation and reading. [[Secondary behaviors, avoidance, or none]]. {{They}} [[what the student says about talking]]." },
          { kind: "para", id: "voice", label: "Voice", text: "{{Their}} voice quality, pitch and loudness were [[typical for age, or what was unusual]]. [[Any history of vocal strain, hoarseness or breathiness]]." },
        ],
        examples: ["[STUDENT]'s speech was fluent during conversation and reading, with occasional whole-word repetitions that did not interrupt his message. No secondary behaviors were seen. His voice quality, pitch and loudness were typical for his age."],
        notesHint: "What you heard for fluency and voice, including any disfluencies, secondary behaviors or vocal concerns.",
      },
    ],
  };
}

function aroundSections(): PackSection[] {
  return [
    {
      id: "present-levels", title: "Present Levels of Performance", place: "before", when: { reportType: "annual" },
      blocks: [
        { kind: "para", id: "reported-by", label: "Speech-Language Pathology", text: "Reported by [[your name and credentials]]" },
        { kind: "subheading", id: "h-progress", text: "Progress on current goals" },
        { kind: "para", id: "progress", text: "[[Each current goal, the latest data, and whether it was met]]" },
        { kind: "subheading", id: "h-present", text: "Present levels" },
        { kind: "para", id: "present", text: "{{student}} currently receives [[minutes and frequency::minutes]] of speech-language services [[where::location]]. {{They}} now [[what the student can do in each area of need, with data]]." },
      ],
      examples: ["[STUDENT] currently receives 60 minutes weekly of speech-language services outside the classroom. He now produces /s/ and /z/ correctly in sentences with 85% accuracy in structured tasks and about 60% in conversation. He follows two-step directions in the classroom with one repetition."],
      notesHint: "The goals from the current IEP, the data on each, and what the student can do now.",
    },
    {
      id: "summary-concerns", title: "Summary", place: "after", when: { reportType: "evaluation", concerns: true },
      blocks: [
        { kind: "para", id: "summary", text: "Taken together, the checklist, testing and observation show that {{student}} has difficulty with [[areas of need::skillAreas]]. [[The main findings in a few lines]]. These difficulties affect {{their}} [[what is affected at school: following lessons, taking part in discussion, being understood]]." },
        { kind: "para", id: "strengths", text: "Strengths include [[what the student does well]]." },
      ],
      examples: ["Taken together, the checklist, testing and observation show that [STUDENT] has difficulty with expressive language and articulation. His receptive language is in the average range, while his expressive language score is in the low range and his speech is intelligible about half the time to unfamiliar listeners. These difficulties affect his ability to take part in class discussion and to be understood by peers. Strengths include his vocabulary and his willingness to try again when he is not understood."],
      notesHint: "The main findings and what they mean for the student at school.",
    },
    {
      id: "summary-none", title: "Summary", place: "after", when: { reportType: "evaluation", concerns: false },
      blocks: [
        { kind: "para", id: "summary", text: "The results of this evaluation show that {{student}}'s speech and language skills are within the expected range for {{their}} age and grade. [[The main findings in a few lines]]. Speech-language services are not recommended at this time. [[Suggestions for the classroom, if any]]." },
      ],
      examples: ["The results of this evaluation show that [STUDENT]'s speech and language skills are within the expected range for her age and grade. Her language scores were in the average range, her speech was fully intelligible, and the teacher rated every item on the checklist as typical for grade. Speech-language services are not recommended at this time."],
      notesHint: "The findings that show skills are within the expected range.",
    },
    {
      id: "next-steps", title: "Next Steps", place: "after", when: { concerns: true },
      blocks: [
        { kind: "para", id: "next-steps", text: "The results indicate that {{student}} meets the criteria for [[disability category::disability]] and needs specially designed instruction in [[areas of need::skillAreas]]. The IEP team will review this report and decide on eligibility, services and goals together." },
        { kind: "para", id: "closing", text: "Thank you for the opportunity to work with this student. Please contact the speech-language pathologist with any questions about this report." },
      ],
      examples: ["The results indicate that [STUDENT] meets the criteria for Speech or Language Impairment and needs specially designed instruction in expressive language and articulation. The IEP team will review this report and decide on eligibility, services and goals together."],
      notesHint: "The eligibility category and the areas of need.",
    },
    {
      id: "impact", title: "Impact of Disability Statement", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "impact", text: "{{student}}'s [[communication difficulties]] affect {{their}} ability to [[what is hard at school: understanding instruction, expressing ideas, being understood, working with peers]]. Without support, {{they}} [[what would happen in the general education setting]]." }],
      examples: ["[STUDENT]'s difficulty with expressive language and speech sounds affects his ability to answer questions in class, explain his thinking in writing, and be understood by classmates during group work. Without support, he would continue to give short answers and avoid speaking in front of the class."],
      notesHint: "How the communication difficulties affect learning and participation.",
    },
    {
      id: "service", title: "Service Delivery Statement", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "service", text: "{{student}} will receive [[minutes and frequency::minutes]] of speech-language services [[where::location]] to address [[areas of need::skillAreas]]. Services will include [[direct therapy, classroom support, or consultation with the teacher and family]]. Classroom accommodations will include [[accommodations::accommodations]]." }],
      examples: ["[STUDENT] will receive 60 minutes weekly of speech-language services both inside and outside the classroom to address articulation and expressive language. Services will include direct therapy in a small group and a monthly check-in with her teacher. Classroom accommodations will include extra wait time and sentence starters."],
      notesHint: "Minutes, frequency, location, areas, and how services will be delivered.",
    },
    {
      id: "goal", title: "Communication Goal", place: "after", when: { concerns: true },
      blocks: [
        { kind: "para", id: "goal", text: "By [[month::month]] [[year::year]], {{student}} will [[the skill, the condition, and the level of support]] with [[accuracy::percent]]% accuracy in [[data points::dataDates]] data collections, as measured by [[how progress is measured]]." },
        { kind: "subheading", id: "h-objectives", text: "Objectives" },
        { kind: "numbered", id: "objective1", text: "[[objective]]" },
        { kind: "numbered", id: "objective2", text: "[[objective]]" },
        { kind: "numbered", id: "objective3", text: "[[objective]]" },
      ],
      examples: ["By May of next school year, [STUDENT] will produce /r/ in all positions of words during a structured conversation with 80% accuracy in 3 out of 4 data collections, as measured by speech-language pathologist data. Objectives: he will produce /r/ in single words with 80% accuracy; he will produce /r/ in sentences with 80% accuracy; he will produce /r/ in a three-minute conversation with 80% accuracy."],
      notesHint: "The goal area, the target skill, the level of accuracy, and three steps toward it.",
    },
    {
      id: "ending", title: "Ending", place: "after", when: { reportType: "annual", concerns: false },
      blocks: [
        { kind: "para", id: "ending", text: "{{student}} has met {{their}} communication goals and no longer needs speech-language services to make progress in the general education curriculum. [[Any suggestions for the classroom going forward]]. With the team's agreement, speech-language services will end." },
        { kind: "para", id: "closing", text: "Thank you for the opportunity to work with this student. Please contact the speech-language pathologist with any questions about this report." },
      ],
      examples: ["[STUDENT] has met her communication goals and no longer needs speech-language services to make progress in the general education curriculum. Her teacher can continue to give her a moment to plan before answering in class. With the team's agreement, speech-language services will end."],
      notesHint: "Which goals were met and any suggestions for the classroom.",
    },
  ];
}

export function slpPack(): TemplatePack {
  const base = blankPack("Speech-language pathology");
  return {
    version: 1,
    titles: { evaluation: "Speech-Language Evaluation Report", annual: "Speech-Language Annual Review" },
    assessments: [checklist(), languageTest(), articulation(), languageSample(), fluencyVoice()],
    sections: aroundSections(),
    lists: {
      ...base.lists,
      completedBy: { options: ["classroom teacher", "general education teacher", "special education teacher", "parent", "parent and classroom teacher"] },
      skillAreas: { multi: true, options: ["receptive language", "expressive language", "articulation", "phonology", "fluency", "voice", "social communication", "vocabulary", "narrative skills", "following directions"] },
      languageAreas: { multi: true, options: ["receptive language", "expressive language", "vocabulary", "grammar and sentence structure", "following directions", "retelling and narrative", "social use of language", "phonological awareness"] },
      articulationErrors: { multi: true, options: ["/r/", "/s/", "/z/", "/l/", "/th/", "/sh/", "/ch/", "/k/", "/g/", "/f/", "/v/", "consonant blends", "final consonants", "multisyllabic words"] },
      phonologicalPatterns: { multi: true, options: ["final consonant deletion", "cluster reduction", "fronting", "stopping", "gliding", "weak syllable deletion", "vowelization", "none"] },
      wordPositions: { multi: true, options: ["the initial position", "the medial position", "the final position", "all word positions", "blends"] },
      intelligibility: { options: ["fully intelligible", "mostly intelligible with known context", "mostly intelligible without context", "intelligible about half the time", "rarely intelligible to unfamiliar listeners"] },
      scoreDescriptor: { options: ["Very Low", "Low", "Below Average", "Low Average", "Average", "High Average", "Above Average", "High", "Very High"] },
      concernAreas: { multi: true, options: ["understanding directions", "answering questions", "vocabulary", "sentence grammar", "speech sound errors", "intelligibility", "stuttering", "voice quality", "taking turns in conversation", "staying on topic"] },
      supports: { multi: true, options: ["visual supports", "repeated directions", "extra processing time", "a model before responding", "a communication board", "sentence starters", "pre-teaching of vocabulary"] },
      accommodations: { multi: true, options: ["extra wait time", "directions repeated or rephrased", "visual supports", "preferential seating", "a peer model", "sentence starters", "pre-teaching of vocabulary", "checks for understanding", "a quiet space for presentations"] },
    },
  };
}
