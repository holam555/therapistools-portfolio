// Sample workspace offered on first launch so every screen is demonstrable.

import type { TimeBlock, Workspace } from '../domain/types';
import { DEFAULT_GROUPING, DEFAULT_SETTINGS } from '../domain/types';

const b = (day: number, start: number, end: number): TimeBlock => ({
  day: day as TimeBlock['day'],
  start,
  end,
});

const allDays = (start: number, end: number): TimeBlock[] =>
  [0, 1, 2, 3, 4].map((d) => b(d, start, end));

export function seedWorkspace(): Workspace {
  return {
    schemaVersion: 4,
    settings: { ...DEFAULT_SETTINGS },
    grouping: { ...DEFAULT_GROUPING, preferGroups: [], cannotPairs: [] },
    providers: [
      {
        id: 'prov-ot',
        name: 'OT',
        isMe: true,
        discipline: 'Occupational Therapy',
        color: '#c75b39',
        availability: [
          { ...b(1, 450, 930), weeks: 'both' },
          { ...b(4, 450, 930), weeks: 'both' },
        ],
      },
      {
        id: 'prov-slp',
        name: 'Speech',
        discipline: 'Speech-Language',
        color: '#3d7a6e',
        availability: [
          { ...b(0, 450, 930), weeks: 'both' },
          { ...b(2, 450, 930), weeks: 'A' },
          { ...b(3, 450, 930), weeks: 'B' },
        ],
      },
    ],
    grades: [
      {
        id: 'grade-1',
        name: 'Grade 1',
        level: 1,
        templatePolarity: 'blocked',
        templateBlocks: [
          ...allDays(600, 630).map((b) => ({ ...b, label: 'Recess' })),
          ...allDays(690, 735).map((b) => ({ ...b, label: 'Lunch' })),
          ...allDays(510, 570).map((b) => ({ ...b, label: 'Literacy' })),
        ],
      },
      {
        id: 'grade-2',
        name: 'Grade 2',
        level: 2,
        templatePolarity: 'blocked',
        templateBlocks: [
          ...allDays(615, 645).map((b) => ({ ...b, label: 'Recess' })),
          ...allDays(735, 780).map((b) => ({ ...b, label: 'Lunch' })),
        ],
      },
      {
        id: 'grade-3',
        name: 'Grade 3',
        level: 3,
        templatePolarity: 'available',
        templateBlocks: [
          ...allDays(570, 690), // available 9:30-11:30
          ...allDays(780, 900), // available 1:00-3:00
        ],
      },
    ],
    students: [
      {
        id: 'stu-1',
        displayId: '1',
        gradeId: 'grade-1',
        serviceGoals: [{ providerId: 'prov-ot', type: 'direct', minutes: 90, period: 'monthly' }],
        overrides: [],
      },
      {
        id: 'stu-2',
        displayId: '2',
        gradeId: 'grade-1',
        serviceGoals: [
          { providerId: 'prov-ot', type: 'direct', minutes: 60, period: 'monthly' },
          { providerId: 'prov-slp', type: 'direct', minutes: 120, period: 'monthly' },
        ],
        overrides: [
          { id: 'ovr-1', kind: 'block', block: b(2, 810, 870), label: 'reading group' },
        ],
      },
      {
        id: 'stu-3',
        displayId: '3',
        gradeId: 'grade-2',
        serviceGoals: [{ providerId: 'prov-ot', type: 'direct', minutes: 120, period: 'monthly' }],
        overrides: [],
      },
      {
        id: 'stu-4',
        displayId: '4',
        gradeId: 'grade-2',
        serviceGoals: [{ providerId: 'prov-slp', type: 'direct', minutes: 90, period: 'monthly' }],
        overrides: [],
      },
      {
        id: 'stu-5',
        displayId: '5',
        gradeId: 'grade-3',
        serviceGoals: [{ providerId: 'prov-ot', type: 'direct', minutes: 60, period: 'weekly' }],
        overrides: [],
      },
      {
        id: 'stu-6',
        displayId: '6',
        gradeId: 'grade-3',
        serviceGoals: [{ providerId: 'prov-slp', type: 'direct', minutes: 45, period: 'monthly' }],
        overrides: [],
      },
    ],
    sessions: [
      {
        id: 'sess-1',
        providerId: 'prov-slp',
        studentIds: ['stu-2', 'stu-4'],
        day: 0,
        start: 780,
        durationMin: 30,
        recurrence: 'weekly',
        note: 'articulation group',
      },
    ],
    iepCases: [],
    sessionLogs: [],
  };
}
