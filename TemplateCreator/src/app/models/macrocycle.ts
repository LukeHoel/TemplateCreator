import { Mesocycle } from "./mesocycle";

export interface Macrocycle {
    name: string;
    mesocycles: Array<Mesocycle>;
}