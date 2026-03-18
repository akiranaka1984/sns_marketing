/**
 * Log-normal distribution delay for natural human timing.
 * Human reaction times follow a log-normal distribution, not uniform.
 */
export function logNormalDelay(medianMs: number, sigma: number = 0.5): Promise<void> {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const delay = medianMs * Math.exp(sigma * z);
  const clamped = Math.max(medianMs * 0.3, Math.min(medianMs * 4, delay));
  return new Promise(resolve => setTimeout(resolve, Math.floor(clamped)));
}

/**
 * Simulate human typing speed (50-150ms per character with variance)
 */
export function typingDelay(textLength: number): Promise<void> {
  const baseMs = 50 + Math.random() * 100;
  const totalMs = Math.floor(textLength * baseMs);
  const clamped = Math.min(totalMs, 8000); // cap at 8 seconds
  return new Promise(resolve => setTimeout(resolve, clamped));
}

/**
 * Random pause between actions (replaces uniform randomDelay)
 */
export function humanPause(minMs: number, maxMs: number): Promise<void> {
  return logNormalDelay((minMs + maxMs) / 2, 0.4);
}
