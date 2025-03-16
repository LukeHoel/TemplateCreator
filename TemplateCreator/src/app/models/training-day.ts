import { Exercise } from "./training-exercise";

export interface Day {
    name: string;
    exercises: Array<Exercise>;
}