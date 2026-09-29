/**
 * Circuit breaker for the AI gateway (pure, testable).
 * Opens after consecutive upstream failures; half-opens after cooldown.
 */

export type CircuitState = "closed" | "open" | "half_open";

export type CircuitBreakerConfig = {
  /** Failures in a row before opening. */
  failureThreshold: number;
  /** Ms to stay open before allowing a probe. */
  cooldownMs: number;
};

export const DEFAULT_CIRCUIT: CircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 60_000,
};

export type CircuitSnapshot = {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
};

export function createCircuit(config: CircuitBreakerConfig = DEFAULT_CIRCUIT) {
  let consecutiveFailures = 0;
  let openedAt: number | null = null;

  function state(now = Date.now()): CircuitState {
    if (openedAt == null) return "closed";
    if (now - openedAt >= config.cooldownMs) return "half_open";
    return "open";
  }

  return {
    snapshot(now = Date.now()): CircuitSnapshot {
      return { state: state(now), consecutiveFailures, openedAt };
    },
    /** Returns false when the circuit is open (calls should not proceed). */
    allow(now = Date.now()): boolean {
      return state(now) !== "open";
    },
    recordSuccess() {
      consecutiveFailures = 0;
      openedAt = null;
    },
    recordFailure(now = Date.now()) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= config.failureThreshold) {
        openedAt = now;
      }
    },
    reset() {
      consecutiveFailures = 0;
      openedAt = null;
    },
  };
}

export type CircuitBreaker = ReturnType<typeof createCircuit>;

/** Process-local breaker for the built-in gateway (server-only usage). */
let shared: CircuitBreaker | null = null;

export function sharedGatewayCircuit(): CircuitBreaker {
  if (!shared) shared = createCircuit();
  return shared;
}

/** Test helper — replace the shared instance. */
export function resetSharedGatewayCircuit(instance?: CircuitBreaker) {
  shared = instance ?? createCircuit();
}
