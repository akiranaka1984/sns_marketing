import { useSyncExternalStore } from 'react';
import { getFeatureFlags, type FeatureFlag } from '@/lib/featureFlags';

// Cache the snapshot so useSyncExternalStore sees stable object references.
// Without caching, getFeatureFlags() returns a new object each call → React
// treats every render as a state change → infinite re-render loop.
let cachedSnapshot: Record<FeatureFlag, boolean> = getFeatureFlags();
let cachedKey = JSON.stringify(cachedSnapshot);

function refreshCache(): void {
  const next = getFeatureFlags();
  const nextKey = JSON.stringify(next);
  if (nextKey !== cachedKey) {
    cachedSnapshot = next;
    cachedKey = nextKey;
  }
}

function subscribe(callback: () => void): () => void {
  const handler = () => {
    refreshCache();
    callback();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function getSnapshot(): Record<FeatureFlag, boolean> {
  return cachedSnapshot;
}

export function useFeatureFlags(): Record<FeatureFlag, boolean> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useFeatureFlag(flag: FeatureFlag): boolean {
  const flags = useFeatureFlags();
  return !!flags[flag];
}
