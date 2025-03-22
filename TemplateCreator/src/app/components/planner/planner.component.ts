import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mesocycle } from '../../models/mesocycle';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { imports } from '../../app.module';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Progression, ProgressionType } from '../../models/progression';
import { SpreadsheetGenerationService } from '../../services/spreadsheet-generation.service';
import { Day } from '../../models/training-day';
import { sampleMeso } from '../../models/sample-meso';
import { Exercise } from '../../models/training-exercise';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [...imports, DragDropModule, MatCardModule, MatSelectModule],
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
})
export class PlannerComponent implements OnInit {
  progressionTypes: ProgressionType[] = ['Add Weight', 'Add Reps', 'Add Percentage', 'None'];
  
  selectedMesoCycle: Mesocycle;
  microcycleCount: number = 3;
  // Add array of nice looking colors
  private exerciseColors: string[] = [
    '#386DDE', // "Chest",
    '#F05D23', // "Back",
    '#48e5c2', // "Triceps",
    '#C42847', // "Biceps",
    '#6AB547', // "Shoulders",
    '#a6245f', // "Quads",
    '#ff69b4', // "Glutes",
    '#8cc9d3', // "Hamstrings",
    '#8E4A49', // "Calves",
    '#297373', // "Traps",
    '#F9C846', // "Forearms",
    '#297373', // "Abs"
  ];

  private sourceFile: File | null = null;
  private targetFile: File | null = null;

  @ViewChild('sourceFileInput') sourceFileInput!: ElementRef;
  @ViewChild('spreadsheetInput') spreadsheetInput!: ElementRef;

  constructor(private spreadsheetService: SpreadsheetGenerationService) {
    // Try to load the last used mesocycle name
    const lastMesocycleName = localStorage.getItem('lastMesocycleName');
    if (lastMesocycleName) {
      const savedMesocycle = localStorage.getItem(lastMesocycleName);
      this.selectedMesoCycle = savedMesocycle 
        ? JSON.parse(savedMesocycle) 
        : {...sampleMeso};
    } else {
      this.selectedMesoCycle = {...sampleMeso};
    }
  }

  ngOnInit(): void {
  }
  
  selectMesoCycle(mesoCycle: Mesocycle) {
    this.selectedMesoCycle = {...mesoCycle};
    this.saveMesocycle();
  }

  addDay() {
    if (!this.selectedMesoCycle) {
      return;
    }
    const newIndex = this.selectedMesoCycle.microcycles[0].days.length;
    this.selectedMesoCycle.microcycles[0].days.push({
      name: `Day ${newIndex + 1}`,
      exercises: [],
    });
    
    // Allow time for the DOM to update
    setTimeout(() => {
      const dayInput = document.querySelector(`#day-name-${newIndex}`) as HTMLInputElement;
      if (dayInput) {
        dayInput.focus();
        dayInput.select();
      }
    });
  }

  saveMesocycle() {
    if (!this.selectedMesoCycle?.name) return;
    
    localStorage.setItem(this.selectedMesoCycle.name, JSON.stringify(this.selectedMesoCycle));
    localStorage.setItem('lastMesocycleName', this.selectedMesoCycle.name);
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.selectedMesoCycle.microcycles[0].days, event.previousIndex, event.currentIndex);
  }

  dropExercise(event: CdkDragDrop<string[]>, exercise: Day) {
    moveItemInArray(exercise.exercises, event.previousIndex, event.currentIndex);
  }

  private getAvailableColors(day: Day): string[] {
    // Get currently used colors in this day
    const usedColors = new Set(day.exercises.map(ex => ex.color));
    // Return only unused colors
    return this.exerciseColors.filter(color => !usedColors.has(color));
  }

  private getRandomColor(availableColors: string[]): string {
    if (availableColors.length === 0) {
      // If no unique colors left, fall back to the full color array
      return this.exerciseColors[Math.floor(Math.random() * this.exerciseColors.length)];
    }
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  }

  addExercise(day: Day) {
    if (!day.exercises) {
      day.exercises = [];
    }
    const newIndex = day.exercises.length;
    
    const availableColors = this.getAvailableColors(day);
    const randomColor = this.getRandomColor(availableColors);
    
    day.exercises.push({
      name: `Exercise ${newIndex + 1}`,
      progression: {
        type: 'Add Weight',
        amount: 5,
        startingWeight: 0,
        startingReps: 0
      },
      color: randomColor,
      setCount: 3
    });

    // Get the day index to construct the correct input ID
    const dayIndex = this.selectedMesoCycle.microcycles[0].days.findIndex(d => d === day);
    
    // Allow time for the DOM to update
    setTimeout(() => {
      const exerciseInput = document.querySelector(`#exercise-name-${newIndex}-${dayIndex}`) as HTMLInputElement;
      if (exerciseInput) {
        exerciseInput.focus();
        exerciseInput.select();
      }
    });
  }

  removeExercise(day: any, exerciseIndex: number) {
    day.exercises.splice(exerciseIndex, 1);
  }

  removeDay(dayIndex: number) {
    this.selectedMesoCycle.microcycles[0].days.splice(dayIndex, 1);
  }

  generateSpreadsheet() {
    if (this.selectedMesoCycle) {
      const week = this.selectedMesoCycle.microcycles[0];
      const weeks = [];
      for (let i = 0; i < this.microcycleCount; i++) {
        weeks.push(week);
      }
      this.spreadsheetService.generateAndDownloadSpreadsheet({...this.selectedMesoCycle, microcycles: weeks});
    }
  }

  exportTemplate() {
    if (!this.selectedMesoCycle) return;
    
    const exportMesocycle = {
      ...this.selectedMesoCycle,
      name: `${this.selectedMesoCycle.name}_copy`
    };
    
    const dataStr = JSON.stringify(exportMesocycle, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportMesocycle.name}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  importTemplate(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedMesocycle = JSON.parse(e.target?.result as string);
        this.selectMesoCycle(importedMesocycle);
      } catch (error) {
        console.error('Error importing template:', error);
        // You might want to add proper error handling/user notification here
      }
    };
    reader.readAsText(file);
  }

  onNameChange(newName: string) {
    // Check if a mesocycle with this name exists in localStorage
    const savedMesocycle = localStorage.getItem(newName);
    if (savedMesocycle) {
      // If it exists, load it
      this.selectedMesoCycle = JSON.parse(savedMesocycle);
    }
    // If it doesn't exist, keep the current mesocycle with the new name
    // It will be saved when the user clicks save
  }

  loadMesocycle() {
    if (!this.selectedMesoCycle?.name) return;
    
    const savedMesocycle = localStorage.getItem(this.selectedMesoCycle.name);
    if (savedMesocycle) {
      this.selectedMesoCycle = JSON.parse(savedMesocycle);
    } else {
      // Optionally add error handling for when the mesocycle doesn't exist
      console.log('No mesocycle found with that name');
    }
  }

  onProgressionTypeChange(newType: ProgressionType, exercise: Exercise) {
    const currentProgression = exercise.progression;
    
    switch (newType) {
      case 'Add Reps':
        exercise.progression = {
          ...currentProgression,
          type: newType,
          amount: 1
        };
        break;
      case 'Add Weight':
        exercise.progression = {
          ...currentProgression,
          type: newType,
          amount: 5
        };
        break;
      case 'Add Percentage':
        exercise.progression = {
          ...currentProgression,
          type: newType,
          amount: 10
        };
        break;
      case 'None':
        exercise.progression = {
          ...currentProgression,
          type: newType,
          amount: 0
        };
        break;
    }
  }

  startCopyLastWeek() {
    // Reset files
    this.sourceFile = null;
    this.targetFile = null;
    
    // Trigger source file selection using ViewChild reference
    this.sourceFileInput.nativeElement.click();
  }

  onSourceFileSelected(event: any) {
    this.sourceFile = event.target.files[0];
    if (this.sourceFile) {
      // Now trigger target file selection using ViewChild reference
      this.spreadsheetInput.nativeElement.click();
    }
  }

  async updateProgressionFromSpreadsheet(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const exerciseData = await this.spreadsheetService.updateProgressionFromSpreadsheet(file);
      
      // Update progression data for matching exercises
      this.selectedMesoCycle.microcycles[0].days.forEach(day => {
        day.exercises.forEach(exercise => {
          const data = exerciseData[exercise.name];
          if (data) {
            // Set the progression type and amount based on the data
            if (data.weight > 0) {
              exercise.progression = {
                ...exercise.progression,
                type: 'Add Weight',
                amount: 5, // Default weight increment
                startingWeight: data.startingWeight > 0 ? data.startingWeight : data.weight,
                startingReps: data.startingReps > 0 ? data.startingReps : (data.reps || exercise.progression.startingReps)
              };
            } else if (data.reps > 0) {
              exercise.progression = {
                ...exercise.progression,
                type: 'Add Reps',
                amount: 1, // Default rep increment
                startingWeight: data.startingWeight > 0 ? data.startingWeight : exercise.progression.startingWeight,
                startingReps: data.startingReps > 0 ? data.startingReps : data.reps
              };
            }
          }
        });
      });

      // Clear the file input
      this.spreadsheetInput.nativeElement.value = '';
      
      // Show success message
      alert('Progression data updated successfully from spreadsheet!');
    } catch (error) {
      console.error('Error updating progression data:', error);
      alert('Error updating progression data. Please check the console for details.');
    }
  }
}
