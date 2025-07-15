/**
 * Integration tests for DamnVulnerableInterpreter PY
 * These tests verify the package works as a complete system
 */

import {
    PythonInterpreter,
    PythonLinter,
    createInterpreter,
    createUnsafeInterpreter,
    createQuickInterpreter,
    TEST_SNIPPETS,
    checkPythonAvailability,
    VERSION,
    SECURITY_WARNING
} from '../src/index';
import { testUtils } from './setup';

describe('Integration Tests', () => {

    describe('Package Exports', () => {
        it('should export all required classes and functions', () => {
            expect(PythonInterpreter).toBeDefined();
            expect(PythonLinter).toBeDefined();
            expect(createInterpreter).toBeDefined();
            expect(createUnsafeInterpreter).toBeDefined();
            expect(createQuickInterpreter).toBeDefined();
            expect(TEST_SNIPPETS).toBeDefined();
            expect(checkPythonAvailability).toBeDefined();
            expect(VERSION).toBeDefined();
            expect(SECURITY_WARNING).toBeDefined();
        });

        it('should provide version information', () => {
            expect(VERSION).toBe('1.0.0');
            expect(typeof VERSION).toBe('string');
        });

        it('should provide security warning', () => {
            expect(SECURITY_WARNING).toContain('SECURITY WARNING');
            expect(SECURITY_WARNING).toContain('educational purposes');
            expect(SECURITY_WARNING).toContain('DO NOT USE IN PRODUCTION');
            expect(SECURITY_WARNING).toHaveVulnerability();
        });
    });

    describe('End-to-End Workflows', () => {
        it('should complete safe Python execution workflow', async () => {
            // Check Python availability
            const pythonAvailable = await testUtils.withTimeout(checkPythonAvailability());

            if (!pythonAvailable) {
                console.log('Skipping test - Python not available');
                return;
            }

            // Create safe interpreter
            const interpreter = createInterpreter({
                timeout: 10000,
                maxOutputLines: 100
            });

            // Execute safe code
            const result = await testUtils.withTimeout(
                interpreter.executeCode(TEST_SNIPPETS.hello)
            );

            expect(result).toBeValidPythonResult();
            expect(result.success).toBe(true);
            expect(result.stdout).toContain('Hello, World!');

            interpreter.killAllProcesses();
        });

        it('should complete vulnerability demonstration workflow', async () => {
            // Create unsafe interpreter
            const unsafeInterpreter = createUnsafeInterpreter();

            // Execute dangerous code that would be blocked in safe mode
            const dangerousCode = `
import os
import sys
print("System information leak:")
print("Platform:", sys.platform)
print("Current directory:", os.getcwd())
print("Environment count:", len(os.environ))
      `;

            const result = await testUtils.withTimeout(
                unsafeInterpreter.executeCode(dangerousCode)
            );

            expect(result).toBeValidPythonResult();
            expect(result).toHaveVulnerability();

            if (result.success) {
                expect(result.stdout).toContain('System information leak');
            }

            unsafeInterpreter.killAllProcesses();
        });

        it('should demonstrate linting and execution pipeline', async () => {
            const linter = new PythonLinter();
            const interpreter = createInterpreter();

            const testCode = `
import os
print("Testing dangerous code")
exec('print("Dynamic execution")')
      `;

            // First, lint the code
            const lintResult = await testUtils.withTimeout(linter.lintCode(testCode));
            expect(lintResult.warnings.length).toBeGreaterThan(0);
            expect(lintResult.warnings.some(w => w.message.includes('os module'))).toBe(true);

            // Then, execute the code (should be sanitized)
            const execResult = await testUtils.withTimeout(interpreter.executeCode(testCode));
            expect(execResult).toBeValidPythonResult();

            interpreter.killAllProcesses();
        });

        it('should handle streaming execution workflow', (done) => {
            const interpreter = createQuickInterpreter('testing');
            const outputs: string[] = [];

            const streamingCode = `
import time
for i in range(3):
    print(f"Processing step {i + 1}")
    time.sleep(0.1)
print("Workflow complete!")
      `;

            // Set up event listeners
            interpreter.on('data', (output) => {
                outputs.push(output.data);
            });

            interpreter.on('complete', (result) => {
                expect(result).toBeValidPythonResult();
                expect(result.success).toBe(true);
                expect(outputs.length).toBeGreaterThan(0);
                expect(outputs.join('')).toContain('Processing step');
                expect(outputs.join('')).toContain('Workflow complete');

                interpreter.killAllProcesses();
                done();
            });

            interpreter.on('error', (error) => {
                interpreter.killAllProcesses();
                done(error);
            });

            // Execute with streaming
            interpreter.executeCode(streamingCode, { stream: true });
        });
    });

    describe('Security Demonstration Scenarios', () => {
        it('should demonstrate command injection vulnerability', async () => {
            const unsafeInterpreter = createUnsafeInterpreter();

            const maliciousCode = `
import subprocess
import os

# VULNERABILITY: Command execution through subprocess
try:
    result = subprocess.run(['echo', 'Command injection successful'], 
                          capture_output=True, text=True)
    print("Command output:", result.stdout.strip())
except Exception as e:
    print("Command blocked or failed:", str(e))

# VULNERABILITY: Environment variable exposure  
print("Environment variables:")
for key in list(os.environ.keys())[:3]:
    print(f"  {key}: {os.environ[key][:20]}...")
      `;

            const result = await testUtils.withTimeout(
                unsafeInterpreter.executeCode(maliciousCode)
            );

            expect(result).toBeValidPythonResult();
            expect(result).toHaveVulnerability();

            unsafeInterpreter.killAllProcesses();
        });

        it('should demonstrate file system access vulnerability', async () => {
            const unsafeInterpreter = createUnsafeInterpreter();

            const fileAccessCode = `
import os
import tempfile

# VULNERABILITY: File system access
print("File system access demonstration:")
print("Current directory:", os.getcwd())
print("Temp directory:", tempfile.gettempdir())

# List current directory (potential information disclosure)
try:
    files = os.listdir('.')[:5]  # Limit to first 5 files
    print("Directory contents (first 5 items):")
    for file in files:
        print(f"  {file}")
except Exception as e:
    print("Directory access failed:", str(e))
      `;

            const result = await testUtils.withTimeout(
                unsafeInterpreter.executeCode(fileAccessCode)
            );

            expect(result).toBeValidPythonResult();
            expect(result).toHaveVulnerability();

            if (result.success) {
                expect(result.stdout).toContain('File system access demonstration');
            }

            unsafeInterpreter.killAllProcesses();
        });

        it('should demonstrate sanitization bypass vulnerability', async () => {
            const interpreter = createInterpreter(); // Safe interpreter

            const bypassCode = `
# VULNERABILITY: Weak sanitization can be bypassed
from os import getcwd as get_current_directory
import sys as system_module

print("Bypassing sanitization:")
print("Current directory via bypass:", get_current_directory())
print("Python version via bypass:", system_module.version[:20])

# Alternative import syntax to bypass simple regex
os_module = __import__('os')
print("Alternative import success")
      `;

            const result = await testUtils.withTimeout(interpreter.executeCode(bypassCode));

            expect(result).toBeValidPythonResult();
            expect(result).toHaveVulnerability();

            // The vulnerability is that bypasses may work
            if (result.success && result.stdout.includes('bypass')) {
                expect(result.stdout).toContain('Bypassing sanitization');
            }

            interpreter.killAllProcesses();
        });

        it('should demonstrate resource exhaustion vulnerability', async () => {
            const unsafeInterpreter = createUnsafeInterpreter();

            const resourceCode = `
import time

# VULNERABILITY: No resource limits in unsafe mode
print("Resource exhaustion test:")
print("Starting memory allocation...")

# Small allocation to avoid actually exhausting resources in tests
data = []
for i in range(1000):  # Keep small for testing
    data.append(f"Memory allocation {i}")

print(f"Allocated {len(data)} items")
print("Resource test complete")
      `;

            const result = await testUtils.withTimeout(
                unsafeInterpreter.executeCode(resourceCode),
                15000 // Longer timeout for this test
            );

            expect(result).toBeValidPythonResult();
            expect(result).toHaveVulnerability();

            if (result.success) {
                expect(result.stdout).toContain('Resource exhaustion test');
            }

            unsafeInterpreter.killAllProcesses();
        });
    });

    describe('Educational Security Scenarios', () => {
        it('should demonstrate proper vs improper input validation', async () => {
            const safeInterpreter = createInterpreter();
            const unsafeInterpreter = createUnsafeInterpreter();

            const testInput = `
# Test input validation
user_input = "'; import os; os.system('echo pwned'); #"
print(f"Processing user input: {user_input}")

# This would be dangerous if user_input was actually executed
try:
    # Safe: Just printing the input
    print("Input received and logged safely")
except Exception as e:
    print(f"Error: {e}")
      `;

            // Safe execution
            const safeResult = await testUtils.withTimeout(
                safeInterpreter.executeCode(testInput)
            );

            // Unsafe execution  
            const unsafeResult = await testUtils.withTimeout(
                unsafeInterpreter.executeCode(testInput)
            );

            expect(safeResult).toBeValidPythonResult();
            expect(unsafeResult).toBeValidPythonResult();
            expect(unsafeResult).toHaveVulnerability();

            safeInterpreter.killAllProcesses();
            unsafeInterpreter.killAllProcesses();
        });

        it('should demonstrate secure vs insecure configuration', () => {
            const configurations = [
                { name: 'safe', interpreter: createQuickInterpreter('safe') },
                { name: 'testing', interpreter: createQuickInterpreter('testing') },
                { name: 'educational', interpreter: createQuickInterpreter('educational') },
                { name: 'dangerous', interpreter: createQuickInterpreter('dangerous') }
            ];

            configurations.forEach(({ name, interpreter }) => {
                const config = interpreter.getConfig();

                if (name === 'safe' || name === 'testing') {
                    expect(config.allowUnsafeOperations).toBe(false);
                    expect(config.enableLinting).toBe(true);
                } else {
                    expect(config.allowUnsafeOperations).toBe(true);
                    expect(config).toHaveVulnerability();
                }

                interpreter.killAllProcesses();
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle multiple simultaneous interpreters', async () => {
            const interpreters = Array.from({ length: 3 }, (_, i) =>
                createQuickInterpreter('testing')
            );

            const promises = interpreters.map((interpreter, i) =>
                testUtils.withTimeout(
                    interpreter.executeCode(`print("Interpreter ${i} running")`)
                )
            );

            const results = await Promise.all(promises);

            results.forEach((result, i) => {
                expect(result).toBeValidPythonResult();
                if (result.success) {
                    expect(result.stdout).toContain(`Interpreter ${i} running`);
                }
            });

            interpreters.forEach(interpreter => interpreter.killAllProcesses());
        });

        it('should handle interpreter lifecycle properly', async () => {
            const interpreter = createInterpreter();

            // Execute code
            const result1 = await testUtils.withTimeout(
                interpreter.executeCode(TEST_SNIPPETS.hello)
            );

            // Update configuration
            interpreter.updateConfig({ timeout: 5000 });

            // Execute more code
            const result2 = await testUtils.withTimeout(
                interpreter.executeCode(TEST_SNIPPETS.math)
            );

            // Kill processes
            interpreter.killAllProcesses();

            expect(result1).toBeValidPythonResult();
            expect(result2).toBeValidPythonResult();
        });

        it('should handle package import and usage', () => {
            // Test that the package can be imported and used as intended
            expect(() => {
                const interpreter = createInterpreter();
                const config = interpreter.getConfig();
                interpreter.killAllProcesses();
                return config;
            }).not.toThrow();

            expect(() => {
                const linter = new PythonLinter();
                return linter;
            }).not.toThrow();
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle rapid successive executions', async () => {
            const interpreter = createQuickInterpreter('testing');
            const executions = 5; // Keep reasonable for CI

            const promises = Array.from({ length: executions }, (_, i) =>
                testUtils.withTimeout(
                    interpreter.executeCode(`print("Execution ${i}")`),
                    5000
                )
            );

            const results = await Promise.all(promises);

            results.forEach((result, i) => {
                expect(result).toBeValidPythonResult();
                if (result.success) {
                    expect(result.stdout).toContain(`Execution ${i}`);
                }
            });

            interpreter.killAllProcesses();
        });

        it('should cleanup resources properly', async () => {
            const interpreter = createInterpreter();

            // Execute code that creates temporary files
            await testUtils.withTimeout(
                interpreter.executeCode('print("Resource test")')
            );

            // Force cleanup
            interpreter.killAllProcesses();

            // Should be able to create new interpreter after cleanup
            const newInterpreter = createInterpreter();
            const result = await testUtils.withTimeout(
                newInterpreter.executeCode('print("After cleanup")')
            );

            expect(result).toBeValidPythonResult();
            newInterpreter.killAllProcesses();
        });
    });
}); 