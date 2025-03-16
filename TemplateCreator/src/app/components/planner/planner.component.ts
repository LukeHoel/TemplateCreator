import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mesocycle } from '../../models/mesocycle';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { imports } from '../../app.module';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: imports,
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
})
export class PlannerComponent implements OnInit {
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
}
