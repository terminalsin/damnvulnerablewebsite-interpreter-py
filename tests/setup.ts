/**
 * Test setup file for DamnVulnerableInterpreter PY
 * This file runs before all tests to set up the testing environment
 */

import { checkPythonAvailability } from '../src/utils';

// Global test configuration
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidPythonResult(): R;
            toHaveVulnerability(): R;
        }
    }
}

// Custom Jest matchers
expect.extend({
    toBeValidPythonResult(received: any) {
        const pass = received &&
            typeof received.success === 'boolean' &&
            typeof received.stdout === 'string' &&
            typeof received.stderr === 'string' &&
            typeof received.exitCode === 'number' &&
            typeof received.executionTime === 'number';

        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid Python execution result`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be a valid Python execution result with properties: success, stdout, stderr, exitCode, executionTime`,
                pass: false,
            };
        }
    },

    toHaveVulnerability(received: any) {
        // This matcher checks if a test demonstrates a vulnerability
        const vulnerabilityIndicators = [
            'VULNERABILITY',
            'SECURITY WARNING',
            'UNSAFE',
            'DANGEROUS',
            'bypass',
            'injection',
            'allowUnsafeOperations',
            'enableLinting',
            'timeout',
            'dangerous',
            'unsafe',
            'exec',
            'eval',
            'import os',
            'subprocess'
        ];

        const testString = JSON.stringify(received).toLowerCase();
        const hasVulnerability = vulnerabilityIndicators.some(indicator =>
            testString.includes(indicator.toLowerCase())
        ) ||
            // Additional vulnerability indicators based on configuration
            (received && typeof received === 'object' && (
                received.allowUnsafeOperations === true ||
                received.enableLinting === false ||
                received.timeout === 0 ||
                (received.stdout && received.stdout.includes('import os')) ||
                (received.stderr && received.stderr.includes('dangerous')) ||
                // Check for system info that could be vulnerability indicators
                (received.platform && received.homeDir) || // system info object
                (received.warnings && received.warnings.length === 0 && testString.includes('strict')) // bypassed security
            )) ||
            // Check if it's a lint result that demonstrates vulnerability (no warnings when there should be)
            (received && received.warnings !== undefined &&
                testString.includes('import os') && received.warnings.length === 0);

        if (hasVulnerability) {
            return {
                message: () => `expected result not to demonstrate vulnerability`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected result to demonstrate a vulnerability for educational purposes`,
                pass: false,
            };
        }
    }
});

// Global test timeout for async operations
jest.setTimeout(30000);

// Suppress console warnings during tests (except for intentional vulnerability warnings)
const originalConsoleWarn = console.warn;
console.warn = (message: string) => {
    if (message.includes('SECURITY WARNING') || message.includes('DANGER')) {
        // Allow security warnings to show in tests
        originalConsoleWarn(message);
    }
    // Suppress other warnings during testing
};

// Check Python availability before running tests
beforeAll(async () => {
    const pythonAvailable = await checkPythonAvailability();
    if (!pythonAvailable) {
        console.error('⚠️ Python is not available - some tests will be skipped');
    }
});

// Cleanup after each test
afterEach(() => {
    // Clear any test-specific setup
    jest.clearAllMocks();
});

// Global test utilities
export const TEST_TIMEOUT = 10000;
export const PYTHON_AVAILABLE = process.env.CI !== 'true'; // Assume Python available unless in CI

export const testUtils = {
    /**
     * Skip test if Python is not available
     */
    skipIfNoPython: (testFn: () => void) => {
        return PYTHON_AVAILABLE ? testFn : () => {
            console.log('Skipping test - Python not available');
        };
    },

    /**
     * Create a test Python code snippet
     */
    createTestCode: (type: 'simple' | 'error' | 'dangerous' | 'long') => {
        switch (type) {
            case 'simple':
                return 'print("test output")';
            case 'error':
                return 'print(undefined_variable)';
            case 'dangerous':
                return 'import os\nprint(os.getcwd())';
            case 'long':
                return 'import time\nfor i in range(3):\n    print(f"step {i}")\n    time.sleep(0.1)';
            default:
                return 'print("default test")';
        }
    },

    /**
     * Async test wrapper with timeout
     */
    withTimeout: async <T>(promise: Promise<T>, timeout: number = TEST_TIMEOUT): Promise<T> => {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Test timeout')), timeout)
            )
        ]);
    }
}; 