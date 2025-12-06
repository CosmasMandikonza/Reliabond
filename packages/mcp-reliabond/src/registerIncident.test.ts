// ===========================================
// TESTS: register_incident_and_payout
// ===========================================
//
// Tests for the incident registration and payout tool.
// Uses Vitest for testing with mocked storage and payout execution.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  registerIncidentAndPayout, 
  calculatePayoutAmount,
  executeThirdwebPayout,
  postToEdenlayer,
  type PayoutEnv 
} from './tools/registerIncident';
import { storage } from './storage/kvStore';
import type { Service, Incident } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

// Mock the storage module
vi.mock('./storage/kvStore', () => ({
  storage: {
    getService: vi.fn(),
    addIncident: vi.fn(),
    updateIncident: vi.fn(),
    updateService: vi.fn(),
    getDemoAffectedUsers: vi.fn(),
    clearBreachStartTime: vi.fn(),
  },
  DEMO_ADDRESSES: {
    users: ['0x1234', '0x5678', '0x9abc'],
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

const mockService: Service = {
  id: 'svc_test123',
  name: 'Test Service',
  description: 'A test service',
  baseUrl: 'https://test.example.com',
  healthCheckUrl: 'https://test.example.com/health',
  owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  bondContractAddress: '0x1234567890AbcdEF1234567890aBcdef12345678',
  sloConfig: {
    maxLatencyP99Ms: 200,
    minUptimePercent: 99.9,
    checkIntervalSeconds: 30,
    breachThresholdSeconds: 300,
  },
  reliabilityScore: 98.5,
  status: 'BREACHED',
  lastCheckTime: Date.now(),
  createdAt: Date.now() - 86400000,
};

const mockAffectedUsers = [
  '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
  '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
  '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
];

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════

describe('registerIncidentAndPayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(storage.getService).mockResolvedValue(mockService);
    vi.mocked(storage.getDemoAffectedUsers).mockReturnValue(mockAffectedUsers);
    vi.mocked(storage.addIncident).mockResolvedValue(undefined);
    vi.mocked(storage.updateIncident).mockResolvedValue(undefined);
    vi.mocked(storage.updateService).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully register an incident with valid parameters', async () => {
    const params = {
      serviceId: 'svc_test123',
      breachType: 'latency' as const,
      breachDurationSeconds: 360,
      compensationPercent: 2.5,
      summary: 'Latency exceeded SLO for 6 minutes',
    };

    const result = await registerIncidentAndPayout(params);

    expect(result.success).toBe(true);
    expect(result.incident).toBeDefined();
    expect(result.incident.status).toBe('executed');
    expect(result.incident.breachType).toBe('latency');
    expect(result.incident.compensationPercent).toBe(2.5);
    expect(result.txHash).toBeDefined();
    expect(result.txHash).toMatch(/^0x/);
    
    // Verify storage was called correctly
    expect(storage.getService).toHaveBeenCalledWith('svc_test123');
    expect(storage.addIncident).toHaveBeenCalledTimes(1);
    expect(storage.updateIncident).toHaveBeenCalled();
    expect(storage.updateService).toHaveBeenCalled();
  });

  it('should throw error for service not found', async () => {
    vi.mocked(storage.getService).mockResolvedValue(null);

    const params = {
      serviceId: 'nonexistent_service',
      breachType: 'availability' as const,
      breachDurationSeconds: 600,
      compensationPercent: 5,
      summary: 'Service unavailable',
    };

    await expect(registerIncidentAndPayout(params)).rejects.toThrow(
      'Service not found: nonexistent_service'
    );
  });

  it('should throw error for compensation > 10%', async () => {
    const params = {
      serviceId: 'svc_test123',
      breachType: 'both' as const,
      breachDurationSeconds: 900,
      compensationPercent: 15, // Over limit
      summary: 'Major outage',
    };

    await expect(registerIncidentAndPayout(params)).rejects.toThrow(
      'Compensation must be between 0% and 10%'
    );
  });

  it('should throw error for negative compensation', async () => {
    const params = {
      serviceId: 'svc_test123',
      breachType: 'latency' as const,
      breachDurationSeconds: 300,
      compensationPercent: -1, // Negative
      summary: 'Test',
    };

    await expect(registerIncidentAndPayout(params)).rejects.toThrow(
      'Compensation must be between 0% and 10%'
    );
  });

  it('should handle availability breach type', async () => {
    const params = {
      serviceId: 'svc_test123',
      breachType: 'availability' as const,
      breachDurationSeconds: 450,
      compensationPercent: 3,
      summary: 'Service returned 5xx errors',
    };

    const result = await registerIncidentAndPayout(params);

    expect(result.success).toBe(true);
    expect(result.incident.breachType).toBe('availability');
  });

  it('should handle combined breach type', async () => {
    const params = {
      serviceId: 'svc_test123',
      breachType: 'both' as const,
      breachDurationSeconds: 720,
      compensationPercent: 5,
      summary: 'Multiple SLO violations',
    };

    const result = await registerIncidentAndPayout(params);

    expect(result.success).toBe(true);
    expect(result.incident.breachType).toBe('both');
  });

  it('should include all affected users in incident', async () => {
    const params = {
      serviceId: 'svc_test123',
      breachType: 'latency' as const,
      breachDurationSeconds: 300,
      compensationPercent: 1,
      summary: 'Minor latency issue',
    };

    const result = await registerIncidentAndPayout(params);

    expect(result.incident.affectedUsers).toEqual(mockAffectedUsers);
    expect(result.incident.affectedUsers.length).toBe(3);
  });

  it('should update service reliability score after payout', async () => {
    const params = {
      serviceId: 'svc_test123',
      breachType: 'latency' as const,
      breachDurationSeconds: 300,
      compensationPercent: 5,
      summary: 'Test',
    };

    await registerIncidentAndPayout(params);

    // Should reduce reliability score by penalty factor
    expect(storage.updateService).toHaveBeenCalledWith(
      'svc_test123',
      expect.objectContaining({
        status: 'WARN',
        reliabilityScore: expect.any(Number),
      })
    );
  });
});

describe('calculatePayoutAmount', () => {
  it('should calculate correct payout for 1% compensation with 3 users', () => {
    // 1 ETH bond = 1e18 wei
    // 1% = 0.01 ETH = 1e16 wei
    // Per user = 1e16 / 3 = 3333333333333333 wei
    const result = calculatePayoutAmount(1, 3);
    expect(result).toBe('3333333333333333');
  });

  it('should calculate correct payout for 5% compensation with 1 user', () => {
    // 5% of 1 ETH = 0.05 ETH = 5e16 wei
    const result = calculatePayoutAmount(5, 1);
    expect(result).toBe('50000000000000000');
  });

  it('should calculate correct payout for 10% compensation with 10 users', () => {
    // 10% of 1 ETH = 0.1 ETH = 1e17 wei
    // Per user = 1e17 / 10 = 1e16 wei
    const result = calculatePayoutAmount(10, 10);
    expect(result).toBe('10000000000000000');
  });

  it('should return 0 for 0 users', () => {
    const result = calculatePayoutAmount(5, 0);
    expect(result).toBe('0');
  });

  it('should handle fractional percentages', () => {
    // 2.5% of 1 ETH = 0.025 ETH = 2.5e16 wei
    // Per user with 2 users = 1.25e16 wei
    const result = calculatePayoutAmount(2.5, 2);
    expect(result).toBe('12500000000000000');
  });
});

describe('executeThirdwebPayout (simulated mode)', () => {
  it('should return simulated tx hash in demo mode', async () => {
    const mockIncident: Incident = {
      id: 'inc_test',
      serviceId: 'svc_test',
      serviceName: 'Test',
      createdAt: Date.now(),
      breachType: 'latency',
      breachDurationSeconds: 300,
      compensationPercent: 2,
      payoutAmountPerUser: '10000000000000000',
      affectedUsers: mockAffectedUsers,
      status: 'pending',
      summary: 'Test incident',
    };

    const txHash = await executeThirdwebPayout(
      mockIncident,
      '0x1234567890AbcdEF1234567890aBcdef12345678',
      {} // No Thirdweb credentials
    );

    expect(txHash).toMatch(/^0xdead/); // Simulated hashes start with 0xdead
    expect(txHash.length).toBe(66); // Standard tx hash length
  });
});

describe('postToEdenlayer (simulated mode)', () => {
  it('should return undefined when not configured', async () => {
    const mockIncident: Incident = {
      id: 'inc_test',
      serviceId: 'svc_test',
      serviceName: 'Test',
      createdAt: Date.now(),
      breachType: 'latency',
      breachDurationSeconds: 300,
      compensationPercent: 2,
      payoutAmountPerUser: '10000000000000000',
      affectedUsers: mockAffectedUsers,
      status: 'executed',
      txHash: '0xdeadbeef',
      summary: 'Test incident',
    };

    const mockServiceInfo = {
      name: 'Test Service',
      owner: '0x1234',
      bondContractAddress: '0x5678',
    };

    const result = await postToEdenlayer(
      mockIncident,
      mockServiceInfo,
      {} // No Edenlayer credentials
    );

    expect(result).toBeUndefined();
  });
});

describe('compensation validation', () => {
  beforeEach(() => {
    vi.mocked(storage.getService).mockResolvedValue(mockService);
    vi.mocked(storage.getDemoAffectedUsers).mockReturnValue(mockAffectedUsers);
  });

  it.each([
    [0, true],
    [1, true],
    [5, true],
    [10, true],
    [-1, false],
    [11, false],
    [100, false],
  ])('compensation %d should be valid: %s', async (percent, shouldSucceed) => {
    const params = {
      serviceId: 'svc_test123',
      breachType: 'latency' as const,
      breachDurationSeconds: 300,
      compensationPercent: percent,
      summary: 'Test',
    };

    if (shouldSucceed) {
      const result = await registerIncidentAndPayout(params);
      expect(result.success).toBe(true);
    } else {
      await expect(registerIncidentAndPayout(params)).rejects.toThrow(
        'Compensation must be between 0% and 10%'
      );
    }
  });
});
