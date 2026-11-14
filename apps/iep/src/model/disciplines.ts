/**
 * Who is writing. Each discipline keeps its own sentence bank, recipes and
 * draft. Only occupational therapy ships with a starter library for now;
 * every other discipline starts empty and builds its own bank (Import helps).
 */
export type DisciplineId = "ot" | "slp" | "pt" | "psych" | "sped" | "other";

export interface Discipline {
  id: DisciplineId;
  /** Full name, e.g. "Speech-language pathology". */
  label: string;
  /** Short name for the header switcher. */
  short: string;
  /** The writer's role, used in the AI prompt: "a school-based <role>". */
  role: string;
  /** Whether a ready-made starter library exists. */
  hasStarter: boolean;
}

export const DISCIPLINES: readonly Discipline[] = [
  { id: "ot", label: "Occupational therapy", short: "OT", role: "occupational therapist", hasStarter: true },
  { id: "slp", label: "Speech-language pathology", short: "SLP", role: "speech-language pathologist", hasStarter: false },
  { id: "pt", label: "Physical therapy", short: "PT", role: "physical therapist", hasStarter: false },
  { id: "psych", label: "School psychology", short: "Psychology", role: "psychologist", hasStarter: false },
  { id: "sped", label: "Special education teaching", short: "Special ed", role: "special education teacher", hasStarter: false },
  { id: "other", label: "Other K-12 educator", short: "Other", role: "K-12 educator", hasStarter: false },
];

export function isDisciplineId(v: unknown): v is DisciplineId {
  return DISCIPLINES.some((d) => d.id === v);
}

export function getDiscipline(id: DisciplineId): Discipline {
  return DISCIPLINES.find((d) => d.id === id) ?? DISCIPLINES[0];
}
