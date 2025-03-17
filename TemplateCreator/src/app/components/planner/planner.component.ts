import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [...imports, DragDropModule, MatCardModule, MatSelectModule],
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
})
export class PlannerComponent implements OnInit {
  progressionTypes: ProgressionType[] = ['Add Amount', 'Add Reps', 'Add Percentage', 'None'];
  
  sampleMesoCycle = {
    name: 'Mesocycle',
    microcycles: [
      {
        name: 'Week 1',
        days: [
          {
            name: 'Day 1',
            exercises: [],
          },
        ],
      },
    ],
  };
  selectedMesoCycle: Mesocycle;

  constructor(private spreadsheetService: SpreadsheetGenerationService) {
    // Try to load the last used mesocycle name
    const lastMesocycleName = localStorage.getItem('lastMesocycleName');
    if (lastMesocycleName) {
      const savedMesocycle = localStorage.getItem(lastMesocycleName);
      this.selectedMesoCycle = savedMesocycle 
        ? JSON.parse(savedMesocycle) 
        : {...this.sampleMesoCycle};
    } else {
      this.selectedMesoCycle = {...this.sampleMesoCycle};
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
    this.selectedMesoCycle.microcycles[0].days.push({
      name: `Day ${this.selectedMesoCycle.microcycles[0].days.length + 1}`,
      exercises: [],
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

  dropExercise(event: CdkDragDrop<string[]>) {
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  }

  addExercise(day: any) {
    if (!day.exercises) {
      day.exercises = [];
    }
    day.exercises.push({
      name: `Exercise ${day.exercises.length + 1}`,
      progression: {
        type: 'Add Amount',
        unit: 'lbs',
        amount: 0
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
      this.spreadsheetService.generateAndDownloadSpreadsheet(this.selectedMesoCycle);
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
}
