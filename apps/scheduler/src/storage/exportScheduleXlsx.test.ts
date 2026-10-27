import { describe, expect, it } from 'vitest';
import { buildPlanWorkbook } from './exportScheduleXlsx';
import type { Workspace } from '../domain/types';
import { emptyWorkspace } from '../domain/types';

function fixture(): Workspace {
  const ws = emptyWorkspace();
  ws.providers.push({
    id: 'ot',
    name: 'OT',
    color: '#c75b39',
    availability: [{ day: 0, start: 450, end: 930, weeks: 'both' }],
  });
  ws.grades.push({ id: 'g', name: 'G', templatePolarity: 'blocked', templateBlocks: [] });
  ws.students.push({ id: 'stu-5', displayId: '5', gradeId: 'g', serviceGoals: [], overrides: [] });
  return ws;
}

describe('buildPlanWorkbook', () => {
  it('week A/B alternates keep their different time ranges in the cell', async () => {
    const ws = fixture();
    const wb = await buildPlanWorkbook({
      provider: ws.providers[0],
      ws,
      proposals: [
        { day: 0, start: 495, durationMin: 25, studentIds: ['stu-5'], recurrence: 'biweekly', weekParity: 'A' },
        { day: 0, start: 495, durationMin: 20, studentIds: ['stu-5'], recurrence: 'biweekly', weekParity: 'B' },
      ],
    });
    const sheet = wb.worksheets[0];
    // 8:15 row: startMin 450 → rowFor(495) = 2 + (495-450)/5 = 11, Monday col 2
    const cell = sheet.getCell(11, 2);
    expect(cell.value).toBe('8:15-8:40 St 5 (wk A)\n8:15-8:35 St 5 (wk B)');
  });

  it('booked weekly sessions show a single timed line', async () => {
    const ws = fixture();
    ws.sessions.push({
      id: 's1', providerId: 'ot', studentIds: ['stu-5'], day: 0, start: 600, durationMin: 30, recurrence: 'weekly',
    });
    const wb = await buildPlanWorkbook({ provider: ws.providers[0], ws });
    const cell = wb.worksheets[0].getCell(2 + (600 - 450) / 5, 2);
    expect(cell.value).toBe('10:00-10:30 St 5');
  });
});
