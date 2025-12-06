// ===========================================
// RELIABOND MCP SERVER - SLA EVALUATION TESTS
// ===========================================

import { describe, it, expect, beforeEach } from 'vitest';

// Mock storage for testing
class MockStorage {
  private probeResults: Array<{
    timestamp: number;
    latencyMs: number;
    ok: boolean;
  }> = [];

  private breachStartTime: number | null = null;

  addProbeResult(result: { latencyMs: number; ok: boolean }) {
    this.probeResults.push({
      ...result,
      timestamp: Date.now(),
    });
  }

  getProbeResults() {
    return this.probeResults;
  }

  calculateRollingMetrics() {
    const results = this.probeResults;
    const totalChecks = results.length;
    const successfulChecks = results.filter((r) => r.ok).length;
    const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);

    const uptimePercent = totalChecks > 0 
      ? (successfulChecks / totalChecks) * 100 
      : 100;

    const p99Index = Math.floor(latencies.length * 0.99);
    const p99LatencyMs = latencies[p99Index] || 0;

    return {
      totalChecks,
      successfulChecks,
      uptimePercent,
      p99LatencyMs,
      avgLatencyMs: latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0,
    };
  }

  getBreachStartTime() {
    return this.breachStartTime;
  }

  setBreachStartTime(time: number) {
    this.breachStartTime = time;
  }

  clearBreachStartTime() {
    this.breachStartTime = null;
  }

  reset() {
    this.probeResults = [];
    this.breachStartTime = null;
  }
}

// SLA Evaluation Logic (extracted for testing)
function evaluateSla(
  storage: MockStorage,
  sloConfig: {
    maxLatencyP99Ms: number;
    minUptimePercent: number;
    breachThresholdSeconds: number;
  }
): {
  status: 'OK' | 'WARN' | 'BREACHED';
  breachType?: 'latency' | 'availability' | 'both';
  breachDurationSeconds: number;
  recommendedCompensation: number;
} {
  const metrics = storage.calculateRollingMetrics();

  const latencyBreached = metrics.p99LatencyMs > sloConfig.maxLatencyP99Ms;
  const availabilityBreached = metrics.uptimePercent < sloConfig.minUptimePercent;

  let status: 'OK' | 'WARN' | 'BREACHED' = 'OK';
  let breachType: 'latency' | 'availability' | 'both' | undefined;
  let breachDurationSeconds = 0;
  let recommendedCompensation = 0;

  if (latencyBreached && availabilityBreached) {
    breachType = 'both';
  } else if (latencyBreached) {
    breachType = 'latency';
  } else if (availabilityBreached) {
    breachType = 'availability';
  }

  if (breachType) {
    const breachStart = storage.getBreachStartTime();
    const now = Date.now();

    if (breachStart) {
      breachDurationSeconds = Math.floor((now - breachStart) / 1000);

      if (breachDurationSeconds >= sloConfig.breachThresholdSeconds) {
        status = 'BREACHED';

        const periodsBreached = Math.floor(
          breachDurationSeconds / sloConfig.breachThresholdSeconds
        );

        let severityMultiplier = 1;
        if (breachType === 'both') {
          severityMultiplier = 2;
        } else if (breachType === 'availability') {
          const gap = sloConfig.minUptimePercent - metrics.uptimePercent;
          severityMultiplier = 1 + gap / 10;
        } else {
          const latencyOverage = metrics.p99LatencyMs / sloConfig.maxLatencyP99Ms;
          severityMultiplier = Math.min(2, latencyOverage);
        }

        recommendedCompensation = Math.min(
          10,
          Math.round(periodsBreached * severityMultiplier * 10) / 10
        );
      } else {
        status = 'WARN';
      }
    } else {
      storage.setBreachStartTime(now);
      status = 'WARN';
    }
  } else {
    storage.clearBreachStartTime();
  }

  return {
    status,
    breachType,
    breachDurationSeconds,
    recommendedCompensation,
  };
}

// Tests
describe('SLA Evaluation Logic', () => {
  let storage: MockStorage;
  const defaultSloConfig = {
    maxLatencyP99Ms: 300,
    minUptimePercent: 99.9,
    breachThresholdSeconds: 300,
  };

  beforeEach(() => {
    storage = new MockStorage();
  });

  describe('Healthy Service', () => {
    it('should return OK status when all metrics are within SLO', () => {
      // Add healthy probe results
      for (let i = 0; i < 10; i++) {
        storage.addProbeResult({ latencyMs: 100, ok: true });
      }

      const result = evaluateSla(storage, defaultSloConfig);

      expect(result.status).toBe('OK');
      expect(result.breachType).toBeUndefined();
      expect(result.recommendedCompensation).toBe(0);
    });
  });

  describe('Latency Breach', () => {
    it('should detect latency breach and return WARN initially', () => {
      // Add slow probe results
      for (let i = 0; i < 10; i++) {
        storage.addProbeResult({ latencyMs: 500, ok: true });
      }

      const result = evaluateSla(storage, defaultSloConfig);

      expect(result.status).toBe('WARN');
      expect(result.breachType).toBe('latency');
    });

    it('should return BREACHED after threshold duration', () => {
      for (let i = 0; i < 10; i++) {
        storage.addProbeResult({ latencyMs: 500, ok: true });
      }

      // Set breach start time in the past
      storage.setBreachStartTime(Date.now() - 400000); // 400 seconds ago

      const result = evaluateSla(storage, defaultSloConfig);

      expect(result.status).toBe('BREACHED');
      expect(result.breachType).toBe('latency');
      expect(result.recommendedCompensation).toBeGreaterThan(0);
      expect(result.recommendedCompensation).toBeLessThanOrEqual(10);
    });
  });

  describe('Availability Breach', () => {
    it('should detect availability breach', () => {
      // Add mostly failed probe results
      for (let i = 0; i < 10; i++) {
        storage.addProbeResult({ latencyMs: 100, ok: i < 5 }); // 50% failure
      }

      const result = evaluateSla(storage, defaultSloConfig);

      expect(result.status).toBe('WARN');
      expect(result.breachType).toBe('availability');
    });
  });

  describe('Combined Breach', () => {
    it('should detect both latency and availability breach', () => {
      // Add slow AND failing probe results
      for (let i = 0; i < 10; i++) {
        storage.addProbeResult({ latencyMs: 500, ok: i < 5 });
      }

      const result = evaluateSla(storage, defaultSloConfig);

      expect(result.status).toBe('WARN');
      expect(result.breachType).toBe('both');
    });

    it('should calculate higher compensation for combined breach', () => {
      for (let i = 0; i < 10; i++) {
        storage.addProbeResult({ latencyMs: 500, ok: i < 5 });
      }

      storage.setBreachStartTime(Date.now() - 400000);

      const result = evaluateSla(storage, defaultSloConfig);

      expect(result.status).toBe('BREACHED');
      expect(result.breachType).toBe('both');
      // Combined breaches should have higher compensation
      expect(result.recommendedCompensation).toBeGreaterThan(1);
    });
  });

  describe('Recovery', () => {
    it('should clear breach tracking when service recovers', () => {
      // First, establish a breach
      for (let i = 0; i < 10; i++) {
        storage.addProbeResult({ latencyMs: 500, ok: true });
      }
      storage.setBreachStartTime(Date.now());

      // Then, service recovers
      storage.reset();
      for (let i = 0; i < 10; i++) {
        storage.addProbeResult({ latencyMs: 100, ok: true });
      }

      const result = evaluateSla(storage, defaultSloConfig);

      expect(result.status).toBe('OK');
      expect(storage.getBreachStartTime()).toBeNull();
    });
  });

  describe('Compensation Calculation', () => {
    it('should cap compensation at 10%', () => {
      for (let i = 0; i < 10; i++) {
        storage.addProbeResult({ latencyMs: 1000, ok: false }); // Very bad
      }

      // Very long breach
      storage.setBreachStartTime(Date.now() - 3600000); // 1 hour ago

      const result = evaluateSla(storage, defaultSloConfig);

      expect(result.recommendedCompensation).toBe(10);
    });

    it('should scale compensation with breach duration', () => {
      for (let i = 0; i < 10; i++) {
        storage.addProbeResult({ latencyMs: 400, ok: true });
      }

      // 1 threshold period
      storage.setBreachStartTime(Date.now() - 350000);
      const result1 = evaluateSla(storage, defaultSloConfig);

      storage.setBreachStartTime(Date.now() - 700000); // 2 threshold periods
      const result2 = evaluateSla(storage, defaultSloConfig);

      expect(result2.recommendedCompensation).toBeGreaterThan(
        result1.recommendedCompensation
      );
    });
  });
});
