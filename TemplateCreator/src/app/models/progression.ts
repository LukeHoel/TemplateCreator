export type ProgressionType = 'Add Amount' | 'Add Reps' | 'Add Percentage' | 'None';

export interface Progression {
    type: ProgressionType;
    amount: number;
}