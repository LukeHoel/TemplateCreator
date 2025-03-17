import { Injectable } from '@angular/core';
import { Mesocycle } from '../models/mesocycle';
import * as XLSX from 'xlsx-js-style';
import { Microcycle } from '../models/microcycle';

@Injectable({
  providedIn: 'root'
})
export class SpreadsheetGenerationService {

  constructor() { }

  generateAndDownloadSpreadsheet(mesocycle: Mesocycle): void {
    // Create workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    let previousSheetName: string | undefined = undefined;
    // Create a worksheet for each microcycle
    mesocycle.microcycles.forEach((microcycle, index) => {
      // Convert microcycle data to worksheet format
      const wsData = this.convertMicrocycleToWorksheetData(microcycle);
      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
      if (!ws['!types']) ws['!types'] = [];
      
      // Loop through each cell on the grid
      Object.keys(ws)
        .filter((key) => !key.startsWith('!'))
        .forEach((key) => {
          const cell = ws[key];
          cell.t = 's';
          const colIndex = XLSX.utils.decode_cell(key).c;
          const rowIndex = XLSX.utils.decode_cell(key).r;
          
          // Skip header cells
          if (rowIndex > 1) {
            const dayIndex = Math.floor(colIndex / 4);
            const exerciseIndex = rowIndex - 2;
            const day = microcycle.days[dayIndex];
            const exercises: any[] = [];
            day.exercises.forEach(exercise => {
              for (let setIndex = 0; setIndex < exercise.setCount; setIndex++) {
                exercises.push(exercise);
              }
            });
            const exercise = exercises[exerciseIndex];
            if (exercise) {
              const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
              let prevSheetRepsCell = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });

              switch (colIndex % 4) {
                case 0:
                  if (previousSheetName) {
                    // Exercise name
                    const prevSheetCell = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
                    const formula = `IF('${previousSheetName}'!${prevSheetCell}="","",'${previousSheetName}'!${prevSheetCell})`;
                    ws[cellRef] = { t: 'n', f: formula };
                  }
                  break;
                case 1:
                  // Weight
                  if (previousSheetName) {
                    const prevSheetCell = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
                    let formula;
                    switch(exercise.progression.type) {
                    case 'Add Weight':
                        const add = exercise.progression.type === 'Add Weight' ? `+ ${exercise.progression.amount}` : ' ';
                        formula = `IF('${previousSheetName}'!${prevSheetCell}="","",'${previousSheetName}'!${prevSheetCell}${add})`;
                        break;
                      case 'Add Percentage':
                        // Increase previous reps by specified percentage
                        const percentageMultiplier = 1 + (exercise.progression.amount / 100);
                        formula = `IF('${previousSheetName}'!${prevSheetCell}="","",ROUND('${previousSheetName}'!${prevSheetCell}*${percentageMultiplier},0))`;
                        break;
                      default:
                        formula = `IF('${previousSheetName}'!${prevSheetCell}="","",'${previousSheetName}'!${prevSheetCell})`;
                        break;
                   }
                    
                    ws[cellRef] = { t: 'n', f: formula };
                  }
                  break;
                case 2:
                  break;
                case 3:
                  // Target Reps
                  if (previousSheetName) {
                    const prevSheetCell = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex - 1 });
                    let formula;

                    switch(exercise.progression.type) {
                      case 'Add Reps':
                        // Increase previous reps by specified amount
                        formula = `IF('${previousSheetName}'!${prevSheetCell}="","",'${previousSheetName}'!${prevSheetCell}+${exercise.progression.amount})`;
                        break;
                      case 'Add Percentage':
                      case 'Add Weight':
                      case 'None':
                      default:
                        // Keep same reps
                        formula = `IF('${previousSheetName}'!${prevSheetCell}="","",'${previousSheetName}'!${prevSheetCell})`;
                        break;
                    }

                    ws[cellRef] = { t: 'n', f: formula };
                  }
                  break;
              }

              // Add cell styling if exercise has a color - moved after switch statement
              if (exercise?.color) {
                if (!ws['!cols']) ws['!cols'] = [];
                if (!ws['!rows']) ws['!rows'] = [];
                
                // Set the cell fill color
                if (!ws[cellRef].s) ws[cellRef].s = {};
                const color = { rgb: '000000', style: 'thin' };
                ws[cellRef].s = {
                  ...ws[cellRef].s,
                  fill: {
                    fgColor: { rgb: exercise.color.replace('#', '') },
                  },
                  border: { top: color, bottom: color, left: color, right: color },
                };
              }
            }
          }
      });

      // Add the worksheet to the workbook
      previousSheetName = `Week ${index + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, previousSheetName);
    });

    // Generate the Excel file
    XLSX.writeFile(wb, `${mesocycle.name}.xlsx`);
  }

  private convertMicrocycleToWorksheetData(microcycle: Microcycle): any[][] {
    const rows: any[][] = [];
    const headerRow: any[] = [];

    // Find the maximum number of exercises across all days
    const maxExercises = Math.max(...microcycle.days.map(day => day.exercises.length));
    
    // For each exercise position
    for (let exerciseIndex = 0; exerciseIndex < maxExercises; exerciseIndex++) {
      // For each day
      microcycle.days.forEach(day => {
        const exercise = day.exercises[exerciseIndex];
        if (exercise) {
          // Add rows based on setCount
          for (let setIndex = 0; setIndex < exercise.setCount; setIndex++) {
            const row: any[] = [];
            // Add empty cells for other days up to current day
            for (let dayIndex = 0; dayIndex < microcycle.days.indexOf(day); dayIndex++) {
              row.push('', '', '', '');
            }
            // Add exercise data - only include name in first set
            row.push(setIndex === 0 ? exercise.name : ' ', '', '', '');
            // Add empty cells for remaining days
            for (let dayIndex = microcycle.days.indexOf(day) + 1; dayIndex < microcycle.days.length; dayIndex++) {
              row.push('', '', '', '');
            }
            rows.push(row);
          }
        } else {
          // If no exercise for this day, add empty row
          const row: any[] = [];
          microcycle.days.forEach(() => row.push('', '', '', ''));
          rows.push(row);
        }
      });
    }

    // Reorganize rows to align exercises for each day
    const reorganizedRows: any[][] = [];
    const daysCount = microcycle.days.length;
    const columnsPerDay = 4;
    
    // For each day
    for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
      // Get all rows for this day (every 4th column starting at dayIndex * 4)
      const dayRows = rows.slice(0).map(row => {
        const dayData = row.slice(dayIndex * columnsPerDay, (dayIndex + 1) * columnsPerDay);
        return dayData;
      });
      
      // Remove empty rows
      const nonEmptyRows = dayRows.filter(row => row.some(cell => cell !== ''));
      
      // Add non-empty rows to the reorganized rows
      nonEmptyRows.forEach(row => {
        // If we need more rows in reorganizedRows, add them
        while (reorganizedRows.length <= nonEmptyRows.indexOf(row) + 1) {
          reorganizedRows.push(new Array(daysCount * columnsPerDay).fill(''));
        }
        
        // Add the row data at the correct position
        for (let colIndex = 0; colIndex < columnsPerDay; colIndex++) {
          reorganizedRows[nonEmptyRows.indexOf(row)][dayIndex * columnsPerDay + colIndex] = row[colIndex];
        }
      });
    }

    const firstRow: any[] = [];
    const secondRow: any[] = [];
    microcycle.days.forEach((day) => firstRow.push(day.name, '', '', ''));
    microcycle.days.forEach((day) => secondRow.push('Exercise', 'Weight', 'Reps', 'Target Reps'));

    return [firstRow, secondRow, ...reorganizedRows];
  }
}