import { jsPDF } from "jspdf";
import type { Round } from "@shared/schema";

export interface PDFConfig {
  tournamentName: string;
  tournamentDate: string;
  tournamentLocation: string;
  playersCount: number;
  courtsCount: number;
  rounds: Round[];
}

export function generateTournamentPDF({ tournamentName, tournamentDate, tournamentLocation, playersCount, courtsCount, rounds }: PDFConfig): jsPDF {
  // Generate both schedule and scorecard pages
  const pdf = generateSchedulePDF({ tournamentName, tournamentDate, tournamentLocation, playersCount, courtsCount, rounds });
  generateScorecardPDF(pdf, { tournamentName, tournamentDate, tournamentLocation, playersCount, courtsCount, rounds });
  return pdf;
}

function generateSchedulePDF({ tournamentName, tournamentDate, tournamentLocation, playersCount, courtsCount, rounds }: PDFConfig): jsPDF {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  let yPosition = margin;

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(tournamentName, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Americano Format Tournament Schedule', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  pdf.setFontSize(10);
  pdf.text(`${playersCount} Players • ${courtsCount} Courts`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });

  // Draw header underline
  yPosition += 8;
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Create table structure
  yPosition += 10;
  
  // Table headers
  const tableStartY = yPosition;
  const colWidths = [20, 25, 65, 65]; // Round, Court, Team 1 vs Team 2, Score
  const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const tableStartX = (pageWidth - totalTableWidth) / 2;
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(240, 240, 240);
  pdf.setDrawColor(0, 0, 0);
  
  let currentX = tableStartX;
  const headerHeight = 8;
  
  // Draw header
  pdf.rect(currentX, yPosition, colWidths[0], headerHeight, 'FD');
  pdf.text('Round', currentX + colWidths[0]/2, yPosition + 5.5, { align: 'center' });
  currentX += colWidths[0];
  
  pdf.rect(currentX, yPosition, colWidths[1], headerHeight, 'FD');
  pdf.text('Court', currentX + colWidths[1]/2, yPosition + 5.5, { align: 'center' });
  currentX += colWidths[1];
  
  pdf.rect(currentX, yPosition, colWidths[2], headerHeight, 'FD');
  pdf.text('Match', currentX + colWidths[2]/2, yPosition + 5.5, { align: 'center' });
  currentX += colWidths[2];
  
  pdf.rect(currentX, yPosition, colWidths[3], headerHeight, 'FD');
  pdf.text('Score', currentX + colWidths[3]/2, yPosition + 5.5, { align: 'center' });
  
  yPosition += headerHeight;
  
  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  rounds.forEach((round) => {
    round.matches.forEach((match, matchIndex) => {
      // Check if we need a new page
      if (yPosition + 12 > pageHeight - margin - 20) {
        pdf.addPage();
        yPosition = margin + 20;
      }
      
      const rowHeight = 12;
      currentX = tableStartX;
      
      // Round number (only show for first match of round)
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(currentX, yPosition, colWidths[0], rowHeight, 'S');
      if (matchIndex === 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${round.round}`, currentX + colWidths[0]/2, yPosition + 7.5, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
      }
      currentX += colWidths[0];
      
      // Court
      pdf.rect(currentX, yPosition, colWidths[1], rowHeight, 'S');
      pdf.text(`${match.court}`, currentX + colWidths[1]/2, yPosition + 7.5, { align: 'center' });
      currentX += colWidths[1];
      
      // Match details
      pdf.rect(currentX, yPosition, colWidths[2], rowHeight, 'S');
      const team1Text = `${match.team1[0]} & ${match.team1[1]}`;
      const team2Text = `${match.team2[0]} & ${match.team2[1]}`;
      const matchText = `${team1Text} vs ${team2Text}`;
      
      // Truncate if too long
      const maxMatchLength = 35;
      const displayText = matchText.length > maxMatchLength ? 
        matchText.substring(0, maxMatchLength - 3) + '...' : matchText;
      
      pdf.text(displayText, currentX + 2, yPosition + 7.5);
      currentX += colWidths[2];
      
      // Score column (empty for filling in)
      pdf.rect(currentX, yPosition, colWidths[3], rowHeight, 'S');
      pdf.text('___ - ___', currentX + colWidths[3]/2, yPosition + 7.5, { align: 'center' });
      
      yPosition += rowHeight;
    });
    
    // Add small gap between rounds
    yPosition += 3;
  });



  return pdf;
}

function generateScorecardPDF(pdf: jsPDF, { tournamentName, playersCount, courtsCount, rounds }: PDFConfig): void {
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
  yPosition += 15;

  // Extract all unique players
  const allPlayers = new Set<string>();
  rounds.forEach(round => {
    round.matches.forEach(match => {
      match.team1.forEach(player => allPlayers.add(player));
      match.team2.forEach(player => allPlayers.add(player));
    });
  });
  const players = Array.from(allPlayers).sort();

  // Create scorecard table
  const totalRounds = rounds.length;
  const colWidths = [40, ...Array(totalRounds).fill(15), 20]; // Player name, rounds, total
  const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const tableStartX = (pageWidth - totalTableWidth) / 2;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(240, 240, 240);
  pdf.setDrawColor(0, 0, 0);
  
  let currentX = tableStartX;
  const headerHeight = 8;
  
  // Draw headers
  pdf.rect(currentX, yPosition, colWidths[0], headerHeight, 'FD');
  pdf.text('Player', currentX + colWidths[0]/2, yPosition + 5.5, { align: 'center' });
  currentX += colWidths[0];
  
  // Round headers
  for (let i = 1; i <= totalRounds; i++) {
    pdf.rect(currentX, yPosition, colWidths[i], headerHeight, 'FD');
    pdf.text(`R${i}`, currentX + colWidths[i]/2, yPosition + 5.5, { align: 'center' });
    currentX += colWidths[i];
  }
  
  // Total header
  pdf.rect(currentX, yPosition, colWidths[colWidths.length - 1], headerHeight, 'FD');
  pdf.text('Total', currentX + colWidths[colWidths.length - 1]/2, yPosition + 5.5, { align: 'center' });
  
  yPosition += headerHeight;
  
  // Player rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
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
    
    // Round scores (empty for manual entry)
    for (let i = 1; i <= totalRounds; i++) {
      pdf.rect(currentX, yPosition, colWidths[i], rowHeight, 'S');
      pdf.text('___', currentX + colWidths[i]/2, yPosition + 7.5, { align: 'center' });
      currentX += colWidths[i];
    }
    
    // Total column
    pdf.rect(currentX, yPosition, colWidths[colWidths.length - 1], rowHeight, 'S');
    pdf.text('___', currentX + colWidths[colWidths.length - 1]/2, yPosition + 7.5, { align: 'center' });
    
    yPosition += rowHeight;
  });

}

export function generatePDFPreviewHTML({ tournamentName, playersCount, courtsCount, rounds }: PDFConfig): string {
  const totalGames = rounds.reduce((sum, round) => sum + round.matches.length, 0);
  // Calculate average game length: 1.5 hours total / 7 rounds = ~13 minutes per game
  const totalMinutes = 90; // 1.5 hours
  const avgGameMinutes = Math.round(totalMinutes / rounds.length);

  // Extract all unique players for scorecard
  const allPlayers = new Set<string>();
  rounds.forEach(round => {
    round.matches.forEach(match => {
      match.team1.forEach(player => allPlayers.add(player));
      match.team2.forEach(player => allPlayers.add(player));
    });
  });
  const players = Array.from(allPlayers).sort();

  return `
    <div style="font-family: 'Inter', sans-serif; background: white; color: black; line-height: 1.5;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #000;">
        <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #000;">${tournamentName}</h1>
        <p style="font-size: 14px; color: #666; margin: 5px 0;">Americano Format Tournament Schedule</p>
        <p style="font-size: 12px; color: #666; margin: 5px 0;">${playersCount} Players • ${courtsCount} Courts</p>
        <p style="font-size: 10px; color: #666; margin: 5px 0;">Generated on ${new Date().toLocaleDateString()}</p>
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
          ${rounds.map(round => 
            round.matches.map((match, matchIndex) => {
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
            }).join('')
          ).join('')}
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
            ${rounds.map((_, index) => `<th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">R${index + 1}</th>`).join('')}
            <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${players.map((player: string) => `
            <tr>
              <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #fafafa;">${player}</td>
              ${rounds.map(() => '<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">___</td>').join('')}
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
