import { Microcycle } from "./microcycle";

export interface Mesocycle {
    name: string;
    microcycles: Array<Microcycle>;
}