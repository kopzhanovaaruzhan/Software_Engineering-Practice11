import type { CheckResult } from './utils';

export const MAX_EXPLANATION_LENGTH = 600;
export const EXPLAIN_TIMEOUT_MS = 3000;

export interface ExplainInput {
  roomName: string;
  startLabel: string;
  endLabel: string;
  result: CheckResult;
}

export type ExplainOutcome =
  | { kind: 'ok'; text: string }
  | { kind: 'rejected'; reason: string }
  | { kind: 'fallback'; reason: string };

/**
 * Mock adapter standing in for a future LLM explanation endpoint.
 * The deterministic checker (checkAvailability) stays authoritative: the
 * generated text is only ever a rephrasing of its verdict and reasons.
 */
export async function generateExplanation(
  input: ExplainInput,
  adapter: (prompt: string) => Promise<string> = mockAdapter,
): Promise<ExplainOutcome> {
  const prompt = buildPrompt(input);
  if (prompt === null) {
    return { kind: 'rejected', reason: 'Request is empty or malformed.' };
  }

  try {
    const text = await withTimeout(adapter(prompt), EXPLAIN_TIMEOUT_MS);
    if (typeof text !== 'string' || text.trim().length === 0) {
      return { kind: 'fallback', reason: 'The explanation service returned an empty response.' };
    }
    if (text.length > MAX_EXPLANATION_LENGTH) {
      return { kind: 'fallback', reason: 'The explanation service returned an overly long response.' };
    }
    return { kind: 'ok', text: text.trim() };
  } catch (err) {
    const reason =
      err instanceof ExplainTimeoutError
        ? 'The explanation service timed out.'
        : 'The explanation service is currently unavailable.';
    return { kind: 'fallback', reason };
  }
}

export class ExplainTimeoutError extends Error {}

function withTimeout(promise: Promise<string>, ms: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ExplainTimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Returns null when the input is empty, malformed, or oversized (AC3). */
function buildPrompt(input: ExplainInput): string | null {
  const { roomName, startLabel, endLabel, result } = input;
  if (
    typeof roomName !== 'string' ||
    typeof startLabel !== 'string' ||
    typeof endLabel !== 'string' ||
    roomName.trim().length === 0 ||
    roomName.length > 40 ||
    !/^\d{1,2}:\d{2}$/.test(startLabel.trim()) ||
    !/^\d{1,2}:\d{2}$/.test(endLabel.trim()) ||
    !result ||
    typeof result.available !== 'boolean' ||
    !Array.isArray(result.reasons) ||
    result.reasons.length > 10 ||
    result.reasons.some((r) => typeof r !== 'string' || r.length > 200)
  ) {
    return null;
  }
  return [
    `Room: ${roomName.trim()}`,
    `Slot: ${startLabel.trim()}–${endLabel.trim()}`,
    `Deterministic verdict: ${result.available ? 'Available' : 'Unavailable'}`,
    `Reasons: ${result.reasons.join(' | ') || 'none'}`,
  ].join('\n');
}

function mockAdapter(prompt: string): Promise<string> {
  const lines = prompt.split('\n');
  const room = lines[0].replace(/^Room: /, '');
  const slot = lines[1].replace(/^Slot: /, '');
  const verdict = lines[2].replace(/^Deterministic verdict: /, '');
  const reasons = lines[3].replace(/^Reasons: /, '');

  const detail =
    reasons === 'none'
      ? `Nothing on the calendar conflicts with ${slot}, so the room is free for the full slot.`
      : `It is unavailable because ${lowerFirst(reasons)}`;
  return Promise.resolve(
    `${room} shows ${verdict.toLowerCase()}. ${detail} This explanation is generated automatically; the confirmed status is the verdict shown above.`,
  );
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
