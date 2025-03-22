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
            // variable to track if the exercise is the first row of the exercise for the day
            let isFirstRow = false;
            if (exercise) {
              // Check if this is the first row for this exercise in the current day by looking at the previous row
              const prevRowIndex = rowIndex - 1;
              const prevRowDayIndex = Math.floor(colIndex / 4);
              const prevRowExerciseIndex = prevRowIndex - 2;
              
              // If previous row is in a different day or has a different exercise, this is the first row
              isFirstRow = prevRowDayIndex !== dayIndex || 
                         !exercises[prevRowExerciseIndex] || 
                         exercises[prevRowExerciseIndex].name !== exercise.name;

              const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });

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
                  if (isFirstRow) {
                    if (previousSheetName) {
                      // Find the last row with the same exercise color in the previous sheet
                      let lastRowWithColor = 1;
                      const prevSheet = wb.Sheets[previousSheetName];
                      Object.keys(prevSheet)
                        .filter(key => !key.startsWith('!'))
                        .forEach(key => {
                          const cell = XLSX.utils.decode_cell(key);
                          if (cell.c === colIndex && cell.r > lastRowWithColor) {
                            const cellStyle = prevSheet[key]?.s;
                            if (cellStyle?.fill?.fgColor?.rgb === exercise.color.replace('#', '')) {
                              lastRowWithColor = cell.r;
                            }
                          }
                        });
                      const lastRowCell = XLSX.utils.encode_cell({ r: lastRowWithColor, c: colIndex });
                      
                      let formula;
                      switch(exercise.progression.type) {
                        case 'Add Weight':
                          const add = exercise.progression.type === 'Add Weight' ? `+ ${exercise.progression.amount}` : ' ';
                          formula = `IF('${previousSheetName}'!${lastRowCell}="","",'${previousSheetName}'!${lastRowCell}${add})`;
                          break;
                        case 'Add Percentage':
                          // Increase previous reps by specified percentage
                          const percentageMultiplier = 1 + (exercise.progression.amount / 100);
                          formula = `IF('${previousSheetName}'!${lastRowCell}="","",ROUND('${previousSheetName}'!${lastRowCell}*${percentageMultiplier},0))`;
                          break;
                        default:
                          formula = `IF('${previousSheetName}'!${lastRowCell}="","",'${previousSheetName}'!${lastRowCell})`;
                          break;
                      }

                      ws[cellRef] = { t: 'n', f: formula };
                    } else if (exercise.progression.startingWeight > 0) {
                      // For first week, use starting weight if available
                      ws[cellRef] = { t: 'n', v: exercise.progression.startingWeight };
                    } 
                  }
                  else {
                    // Check if cell above has same color and reference its value
                    const prevRowCell = XLSX.utils.encode_cell({ r: rowIndex - 1, c: colIndex });
                    if (ws[prevRowCell]?.s?.fill?.fgColor?.rgb === exercise.color.replace('#', '')) {
                      ws[cellRef] = { t: 'n', f: `=${prevRowCell}` };
                    }
                  }
                  break;
                case 2:
                  break;
                case 3:
                  // Target Reps
                  if (previousSheetName) {
                    const prevSheetRepsCell = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex - 1 });
                    const prevSheetTargetRepsCell = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
                    let formula;

                    switch(exercise.progression.type) {
                      case 'Add Reps':
                        // Increase previous reps by specified amount
                        formula = `IF('${previousSheetName}'!${prevSheetRepsCell}="",IF('${previousSheetName}'!${prevSheetTargetRepsCell}="","",'${previousSheetName}'!${prevSheetTargetRepsCell}+${exercise.progression.amount}),'${previousSheetName}'!${prevSheetRepsCell}+${exercise.progression.amount})`;
                        break;
                      case 'Add Percentage':
                        // Increase previous reps by specified percentage
                        const percentageMultiplier = 1 + (exercise.progression.amount / 100);
                        formula = `IF('${previousSheetName}'!${prevSheetRepsCell}="","",ROUND('${previousSheetName}'!${prevSheetRepsCell}*${percentageMultiplier},0))`;
                        break;
                      case 'Add Weight':
                        const add = exercise.progression.type === 'Add Weight' ? `+ ${exercise.progression.amount}` : ' ';
                        formula = `IF('${previousSheetName}'!${prevSheetRepsCell}="","",'${previousSheetName}'!${prevSheetRepsCell}${add})`;
                        break;
                      case 'None':
                      default:
                        // Find the last row with the same exercise color in the previous sheet
                        let lastRowWithColor = 1;
                        const prevSheet = wb.Sheets[previousSheetName];
                        Object.keys(prevSheet)
                          .filter(key => !key.startsWith('!'))
                          .forEach(key => {
                            const cell = XLSX.utils.decode_cell(key);
                            if (cell.c === colIndex && cell.r > lastRowWithColor) {
                              const cellStyle = prevSheet[key]?.s;
                              if (cellStyle?.fill?.fgColor?.rgb === exercise.color.replace('#', '')) {
                                lastRowWithColor = cell.r;
                              }
                            }
                          });
                        const prevSheetCell = XLSX.utils.encode_cell({ r: lastRowWithColor, c: colIndex });
                        formula = `IF('${previousSheetName}'!${prevSheetCell}="","",'${previousSheetName}'!${prevSheetCell})`;
                        break;
                    }

                    ws[cellRef] = { t: 'n', f: formula };
                  } else if (exercise.progression.startingReps > 0 && isFirstRow) {
                    // For first week, use starting reps if available
                    ws[cellRef] = { t: 'n', v: exercise.progression.startingReps };
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

  copyLastWeekData(sourceFile: File, targetFile: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          // Read source workbook
          const sourceData = new Uint8Array(e.target?.result as ArrayBuffer);
          const sourceWb = XLSX.read(sourceData, { type: 'array' });
          
          // Get the last sheet from source workbook
          const sourceSheetName = sourceWb.SheetNames[sourceWb.SheetNames.length - 1];
          const sourceSheet = sourceWb.Sheets[sourceSheetName];

          // Read target workbook
          const targetReader = new FileReader();
          targetReader.onload = (e2: ProgressEvent<FileReader>) => {
            try {
              const targetData = new Uint8Array(e2.target?.result as ArrayBuffer);
              const targetWb = XLSX.read(targetData, { type: 'array' });
              
              // Get the first sheet from target workbook
              const targetSheetName = targetWb.SheetNames[0];
              const targetSheet = targetWb.Sheets[targetSheetName];

              // Copy weight and reps data
              Object.keys(sourceSheet)
                .filter(key => !key.startsWith('!'))
                .forEach(key => {
                  const cell = XLSX.utils.decode_cell(key);
                  // Skip header rows (first 2 rows)
                  if (cell.r > 1) {
                    // Check if this is a weight column (remainder 1 when divided by 4)
                    // or a reps column (remainder 2 when divided by 4)
                    if (cell.c % 4 === 1 || cell.c % 4 === 2) {
                      const sourceCell = sourceSheet[key];
                      if (sourceCell && sourceCell.v !== '') {
                        targetSheet[key] = { ...sourceCell };
                      }
                    }
                  }
                });

              // Write the modified workbook to a new file
              const newFileName = targetFile.name.replace('.xlsx', '_updated.xlsx');
              XLSX.writeFile(targetWb, newFileName);
              resolve();
            } catch (error) {
              reject(error);
            }
          };

          targetReader.onerror = () => reject(new Error('Error reading target file'));
          targetReader.readAsArrayBuffer(targetFile);

        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Error reading source file'));
      reader.readAsArrayBuffer(sourceFile);
    });
  }

  updateProgressionFromSpreadsheet(file: File): Promise<{ [key: string]: { weight: number, reps: number, startingWeight: number, startingReps: number }}> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          // Read workbook
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          
          // Find the last sheet with manually entered values and first sheet with any data
          let lastSheetWithData: { sheet: XLSX.WorkSheet, name: string } | null = null;
          let firstSheetWithData: { sheet: XLSX.WorkSheet, name: string } | null = null;
          
          // First pass: find first sheet with any data
          for (let i = 0; i < wb.SheetNames.length; i++) {
            const sheetName = wb.SheetNames[i];
            const sheet = wb.Sheets[sheetName];
            let hasData = false;

            Object.keys(sheet)
              .filter(key => !key.startsWith('!'))
              .forEach(key => {
                const cell = XLSX.utils.decode_cell(key);
                if (cell.r > 1) {
                  if (cell.c % 4 === 1 || cell.c % 4 === 2) {
                    const cellData = sheet[key];
                    if (cellData && cellData.v !== '') {
                      hasData = true;
                    }
                  }
                }
              });

            if (hasData) {
              firstSheetWithData = { sheet, name: sheetName };
              break;
            }
          }

          // Second pass: find last sheet with manual data
          for (let i = wb.SheetNames.length - 1; i >= 0; i--) {
            const sheetName = wb.SheetNames[i];
            const sheet = wb.Sheets[sheetName];
            let hasManualData = false;

            Object.keys(sheet)
              .filter(key => !key.startsWith('!'))
              .forEach(key => {
                const cell = XLSX.utils.decode_cell(key);
                if (cell.r > 1) {
                  if (cell.c % 4 === 1 || cell.c % 4 === 2) {
                    const cellData = sheet[key];
                    if (cellData && cellData.v !== '' && !cellData.f) {
                      hasManualData = true;
                    }
                  }
                }
              });

            if (hasManualData) {
              lastSheetWithData = { sheet, name: sheetName };
              break;
            }
          }

          // If no sheet with manual data found, return empty data
          if (!lastSheetWithData) {
            resolve({});
            return;
          }

          const sheet = lastSheetWithData.sheet;
          console.log(`Using data from sheet: ${lastSheetWithData.name}`);

          // Create map to store exercise data
          const exerciseData: { [key: string]: { weight: number, reps: number, startingWeight: number, startingReps: number } } = {};

          // Process each cell
          Object.keys(sheet)
            .filter(key => !key.startsWith('!'))
            .forEach(key => {
              const cell = XLSX.utils.decode_cell(key);
              if (cell.r > 1) {
                const dayIndex = Math.floor(cell.c / 4);
                const columnType = cell.c % 4;

                if (columnType === 0) {
                  const exerciseName = sheet[key].v;
                  if (exerciseName && exerciseName.trim() !== '') {
                    if (!exerciseData[exerciseName]) {
                      exerciseData[exerciseName] = { weight: 0, reps: 0, startingWeight: 0, startingReps: 0 };
                    }
                    
                    const weightKey = XLSX.utils.encode_cell({ r: cell.r, c: cell.c + 1 });
                    const repsKey = XLSX.utils.encode_cell({ r: cell.r, c: cell.c + 2 });
                    
                    // Get current values from last sheet with manual data
                    if (sheet[weightKey] && sheet[weightKey].v && !sheet[weightKey].f) {
                      exerciseData[exerciseName].weight = Number(sheet[weightKey].v);
                    }
                    if (sheet[repsKey] && sheet[repsKey].v && !sheet[repsKey].f) {
                      exerciseData[exerciseName].reps = Number(sheet[repsKey].v);
                    }

                    // Get starting values from first sheet with data
                    if (firstSheetWithData) {
                      const firstSheet = firstSheetWithData.sheet;
                      const firstWeightKey = XLSX.utils.encode_cell({ r: cell.r, c: cell.c + 1 });
                      const firstRepsKey = XLSX.utils.encode_cell({ r: cell.r, c: cell.c + 2 });

                      if (firstSheet[firstWeightKey] && firstSheet[firstWeightKey].v) {
                        exerciseData[exerciseName].startingWeight = Number(firstSheet[firstWeightKey].v);
                      }
                      if (firstSheet[firstRepsKey] && firstSheet[firstRepsKey].v) {
                        exerciseData[exerciseName].startingReps = Number(firstSheet[firstRepsKey].v);
                      }
                    }
                  }
                }
              }
            });

          resolve(exerciseData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  }
}