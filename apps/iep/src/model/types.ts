// Core data model. Arrays are ordered; position in the array is the order.
// There are deliberately no fields for any student or personal identifier.

export type Id = string;

export interface Section {
  id: Id;
  name: string;
}

export interface GradeBand {
  id: Id;
  label: string;
}

export interface VariableDef {
  /** Token name as written inside {{ }}; lower-case, letters/digits/underscore. */
  name: string;
  /** Friendly label shown in the builder. */
  label: string;
  presets: string[];
  allowFreeText: boolean;
}

export interface Sentence {
  id: Id;
  text: string;
  sectionId: Id | null;
  /** Empty array = applies to all grade bands. */
  gradeBandIds: Id[];
  tags: string[];
  notes: string;
}

export interface Task {
  id: Id;
  name: string;
  sentences: Sentence[];
}

export interface Domain {
  id: Id;
  name: string;
  tasks: Task[];
}

export interface Library {
  version: 1;
  sections: Section[];
  gradeBands: GradeBand[];
  variables: VariableDef[];
  domains: Domain[];
  /** Words that the privacy check always warns about (e.g. school names). */
  neverAllow: string[];
  /** Optional override of the AI hand-off prompt wording (Phase 4). */
  aiPromptTemplate?: string;
}

export type PronounSet = "he" | "she";

export interface Recipe {
  id: Id;
  name: string;
  pronounSet: PronounSet;
  gradeBandId: Id | null;
  domainIds: Id[];
  taskIds: Id[];
  sentenceIds: Id[];
}

export interface Backup {
  /** Which discipline's sentence bank this is (missing in older backups). */
  discipline?: import("./disciplines").DisciplineId;
  app: "easyiep";
  version: 1;
  exportedAt: string;
  library: Library;
  recipes: Recipe[];
  /** The writer's report-template edits (see report/overrides.ts); missing in older backups. */
  template?: unknown;
  /** The discipline's own report template pack (see report/pack.ts); OT has none. */
  pack?: unknown;
}

/** A sentence together with where it lives in the tree. */
export interface SentenceRef {
  sentence: Sentence;
  domain: Domain;
  task: Task;
}
