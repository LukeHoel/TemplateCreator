import { Exercise } from "./training-exercise";

export interface Day {
    day: string;
    exercises: Array<Exercise>;
}