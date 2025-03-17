import { Progression } from "./progression";

export interface Exercise {
    name: string;
    color: string;
    setCount: number;
    progression: Progression;
}