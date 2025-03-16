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
import { Progression } from '../../models/progression';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [...imports, DragDropModule, MatCardModule, MatSelectModule],
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
})
export class PlannerComponent implements OnInit {
  progressionTypes = ['none', 'percent', 'increment', 'increment reps'];
  units = ['lbs', 'km', 'minutes'];
  
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

  constructor() {
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
        type: 'none',
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
}
