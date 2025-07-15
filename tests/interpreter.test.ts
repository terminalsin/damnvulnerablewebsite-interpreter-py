/**
 * Tests for PythonInterpreter class
 * These tests cover both safe and unsafe functionality, including educational vulnerabilities
 */

import { PythonInterpreter } from '../src/interpreter';
import { InterpreterConfig, ExecutionOptions, UnsafeExecutionContext } from '../src/types';
import { testUtils } from './setup';

describe('PythonInterpreter', () => {
    let interpreter: PythonInterpreter;

    beforeEach(() => {
        interpreter = new PythonInterpreter();
    });

    afterEach(() => {
        interpreter.killAllProcesses();
    });

    describe('Constructor and Configuration', () => {
        it('should create interpreter with default configuration', () => {
            const config = interpreter.getConfig();
            expect(config.pythonPath).toBe('python3');
            expect(config.timeout).toBe(30000);
            expect(config.enableLinting).toBe(true);
            expect(config.allowUnsafeOperations).toBe(false);
        });

        it('should create interpreter with custom configuration', () => {
            const customConfig: InterpreterConfig = {
                pythonPath: 'python',
                timeout: 10000,
                maxOutputLines: 500,
                enableLinting: false,
                allowUnsafeOperations: true
            };

            const customInterpreter = new PythonInterpreter(customConfig);
            const config = customInterpreter.getConfig();

            expect(config.pythonPath).toBe('python');
            expect(config.timeout).toBe(10000);
            expect(config.maxOutputLines).toBe(500);
            expect(config.enableLinting).toBe(false);
            expect(config.allowUnsafeOperations).toBe(true);

            customInterpreter.killAllProcesses();
        });

        it('should update configuration at runtime (vulnerability test)', () => {
            const originalConfig = interpreter.getConfig();
            expect(originalConfig.allowUnsafeOperations).toBe(false);

            // VULNERABILITY: Configuration can be changed at runtime without validation
            interpreter.updateConfig({ allowUnsafeOperations: true });

            const updatedConfig = interpreter.getConfig();
            expect(updatedConfig.allowUnsafeOperations).toBe(true);
            expect(updatedConfig).toHaveVulnerability();
        });
    });

    describe('Basic Code Execution', () => {
        it('should execute simple Python code successfully', async () => {
            const code = testUtils.createTestCode('simple');
            const result = await testUtils.withTimeout(interpreter.executeCode(code));

            expect(result).toBeValidPythonResult();
            expect(result.success).toBe(true);
            expect(result.stdout.trim()).toBe('test output');
            expect(result.stderr).toBe('');
            expect(result.exitCode).toBe(0);
            expect(result.executionTime).toBeGreaterThan(0);
        });

        it('should handle Python code with errors', async () => {
            const code = testUtils.createTestCode('error');
            const result = await testUtils.withTimeout(interpreter.executeCode(code));

            expect(result).toBeValidPythonResult();
            expect(result.success).toBe(false);
            expect(result.stdout).toBe('');
            expect(result.stderr).toContain('NameError');
            expect(result.exitCode).not.toBe(0);
        });

        it('should execute code with math operations', async () => {
            const code = `
import math
result = math.sqrt(16)
print(f"Result: {result}")
      `;

            const result = await testUtils.withTimeout(interpreter.executeCode(code));

            expect(result).toBeValidPythonResult();
            expect(result.success).toBe(true);
            expect(result.stdout).toContain('Result: 4.0');
        });

        it('should handle timeout correctly', async () => {
            const longRunningCode = `
import time
time.sleep(20)  # This should timeout
print("This should not print")
      `;

            const options: ExecutionOptions = { timeout: 1000 }; // 1 second timeout
            const result = await testUtils.withTimeout(
                interpreter.executeCode(longRunningCode, options),
                5000
            );

            expect(result).toBeValidPythonResult();
            expect(result.success).toBe(false);
        });
    });

    describe('Linting and Security Checks', () => {
        it('should block dangerous code when linting is enabled', async () => {
            const dangerousCode = `
import os
import subprocess
print("Dangerous operations")
exec('print("exec called")')
      `;

            const result = await testUtils.withTimeout(interpreter.executeCode(dangerousCode));

            // With linting enabled, some dangerous operations should be sanitized
            expect(result).toBeValidPythonResult();
            if (result.success) {
                // Code was sanitized and executed safely
                expect(result.stdout).toContain('Dangerous operations');
            } else {
                // Code was blocked by linting
                expect(result.stderr).toBeTruthy();
            }
        });

        it('should bypass linting when disabled (vulnerability test)', async () => {
            const unsafeInterpreter = new PythonInterpreter({
                enableLinting: false,
                allowUnsafeOperations: true
            });

            const dangerousCode = testUtils.createTestCode('dangerous');
            const result = await testUtils.withTimeout(unsafeInterpreter.executeCode(dangerousCode));

            expect(result).toBeValidPythonResult();
            expect(result).toHaveVulnerability();

            unsafeInterpreter.killAllProcesses();
        });

        it('should sanitize code weakly (vulnerability test)', async () => {
            const code = `
# Try to bypass sanitization
import os as operating_system
from subprocess import run
print("Sanitization bypass attempt")
      `;

            const result = await testUtils.withTimeout(interpreter.executeCode(code));

            expect(result).toBeValidPythonResult();
            // VULNERABILITY: Weak sanitization can be bypassed
            if (result.success && result.stdout.includes('bypass')) {
                expect(result).toHaveVulnerability();
            }
        });
    });

    describe('Streaming Execution', () => {
        it('should support streaming output', (done) => {
            const code = testUtils.createTestCode('long');
            const outputs: string[] = [];

            interpreter.on('data', (output) => {
                outputs.push(output.data);
            });

            interpreter.on('complete', (result) => {
                expect(result).toBeValidPythonResult();
                expect(result.success).toBe(true);
                expect(outputs.length).toBeGreaterThan(0);
                expect(outputs.join('')).toContain('step');
                done();
            });

            interpreter.on('error', done);

            interpreter.executeCode(code, { stream: true });
        });

        it('should emit timeout event on long-running code', (done) => {
            const longCode = `
import time
time.sleep(10)
      `;

            interpreter.on('timeout', () => {
                expect(true).toBe(true); // Test passes if timeout is emitted
                done();
            });

            interpreter.executeCode(longCode, { stream: true, timeout: 1000 });
        });
    });

    describe('Unsafe Execution (Vulnerability Tests)', () => {
        it('should execute code unsafely when requested', async () => {
            const dangerousCode = `
import os
import sys
print("Environment variables:")
for key in list(os.environ.keys())[:3]:
    print(f"  {key}")
print("Python version:", sys.version)
      `;

            const unsafeContext: UnsafeExecutionContext = {
                allowShellAccess: true,
                allowFileSystemAccess: true,
                bypassSandbox: true
            };

            const result = await testUtils.withTimeout(
                interpreter.executeUnsafe(dangerousCode, unsafeContext)
            );

            expect(result).toBeValidPythonResult();
            expect(result).toHaveVulnerability();
            expect(result.stdout).toContain('Environment variables');
        });

        it('should expose system information in unsafe mode (vulnerability test)', async () => {
            const infoCode = `
import os
import platform
print("System info leak:")
print("Platform:", platform.system())
print("Current dir:", os.getcwd())
      `;

            const result = await testUtils.withTimeout(
                interpreter.executeUnsafe(infoCode, { allowFileSystemAccess: true })
            );

            expect(result).toBeValidPythonResult();
            expect(result).toHaveVulnerability();
            expect(result.stdout).toContain('System info leak');
        });

        it('should bypass timeout in unsafe mode (vulnerability test)', async () => {
            const timeoutBypassCode = `
import time
print("Starting long operation...")
time.sleep(2)
print("Operation completed despite timeout!")
      `;

            const result = await testUtils.withTimeout(
                interpreter.executeUnsafe(timeoutBypassCode, { bypassSandbox: true }),
                5000
            );

            expect(result).toBeValidPythonResult();
            expect(result).toHaveVulnerability();
            if (result.success) {
                expect(result.stdout).toContain('Operation completed');
            }
        });
    });

    describe('Environment Variable Injection (Vulnerability Tests)', () => {
        it('should be vulnerable to environment variable injection', async () => {
            const code = `
import os
print("Injected env vars:")
if 'UNSAFE_MODE' in os.environ:
    print("UNSAFE_MODE:", os.environ['UNSAFE_MODE'])
if 'PYTHON_INTERPRETER_CONFIG' in os.environ:
    print("Config exposed!")
      `;

            const options: ExecutionOptions = {
                env: {
                    'MALICIOUS_VAR': 'injected_value',
                    'UNSAFE_MODE': 'true'
                }
            };

            const result = await testUtils.withTimeout(interpreter.executeCode(code, options));

            expect(result).toBeValidPythonResult();
            expect(result).toHaveVulnerability();
            if (result.stdout.includes('UNSAFE_MODE') || result.stdout.includes('Config exposed')) {
                expect(result.stdout).toContain('Injected env vars');
            }
        });
    });

    describe('Resource Management', () => {
        it('should track active processes', async () => {
            const code = testUtils.createTestCode('simple');

            // Start execution but don't wait
            const promise = interpreter.executeCode(code);

            // Kill all processes
            interpreter.killAllProcesses();

            // Execution should still complete (might fail due to process kill)
            const result = await promise.catch(() => ({
                success: false,
                stdout: '',
                stderr: 'Process killed',
                exitCode: -1,
                executionTime: 0
            }));

            expect(result).toBeValidPythonResult();
        });

        it('should handle multiple concurrent executions', async () => {
            const promises = Array.from({ length: 3 }, (_, i) =>
                interpreter.executeCode(`print("Execution ${i}")`)
            );

            const results = await Promise.all(promises.map(p =>
                testUtils.withTimeout(p, 10000)
            ));

            results.forEach((result, i) => {
                expect(result).toBeValidPythonResult();
                if (result.success) {
                    expect(result.stdout).toContain(`Execution ${i}`);
                }
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid Python syntax', async () => {
            const invalidCode = `
print("Missing closing quote
invalid syntax here
      `;

            const result = await testUtils.withTimeout(interpreter.executeCode(invalidCode));

            expect(result).toBeValidPythonResult();
            expect(result.success).toBe(false);
            expect(result.stderr).toContain('SyntaxError');
        });

        it('should handle execution failures gracefully', async () => {
            const interpreter = new PythonInterpreter({ pythonPath: 'invalid_python_path' });
            const code = testUtils.createTestCode('simple');

            const result = await testUtils.withTimeout(interpreter.executeCode(code));

            expect(result).toBeValidPythonResult();
            expect(result.success).toBe(false);

            interpreter.killAllProcesses();
        });
    });
}); 