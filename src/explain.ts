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
  const payload = buildPayload(input);
  if (payload === null) {
    return { kind: 'rejected', reason: 'Request is empty or malformed.' };
  }

  try {
    const text = await withTimeout(adapter(payload), EXPLAIN_TIMEOUT_MS);
    if (typeof text !== 'string' || text.trim().length === 0) {
      return { kind: 'fallback', reason: 'The explanation service returned an empty response.' };
    }
    if (text.length > MAX_EXPLANATION_LENGTH) {
      return { kind: 'fallback', reason: 'The explanation service returned an overly long response.' };
    }
    const explanation = parseExplanation(text);
    if (explanation === null) {
      return { kind: 'fallback', reason: 'The explanation service returned an unparseable response.' };
    }
    return { kind: 'ok', text: explanation };
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

/** Serializes the validated input to the wire JSON payload. Returns null when malformed (AC3). */
function buildPayload(input: ExplainInput): string | null {
  const { roomName, startLabel, endLabel, result } = input;
  const start = startLabel.trim();
  const end = endLabel.trim();
  if (
    typeof roomName !== 'string' ||
    typeof startLabel !== 'string' ||
    typeof endLabel !== 'string' ||
    roomName.trim().length === 0 ||
    roomName.length > 40 ||
    // C2: newlines would corrupt the line-based prompt structure.
    /[\r\n]/.test(roomName) ||
    !/^\d{1,2}:\d{2}$/.test(start) ||
    !/^\d{1,2}:\d{2}$/.test(end) ||
    !result ||
    typeof result.available !== 'boolean' ||
    // C1: the checker guarantees available === (reasons.length === 0);
    // rejecting violations here prevents self-contradictory explanations.
    result.available !== (result.reasons.length === 0) ||
    !Array.isArray(result.reasons) ||
    result.reasons.length > 10 ||
    result.reasons.some((r) => typeof r !== 'string' || r.length > 200)
  ) {
    return null;
  }
  return JSON.stringify({
    roomName: roomName.trim(),
    startTime: start,
    endTime: end,
    isAvailable: result.available,
    reasons: result.reasons,
  });
}

/** Extracts and bounds-checks the explanation from the expected {"explanation": "..."} response. */
function parseExplanation(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as { explanation?: unknown };
    if (typeof parsed.explanation !== 'string') return null;
    const trimmed = parsed.explanation.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_EXPLANATION_LENGTH) return null;
    return trimmed;
  } catch {
    return null;
  }
}

async function mockAdapter(prompt: string): Promise<string> {
  const payload = JSON.parse(prompt) as {
    roomName: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    reasons: string[];
  };
  const slot = `${payload.startTime}–${payload.endTime}`;
  const explanation = payload.isAvailable
    ? `${payload.roomName} is available from ${slot}. We hope you have a great session.`
    : `${payload.roomName} is unavailable for ${slot} because ${lowerFirst(payload.reasons.join('; '))}. Please consider another time or room.`;
  return JSON.stringify({ explanation });
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
