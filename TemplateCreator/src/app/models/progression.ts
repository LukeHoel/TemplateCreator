export type ProgressionType = 'Add Weight' | 'Add Reps' | 'Add Percentage' | 'None';

export interface Progression {
    type: ProgressionType;
    amount: number;
}