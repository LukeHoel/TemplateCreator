import { Injectable } from '@angular/core';
import { Mesocycle } from '../models/mesocycle';
import * as XLSX from 'xlsx';
import { Microcycle } from '../models/microcycle';

@Injectable({
  providedIn: 'root'
})
export class SpreadsheetGenerationService {

  constructor() { }

  generateAndDownloadSpreadsheet(mesocycle: Mesocycle): void {
    // Create workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    
    // Create a worksheet for each microcycle
    mesocycle.microcycles.forEach((microcycle, index) => {
      // Convert microcycle data to worksheet format
      const wsData = this.convertMicrocycleToWorksheetData(microcycle);
      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, `Week ${index + 1}`);
    });

    // Generate the Excel file
    XLSX.writeFile(wb, `${mesocycle.name}_training_plan.xlsx`);
  }

  private convertMicrocycleToWorksheetData(microcycle: Microcycle): any[][] {
    const rows: any[][] = [];
    const headerRow: any[] = [];
    microcycle.days.forEach((day) => headerRow.push(day.name, '', '', ''));
    microcycle.days.forEach((day) => headerRow.push('Exercise', 'Weight', 'Reps', 'Target Reps'));
    rows.push(headerRow);

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
            // Add exercise data
            row.push(exercise.name, '', '', '');
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

    return rows;
  }
} 