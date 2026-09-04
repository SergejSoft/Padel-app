import { jsPDF } from "jspdf";
import type { Round } from "@shared/schema";
import { getSchedulePlayers, getSittingOutPlayers } from "@shared/schedule-utils";

export interface PDFConfig {
  tournamentName: string;
  tournamentDate: string;
  tournamentTime?: string;
  tournamentLocation: string;
  playersCount: number;
  courtsCount: number;
  pointsPerMatch?: number;
  rounds: Round[];
  /** Full roster, including players who only rest in some rounds. */
  players?: string[];
}

/** Roster to print: the tournament's list when known, else derived from matches. */
function resolveRoster({ players, rounds }: PDFConfig): string[] {
  return players && players.length > 0 ? players : getSchedulePlayers(rounds);
}

/**
 * Black header cell with white centred label. jsPDF's text() writes the text
 * colour as the current fill colour, so the fill must be reset per cell or
 * every header after the first is drawn white-on-white.
 */
function drawHeaderCell(pdf: jsPDF, x: number, y: number, width: number, height: number, label: string): void {
  pdf.setFillColor(0, 0, 0);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(x, y, width, height, 'FD');
  pdf.setTextColor(255, 255, 255);
  pdf.text(label, x + width / 2, y + height / 2 + 1.3, { align: 'center' });
}

export function generateTournamentPDF(config: PDFConfig): jsPDF {
  // Generate both schedule and scorecard pages
  const pdf = generateSchedulePDF(config);
  generateScorecardPDF(pdf, config);
  return pdf;
}

function generateSchedulePDF(config: PDFConfig): jsPDF {
  const { tournamentName, tournamentDate, tournamentLocation, playersCount, courtsCount, pointsPerMatch, rounds } = config;
  const roster = resolveRoster(config);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  let yPosition = margin;

  // Compact Header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(tournamentName, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Americano Format Tournament Schedule', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  pdf.setFontSize(9);
  
  // Format and display the date
  const formattedDate = tournamentDate ? new Date(tournamentDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'Date TBD';
  
  pdf.text(`${formattedDate} • ${tournamentLocation || 'Location TBD'}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 4;
  pdf.text(
    `${playersCount} Players • ${courtsCount} Courts${pointsPerMatch ? ` • ${pointsPerMatch} Points/Match` : ''}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' },
  );

  // Draw header underline
  yPosition += 6;
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Create table structure
  yPosition += 5;
  
  // Table headers
  const tableStartY = yPosition;
  const colWidths = [15, 18, 85, 55]; // Round, Court, Team 1 vs Team 2, Score - adjusted widths
  const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const tableStartX = (pageWidth - totalTableWidth) / 2;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  
  let currentX = tableStartX;
  const headerHeight = 6;
  
  // Draw header
  ['Round', 'Court', 'Match', 'Score'].forEach((label, index) => {
    drawHeaderCell(pdf, currentX, yPosition, colWidths[index], headerHeight, label);
    currentX += colWidths[index];
  });
  
  yPosition += headerHeight;
  
  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0); // Reset to black text for table body
  
  const rowHeight = 7;
  const sitOutRowHeight = 5;
  const roundGap = 2;

  rounds.forEach((round) => {
    const sittingOut = getSittingOutPlayers(round, roster);
    const roundBlockHeight =
      round.matches.length * rowHeight + (sittingOut.length > 0 ? sitOutRowHeight : 0) + roundGap;

    // Keep each round together on one page
    if (yPosition + roundBlockHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    round.matches.forEach((match, matchIndex) => {
      currentX = tableStartX;
      
      // Round number (only show for first match of round)
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(currentX, yPosition, colWidths[0], rowHeight, 'S');
      if (matchIndex === 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${round.round}`, currentX + colWidths[0]/2, yPosition + 5, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
      }
      currentX += colWidths[0];
      
      // Court
      pdf.rect(currentX, yPosition, colWidths[1], rowHeight, 'S');
      pdf.text(`${match.court}`, currentX + colWidths[1]/2, yPosition + 5, { align: 'center' });
      currentX += colWidths[1];
      
      // Match details
      pdf.rect(currentX, yPosition, colWidths[2], rowHeight, 'S');
      const team1Text = `${match.team1[0]} & ${match.team1[1]}`;
      const team2Text = `${match.team2[0]} & ${match.team2[1]}`;
      const matchText = `${team1Text} vs ${team2Text}`;
      
      // Truncate if too long - increased length for wider column
      const maxMatchLength = 50;
      const displayText = matchText.length > maxMatchLength ? 
        matchText.substring(0, maxMatchLength - 3) + '...' : matchText;
      
      pdf.text(displayText, currentX + 2, yPosition + 5);
      currentX += colWidths[2];
      
      // Score column (empty for filling in)
      pdf.rect(currentX, yPosition, colWidths[3], rowHeight, 'S');
      pdf.text('___ - ___', currentX + colWidths[3]/2, yPosition + 5, { align: 'center' });
      
      yPosition += rowHeight;
    });

    // Who rests this round
    if (sittingOut.length > 0) {
      pdf.setFillColor(255, 251, 235);
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(tableStartX, yPosition, totalTableWidth, sitOutRowHeight, 'FD');
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(120, 83, 9);
      pdf.text(
        `Sitting out: ${sittingOut.join(', ')}`,
        tableStartX + colWidths[0] + colWidths[1] + 2,
        yPosition + 3.6,
      );
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      yPosition += sitOutRowHeight;
    }
    
    yPosition += roundGap;
  });



  return pdf;
}

function generateScorecardPDF(pdf: jsPDF, config: PDFConfig): void {
  const { tournamentName, tournamentDate, tournamentLocation, playersCount, courtsCount, pointsPerMatch, rounds } = config;
  const roster = resolveRoster(config);
  // Add new page for scorecard
  pdf.addPage();
  
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  let yPosition = margin;

  // Header
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(tournamentName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Player Scorecard', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  
  // Format and display the date
  const formattedDate = tournamentDate ? new Date(tournamentDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'Date TBD';
  
  pdf.setFontSize(10);
  pdf.text(`${formattedDate} • ${tournamentLocation || 'Location TBD'}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  if (pointsPerMatch) {
    pdf.text(`${pointsPerMatch} total points per match`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
  }
  
  pdf.text(`${playersCount} Players • ${courtsCount} Courts`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  const players = [...roster].sort();
  // Per-round set of resting players, so "rest" cells can be marked
  const restingByRound = rounds.map(round => new Set(getSittingOutPlayers(round, roster)));

  // Create scorecard table
  const totalRounds = rounds.length;
  const colWidths = [50, ...Array(totalRounds).fill(12), 18]; // Player name, rounds, total - wider names, narrower rounds
  const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const tableStartX = (pageWidth - totalTableWidth) / 2;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  
  let currentX = tableStartX;
  const headerHeight = 8;
  
  // Draw headers: Player, one column per round, Total
  const headerLabels = ['Player', ...Array.from({ length: totalRounds }, (_, i) => `${i + 1}`), 'Total'];
  headerLabels.forEach((label, index) => {
    drawHeaderCell(pdf, currentX, yPosition, colWidths[index], headerHeight, label);
    currentX += colWidths[index];
  });
  
  yPosition += headerHeight;
  
  // Player rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0); // Reset to black text for table body
  
  players.forEach(player => {
    // Check if we need a new page
    if (yPosition + 12 > pageHeight - margin - 20) {
      pdf.addPage();
      yPosition = margin + 20;
    }
    
    const rowHeight = 12;
    currentX = tableStartX;
    
    // Player name
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(250, 250, 250);
    pdf.rect(currentX, yPosition, colWidths[0], rowHeight, 'FD');
    pdf.setTextColor(0, 0, 0);
    pdf.text(player, currentX + 2, yPosition + 7.5);
    currentX += colWidths[0];
    
    // Round scores (empty for manual entry; greyed out when the player rests)
    for (let i = 1; i <= totalRounds; i++) {
      const rests = restingByRound[i - 1]?.has(player);
      if (rests) {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(currentX, yPosition, colWidths[i], rowHeight, 'FD');
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(7);
        pdf.text('rest', currentX + colWidths[i]/2, yPosition + 7.5, { align: 'center' });
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
      } else {
        pdf.rect(currentX, yPosition, colWidths[i], rowHeight, 'S');
        pdf.text('___', currentX + colWidths[i]/2, yPosition + 7.5, { align: 'center' });
      }
      currentX += colWidths[i];
    }
    
    // Total column
    pdf.rect(currentX, yPosition, colWidths[colWidths.length - 1], rowHeight, 'S');
    pdf.text('___', currentX + colWidths[colWidths.length - 1]/2, yPosition + 7.5, { align: 'center' });
    
    yPosition += rowHeight;
  });

}

export function generatePDFPreviewHTML(config: PDFConfig): string {
  const { tournamentName, tournamentDate, tournamentLocation, playersCount, courtsCount, pointsPerMatch, rounds } = config;
  const roster = resolveRoster(config);
  const players = [...roster].sort();
  const restingByRound = rounds.map(round => new Set(getSittingOutPlayers(round, roster)));

  return `
    <div style="font-family: 'Inter', sans-serif; background: white; color: black; line-height: 1.5;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #000;">
        <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #000;">${tournamentName}</h1>
        <p style="font-size: 14px; color: #666; margin: 5px 0;">Americano Format Tournament Schedule</p>
        <p style="font-size: 12px; color: #666; margin: 5px 0;">${tournamentDate ? new Date(tournamentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date TBD'} • ${tournamentLocation || 'Location TBD'}</p>
        <p style="font-size: 12px; color: #666; margin: 5px 0;">${playersCount} Players • ${courtsCount} Courts${pointsPerMatch ? ` • ${pointsPerMatch} Points/Match` : ''}</p>
      </div>

      <!-- Tournament Schedule Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Round</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Court</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Match</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Score</th>
          </tr>
        </thead>
        <tbody>
          ${rounds.map((round, roundIndex) => {
            const matchRows = round.matches.map((match, matchIndex) => {
              const team1Text = `${match.team1[0]} & ${match.team1[1]}`;
              const team2Text = `${match.team2[0]} & ${match.team2[1]}`;
              const matchText = `${team1Text} vs ${team2Text}`;
              
              return `
                <tr>
                  <td style="border: 1px solid #ccc; padding: 8px; text-align: center; font-weight: ${matchIndex === 0 ? 'bold' : 'normal'};">
                    ${matchIndex === 0 ? round.round : ''}
                  </td>
                  <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${match.court}</td>
                  <td style="border: 1px solid #ccc; padding: 8px;">${matchText}</td>
                  <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">___ - ___</td>
                </tr>
              `;
            }).join('');

            const sittingOut = Array.from(restingByRound[roundIndex] ?? []);
            const sitOutRow = sittingOut.length > 0 ? `
                <tr>
                  <td colspan="4" style="border: 1px solid #ccc; padding: 6px 8px; background-color: #fffbeb; color: #78530a; font-style: italic;">
                    Sitting out: ${sittingOut.join(', ')}
                  </td>
                </tr>
              ` : '';

            return matchRows + sitOutRow;
          }).join('')}
        </tbody>
      </table>



      <!-- Page Break Indicator -->
      <div style="margin: 40px 0; text-align: center; border-top: 2px dashed #ccc; padding-top: 20px;">
        <h2 style="font-size: 20px; font-weight: bold; color: #000;">Page 2 - Player Scorecard</h2>
      </div>

      <!-- Player Scorecard Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Player</th>
            ${rounds.map((_, index) => `<th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${index + 1}</th>`).join('')}
            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${players.map((player: string) => `
            <tr>
              <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #fafafa;">${player}</td>
              ${rounds.map((_, roundIndex) => restingByRound[roundIndex]?.has(player)
                ? '<td style="border: 1px solid #ccc; padding: 8px; text-align: center; background-color: #f0f0f0; color: #999; font-size: 10px;">rest</td>'
                : '<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">___</td>'
              ).join('')}
              <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">___</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Footer -->
      <div style="margin-top: 40px; text-align: center;">
        <p style="font-size: 8px; color: #999; margin: 0;">Generated by Padel Tournament Scheduler</p>
      </div>
    </div>
  `;
}
