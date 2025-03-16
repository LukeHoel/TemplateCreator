export interface Exercise {
    name: string;
    color: string;
    progression: (input: number) => number;
}