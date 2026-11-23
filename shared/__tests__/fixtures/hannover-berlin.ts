/** Schedule and saved scores of a played 7-player, 1-court, 16-point tournament. */
export const hannoverBerlinPlayers = ['Sergio', 'Emilio', 'Alejandro', 'Gartenflus', 'Filipino', 'Marek', 'Antonio'];

export const hannoverBerlinSchedule = [
  { round: 1, matches: [{ court: 1, round: 1, gameNumber: 1, status: 'pending', team1: ['Emilio', 'Gartenflus'], team2: ['Alejandro', 'Sergio'] }] },
  { round: 2, matches: [{ court: 1, round: 2, gameNumber: 2, status: 'pending', team1: ['Filipino', 'Antonio'], team2: ['Emilio', 'Marek'] }] },
  { round: 3, matches: [{ court: 1, round: 3, gameNumber: 3, status: 'pending', team1: ['Marek', 'Filipino'], team2: ['Alejandro', 'Gartenflus'] }] },
  { round: 4, matches: [{ court: 1, round: 4, gameNumber: 4, status: 'pending', team1: ['Gartenflus', 'Filipino'], team2: ['Sergio', 'Antonio'] }] },
  { round: 5, matches: [{ court: 1, round: 5, gameNumber: 5, status: 'pending', team1: ['Antonio', 'Marek'], team2: ['Sergio', 'Emilio'] }] },
  { round: 6, matches: [{ court: 1, round: 6, gameNumber: 6, status: 'pending', team1: ['Alejandro', 'Antonio'], team2: ['Sergio', 'Marek'] }] },
  { round: 7, matches: [{ court: 1, round: 7, gameNumber: 7, status: 'pending', team1: ['Alejandro', 'Emilio'], team2: ['Filipino', 'Gartenflus'] }] },
];

export const hannoverBerlinScores = [
  { gameNumber: 1, team1Score: 5, team2Score: 11 },
  { gameNumber: 2, team1Score: 7, team2Score: 9 },
  { gameNumber: 3, team1Score: 4, team2Score: 12 },
  { gameNumber: 4, team1Score: 12, team2Score: 4 },
  { gameNumber: 5, team1Score: 7, team2Score: 9 },
  { gameNumber: 6, team1Score: 7, team2Score: 9 },
  { gameNumber: 7, team1Score: 7, team2Score: 9 },
];
