export type TrialCase = { id: string; slug: string; name: string; title: string; avatar_url: string | null; punishment: string; heat_count: number };
export type Crime = { id: string; case_id: string; title: string; description: string; severity: number; sort_order: number };
export type VoteOption = { id: string; case_id: string; label: string; vote_count: number; sort_order: number };
