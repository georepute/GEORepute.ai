/**
 * In-memory progress store for global visibility matrix calculation.
 * Key format: `${userId}:${domainId}`
 */

export interface MatrixProgress {
  phase: 'analyzing' | 'gsc_fetch' | 'ai_check' | 'complete' | 'error';
  processed: number;
  total: number;
  message?: string;
}

const progressStore = new Map<string, MatrixProgress>();

export function setProgress(key: string, progress: MatrixProgress): void {
  progressStore.set(key, progress);
}

export function getProgress(key: string): MatrixProgress | null {
  return progressStore.get(key) ?? null;
}

export function clearProgress(key: string): void {
  progressStore.delete(key);
}

export function buildProgressKey(userId: string, domainId: string): string {
  return `${userId}:${domainId}`;
}
