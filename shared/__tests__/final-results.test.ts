import { describe, expect, it } from 'vitest';
import { calculateFinalResults, completionBlocker, scheduleWithScores } from '../final-results';
import { hannoverBerlinSchedule, hannoverBerlinScores } from './fixtures/hannover-berlin';

const tournament = { schedule: hannoverBerlinSchedule, finalScores: hannoverBerlinScores };

describe('completionBlocker', () => {
  it('allows completing a fully scored tournament', () => {
    expect(completionBlocker(tournament)).toBeNull();
  });

  it('blocks a tournament with missing scores or no schedule', () => {
    expect(completionBlocker({ ...tournament, finalScores: hannoverBerlinScores.slice(0, 6) }))
      .toBe('Only 6 of 7 games have a saved score.');
    expect(completionBlocker({ schedule: [], finalScores: [] })).toBe('The tournament has no schedule yet.');
  });
});

describe('calculateFinalResults', () => {
  it('ranks players by points from the saved scores', () => {
    const results = calculateFinalResults(tournament);

    expect(results.map(({ player, totalPoints }) => [player, totalPoints])).toEqual([
      ['Gartenflus', 38],
      ['Alejandro', 37],
      ['Sergio', 33],
      ['Filipino', 32],
      ['Emilio', 30],
      ['Marek', 29],
      ['Antonio', 25],
    ]);
    results.forEach((stats) => expect(stats.matchesPlayed).toBe(4));
    expect(results.find((stats) => stats.player === 'Sergio')).toMatchObject({
      matchesWon: 3,
      pointsFor: 33,
      pointsAgainst: 31,
      winPercentage: 75,
    });
  });

  it('lists players without a scored game at zero', () => {
    const results = calculateFinalResults({ ...tournament, finalScores: [] });
    expect(results).toHaveLength(7);
    results.forEach((stats) => expect(stats).toMatchObject({ matchesPlayed: 0, totalPoints: 0 }));
  });
});

describe('scheduleWithScores', () => {
  it('attaches each saved score to its match without changing the input', () => {
    const rounds = scheduleWithScores(tournament);

    expect(rounds[0].matches[0]).toMatchObject({ gameNumber: 1, status: 'completed', score: { team1Score: 5, team2Score: 11 } });
    expect(hannoverBerlinSchedule[0].matches[0]).not.toHaveProperty('score');
  });
});
