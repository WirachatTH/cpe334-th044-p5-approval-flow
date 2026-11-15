import { describe, expect, it } from "vitest";
import { LoginThrottle, WINDOW_MS } from "../../src/loginThrottle.js";

// TEST-F01-08 / AC-F01-08: the sliding window, with a controlled clock (no waiting).

const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);
const SECOND = 1000;

function fail(throttle: LoginThrottle, email: string, now: number) {
  const start = throttle.beginAttempt(email, now);
  expect(start.allowed, `an attempt at ${now - T0} ms must be allowed`).toBe(true);
  throttle.endAttempt(email, "failure", now);
}

describe("LoginThrottle", () => {
  it("TEST-F01-08 / AC-F01-08 (a): the oldest failure leaves the window at exactly 15 minutes", () => {
    const throttle = new LoginThrottle();
    for (let i = 0; i < 5; i += 1) fail(throttle, "ploy@example.com", T0 + i * SECOND);

    expect(throttle.beginAttempt("ploy@example.com", T0 + WINDOW_MS - 1).allowed).toBe(false);
    const atBoundary = throttle.beginAttempt("ploy@example.com", T0 + WINDOW_MS);
    expect(atBoundary.allowed).toBe(true);
  });

  it("TEST-F01-08 / AC-F01-08 (b): a success clears the count", () => {
    const throttle = new LoginThrottle();
    const email = "mint@example.com";
    for (let i = 0; i < 4; i += 1) fail(throttle, email, T0 + i * SECOND);
    expect(throttle.beginAttempt(email, T0 + 10 * SECOND).allowed).toBe(true);
    throttle.endAttempt(email, "success", T0 + 10 * SECOND);

    for (let i = 0; i < 5; i += 1) fail(throttle, email, T0 + (20 + i) * SECOND);
    expect(throttle.beginAttempt(email, T0 + 30 * SECOND).allowed, "the sixth new failure is refused").toBe(false);
  });

  it("TEST-F01-08 / AC-F01-08 (c): an unknown email is throttled exactly like a known one", () => {
    const throttle = new LoginThrottle();
    const email = "nobody@example.com";
    for (let i = 0; i < 5; i += 1) fail(throttle, email, T0 + i * SECOND);
    const refused = throttle.beginAttempt(email, T0 + 10 * SECOND);
    expect(refused.allowed).toBe(false);
    if (!refused.allowed) expect(refused.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
