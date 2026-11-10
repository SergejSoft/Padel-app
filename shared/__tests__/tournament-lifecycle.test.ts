import { describe, it, expect } from 'vitest';
import {
  daysUntil,
  describeCountdown,
  getTournamentPhase,
  groupTournaments,
  isBeforeToday,
  localDateString,
  parseCalendarDate,
} from '../tournament-lifecycle';

const TODAY = '2026-11-10';

function tournament(id: number, date: string | null, status = 'active') {
  return { id, date, status };
}

describe('localDateString', () => {
  it('formats the local calendar day, not the UTC one', () => {
    expect(localDateString(new Date(2026, 10, 10, 0, 30))).toBe('2026-11-10');
    expect(localDateString(new Date(2026, 10, 10, 23, 59))).toBe('2026-11-10');
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseCalendarDate', () => {
  it('returns local midnight of the stored day', () => {
    const parsed = parseCalendarDate('2026-11-10');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(10);
    expect(parsed.getDate()).toBe(10);
    expect(parsed.getHours()).toBe(0);
  });
});

describe('isBeforeToday', () => {
  it('treats today as not past', () => {
    expect(isBeforeToday(TODAY, TODAY)).toBe(false);
    expect(isBeforeToday('2026-11-09', TODAY)).toBe(true);
    expect(isBeforeToday('2026-11-11', TODAY)).toBe(false);
    expect(isBeforeToday(null, TODAY)).toBe(false);
  });

  it('accepts ISO timestamps by their calendar day', () => {
    expect(isBeforeToday('2026-11-10T00:00:00.000Z', TODAY)).toBe(false);
    expect(isBeforeToday('2026-11-09T23:00:00.000Z', TODAY)).toBe(true);
  });
});

describe('daysUntil', () => {
  it('counts whole calendar days', () => {
    expect(daysUntil(TODAY, TODAY)).toBe(0);
    expect(daysUntil('2026-11-11', TODAY)).toBe(1);
    expect(daysUntil('2026-11-15', TODAY)).toBe(5);
    expect(daysUntil('2026-11-08', TODAY)).toBe(-2);
  });

  it('is not thrown off by daylight saving changes', () => {
    expect(daysUntil('2026-04-01', '2026-03-01')).toBe(31);
    expect(daysUntil('2026-11-01', '2026-10-01')).toBe(31);
  });
});

describe('describeCountdown', () => {
  it('describes how far away a tournament is', () => {
    expect(describeCountdown(TODAY, TODAY)).toBe('Today');
    expect(describeCountdown('2026-11-11', TODAY)).toBe('Tomorrow');
    expect(describeCountdown('2026-11-15', TODAY)).toBe('In 5 days');
    expect(describeCountdown('2026-11-09', TODAY)).toBe('Yesterday');
    expect(describeCountdown('2026-11-07', TODAY)).toBe('3 days ago');
    expect(describeCountdown(null, TODAY)).toBe('Date to be confirmed');
  });
});

describe('getTournamentPhase', () => {
  it('never treats a tournament happening today as past', () => {
    expect(getTournamentPhase(tournament(1, TODAY), TODAY)).toBe('today');
  });

  it('classifies active tournaments by date', () => {
    expect(getTournamentPhase(tournament(1, '2026-11-09'), TODAY)).toBe('needs-results');
    expect(getTournamentPhase(tournament(1, '2026-12-01'), TODAY)).toBe('upcoming');
  });

  it('treats undated tournaments as upcoming', () => {
    expect(getTournamentPhase(tournament(1, null), TODAY)).toBe('upcoming');
  });

  it('lets the stored status win over the date', () => {
    expect(getTournamentPhase(tournament(1, '2025-01-01', 'completed'), TODAY)).toBe('completed');
    expect(getTournamentPhase(tournament(1, '2030-01-01', 'completed'), TODAY)).toBe('completed');
    expect(getTournamentPhase(tournament(1, '2030-01-01', 'cancelled'), TODAY)).toBe('cancelled');
    expect(getTournamentPhase(tournament(1, '2030-01-01', 'archived'), TODAY)).toBe('archived');
  });
});

describe('groupTournaments', () => {
  const list = [
    tournament(1, '2026-09-19', 'archived'),
    tournament(2, '2026-08-01', 'completed'),
    tournament(3, '2026-10-01', 'cancelled'),
    tournament(4, '2026-11-01'),
    tournament(5, '2026-10-15'),
    tournament(6, '2026-12-24'),
    tournament(7, TODAY),
    tournament(8, null),
    tournament(9, '2026-11-20'),
    tournament(10, '2026-10-20', 'archived'),
  ];

  it('places every tournament in exactly one group', () => {
    const groups = groupTournaments(list, TODAY);
    const ids = [
      ...groups.upcoming,
      ...groups.needsResults,
      ...groups.finished,
      ...groups.archived,
    ].map((t) => t.id);
    expect(ids.sort((a, b) => a - b)).toEqual(list.map((t) => t.id));
  });

  it('sorts upcoming soonest first with undated tournaments last', () => {
    const { upcoming } = groupTournaments(list, TODAY);
    expect(upcoming.map((t) => t.id)).toEqual([7, 9, 6, 8]);
  });

  it('sorts past groups newest first', () => {
    const groups = groupTournaments(list, TODAY);
    expect(groups.needsResults.map((t) => t.id)).toEqual([4, 5]);
    expect(groups.finished.map((t) => t.id)).toEqual([3, 2]);
    expect(groups.archived.map((t) => t.id)).toEqual([10, 1]);
  });

  it('breaks date ties by id', () => {
    const sameDay = [tournament(2, '2026-12-01'), tournament(1, '2026-12-01')];
    expect(groupTournaments(sameDay, TODAY).upcoming.map((t) => t.id)).toEqual([1, 2]);

    const pastSameDay = [tournament(1, '2026-10-01'), tournament(2, '2026-10-01')];
    expect(groupTournaments(pastSameDay, TODAY).needsResults.map((t) => t.id)).toEqual([2, 1]);
  });

  it('does not mutate the input', () => {
    const copy = list.map((t) => ({ ...t }));
    groupTournaments(list, TODAY);
    expect(list).toEqual(copy);
  });
});
