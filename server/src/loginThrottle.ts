// Login attempt throttle (F-01 contract §1.2 step 3, §1.5, AC-F01-07, AC-F01-08, AC-F01-20).
//
// SCAFFOLD STUB (#9, chore commit): it allows every attempt and counts nothing. The sliding-window throttle with
// reservation arrives with the F-01 implementation, after the failing tests that specify it.

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export type AttemptOutcome = "failure" | "success" | "neutral";
export type AttemptStart = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export class LoginThrottle {
  beginAttempt(_email: string, _now: number): AttemptStart {
    return { allowed: true };
  }

  endAttempt(_email: string, _outcome: AttemptOutcome, _now: number): void {}

  clear(): void {}
}
