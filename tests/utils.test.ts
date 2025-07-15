/**
 * Tests for utility functions
 * These tests verify utility functionality and helper methods
 */

import {
    createInterpreter,
    createUnsafeInterpreter,
    createQuickInterpreter,
    checkPythonAvailability,
    getSystemInfo,
    createUnsafeContext,
    TEST_SNIPPETS
} from '../src/utils';
import { PythonInterpreter } from '../src/interpreter';
import { testUtils } from './setup';

describe('Utility Functions', () => {

    describe('createInterpreter', () => {
        it('should create a safe interpreter with default configuration', () => {
            const interpreter = createInterpreter();
            const config = interpreter.getConfig();

            expect(interpreter).toBeInstanceOf(PythonInterpreter);
            expect(config.enableLinting).toBe(true);
            expect(config.allowUnsafeOperations).toBe(false);
            expect(config.timeout).toBe(30000);
            expect(config.maxOutputLines).toBe(1000);

            interpreter.killAllProcesses();
        });

        it('should create interpreter with custom configuration', () => {
            const customConfig = {
                timeout: 5000,
                maxOutputLines: 500,
                pythonPath: 'python'
            };

            const interpreter = createInterpreter(customConfig);
            const config = interpreter.getConfig();

            expect(config.timeout).toBe(5000);
            expect(config.maxOutputLines).toBe(500);
            expect(config.pythonPath).toBe('python');
            expect(config.enableLinting).toBe(true); // Should still be safe
            expect(config.allowUnsafeOperations).toBe(false); // Should still be safe

            interpreter.killAllProcesses();
        });

        it('should override unsafe settings to maintain safety', () => {
            const unsafeConfig = {
                enableLinting: false,
                allowUnsafeOperations: true
            };

            const interpreter = createInterpreter(unsafeConfig);
            const config = interpreter.getConfig();

            // createInterpreter should enforce safe defaults
            expect(config.enableLinting).toBe(true);
            expect(config.allowUnsafeOperations).toBe(false);

            interpreter.killAllProcesses();
        });
    });

    describe('createUnsafeInterpreter', () => {
        it('should create an unsafe interpreter with disabled security', () => {
            const interpreter = createUnsafeInterpreter();
            const config = interpreter.getConfig();

            expect(interpreter).toBeInstanceOf(PythonInterpreter);
            expect(config.enableLinting).toBe(false);
            expect(config.allowUnsafeOperations).toBe(true);
            expect(config.timeout).toBe(0); // No timeout
            expect(config.maxOutputLines).toBe(Number.MAX_SAFE_INTEGER);
            expect(config).toHaveVulnerability();

            interpreter.killAllProcesses();
        });

        it('should warn about unsafe configuration creation', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const interpreter = createUnsafeInterpreter();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('DANGER: Creating interpreter with unsafe configuration!')
            );

            consoleSpy.mockRestore();
            interpreter.killAllProcesses();
        });

        it('should allow custom configuration to override unsafe defaults', () => {
            const customConfig = {
                timeout: 5000,
                pythonPath: 'python'
            };

            const interpreter = createUnsafeInterpreter(customConfig);
            const config = interpreter.getConfig();

            expect(config.timeout).toBe(5000); // Should be overridden
            expect(config.pythonPath).toBe('python'); // Should be overridden
            expect(config.enableLinting).toBe(false); // Should remain unsafe
            expect(config.allowUnsafeOperations).toBe(true); // Should remain unsafe

            interpreter.killAllProcesses();
        });
    });

    describe('createQuickInterpreter', () => {
        it('should create safe preset interpreter', () => {
            const interpreter = createQuickInterpreter('safe');
            const config = interpreter.getConfig();

            expect(config.enableLinting).toBe(true);
            expect(config.allowUnsafeOperations).toBe(false);
            expect(config.timeout).toBe(10000);
            expect(config.maxOutputLines).toBe(100);

            interpreter.killAllProcesses();
        });

        it('should create testing preset interpreter', () => {
            const interpreter = createQuickInterpreter('testing');
            const config = interpreter.getConfig();

            expect(config.enableLinting).toBe(true);
            expect(config.allowUnsafeOperations).toBe(false);
            expect(config.timeout).toBe(60000);
            expect(config.maxOutputLines).toBe(5000);

            interpreter.killAllProcesses();
        });

        it('should create educational preset interpreter', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const interpreter = createQuickInterpreter('educational');
            const config = interpreter.getConfig();

            expect(config.enableLinting).toBe(true);
            expect(config.allowUnsafeOperations).toBe(true); // Unsafe for education
            expect(config.timeout).toBe(30000);
            expect(config.maxOutputLines).toBe(1000);
            expect(config).toHaveVulnerability();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Educational mode')
            );

            consoleSpy.mockRestore();
            interpreter.killAllProcesses();
        });

        it('should create dangerous preset interpreter', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const interpreter = createQuickInterpreter('dangerous');
            const config = interpreter.getConfig();

            expect(config.enableLinting).toBe(false);
            expect(config.allowUnsafeOperations).toBe(true);
            expect(config.timeout).toBe(0);
            expect(config.maxOutputLines).toBe(Number.MAX_SAFE_INTEGER);
            expect(config).toHaveVulnerability();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('DANGEROUS MODE')
            );

            consoleSpy.mockRestore();
            interpreter.killAllProcesses();
        });

        it('should allow custom configuration overrides', () => {
            const customConfig = {
                pythonPath: 'python',
                timeout: 15000
            };

            const interpreter = createQuickInterpreter('safe', customConfig);
            const config = interpreter.getConfig();

            expect(config.pythonPath).toBe('python');
            expect(config.timeout).toBe(15000);
            expect(config.enableLinting).toBe(true); // From preset
            expect(config.maxOutputLines).toBe(100); // From preset

            interpreter.killAllProcesses();
        });

        it('should throw error for unknown preset', () => {
            expect(() => {
                createQuickInterpreter('unknown' as any);
            }).toThrow('Unknown preset: unknown');
        });
    });

    describe('checkPythonAvailability', () => {
        it('should check default python3 availability', async () => {
            const isAvailable = await testUtils.withTimeout(checkPythonAvailability());
            expect(typeof isAvailable).toBe('boolean');
        });

        it('should check custom python path availability', async () => {
            const isAvailable = await testUtils.withTimeout(checkPythonAvailability('python'));
            expect(typeof isAvailable).toBe('boolean');
        });

        it('should return false for invalid python path', async () => {
            const isAvailable = await testUtils.withTimeout(
                checkPythonAvailability('definitely_not_python_executable')
            );
            expect(isAvailable).toBe(false);
        });

        it('should handle timeout gracefully', async () => {
            // This test ensures the function doesn't hang indefinitely
            const result = await testUtils.withTimeout(
                checkPythonAvailability(),
                5000
            );
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getSystemInfo', () => {
        it('should return system information object', () => {
            const info = getSystemInfo();

            expect(info).toEqual(
                expect.objectContaining({
                    platform: expect.any(String),
                    arch: expect.any(String),
                    nodeVersion: expect.any(String),
                    tempDir: expect.any(String),
                    homeDir: expect.any(String),
                    cwd: expect.any(String)
                })
            );
        });

        it('should return valid platform information', () => {
            const info = getSystemInfo();

            expect(['win32', 'darwin', 'linux', 'freebsd', 'openbsd', 'sunos'])
                .toContain(info.platform);
            expect(['x64', 'arm64', 'ia32', 'arm', 's390x', 'ppc64'])
                .toContain(info.arch);
        });

        it('should return current working directory', () => {
            const info = getSystemInfo();
            expect(info.cwd).toBe(process.cwd());
        });

        it('should expose system information (vulnerability test)', () => {
            const info = getSystemInfo();

            expect(info).toHaveVulnerability();
            // VULNERABILITY: Exposing system information could be used for reconnaissance
            expect(info.homeDir).toBeTruthy();
            expect(info.tempDir).toBeTruthy();
        });
    });

    describe('createUnsafeContext', () => {
        it('should create default unsafe context', () => {
            const context = createUnsafeContext();

            expect(context).toEqual({
                allowShellAccess: true,
                allowFileSystemAccess: true,
                allowNetworkAccess: true,
                allowImportAll: true,
                bypassSandbox: true
            });
            expect(context).toHaveVulnerability();
        });

        it('should allow partial overrides', () => {
            const context = createUnsafeContext({
                allowShellAccess: false,
                allowNetworkAccess: false
            });

            expect(context).toEqual({
                allowShellAccess: false,
                allowFileSystemAccess: true,
                allowNetworkAccess: false,
                allowImportAll: true,
                bypassSandbox: true
            });
            expect(context).toHaveVulnerability();
        });

        it('should create completely disabled context when overridden', () => {
            const context = createUnsafeContext({
                allowShellAccess: false,
                allowFileSystemAccess: false,
                allowNetworkAccess: false,
                allowImportAll: false,
                bypassSandbox: false
            });

            expect(context).toEqual({
                allowShellAccess: false,
                allowFileSystemAccess: false,
                allowNetworkAccess: false,
                allowImportAll: false,
                bypassSandbox: false
            });
        });
    });

    describe('TEST_SNIPPETS', () => {
        it('should provide basic test snippets', () => {
            expect(TEST_SNIPPETS.hello).toBe('print("Hello, World!")');
            expect(TEST_SNIPPETS.math).toContain('import math');
            expect(TEST_SNIPPETS.loop).toContain('for i in range(5)');
            expect(TEST_SNIPPETS.error).toContain('undefined_variable');
        });

        it('should provide dangerous test snippets', () => {
            expect(TEST_SNIPPETS.dangerous).toEqual(
                expect.objectContaining({
                    fileRead: expect.stringContaining('import os'),
                    subprocess: expect.stringContaining('import subprocess'),
                    exec: expect.stringContaining('exec('),
                    eval: expect.stringContaining('eval(')
                })
            );
            expect(TEST_SNIPPETS.dangerous).toHaveVulnerability();
        });

        it('should have valid Python syntax in all snippets', async () => {
            const interpreter = createInterpreter();

            // Test basic snippets
            for (const [name, code] of Object.entries(TEST_SNIPPETS)) {
                if (typeof code === 'string') {
                    const result = await testUtils.withTimeout(interpreter.executeCode(code));
                    expect(result).toBeValidPythonResult();

                    if (name === 'error') {
                        expect(result.success).toBe(false); // Error snippet should fail
                    } else {
                        // Other snippets should have valid syntax (might be blocked by security)
                        expect(result.exitCode).toBeDefined();
                    }
                }
            }

            interpreter.killAllProcesses();
        });

        it('should execute dangerous snippets in unsafe mode', async () => {
            const interpreter = createUnsafeInterpreter();

            for (const [name, code] of Object.entries(TEST_SNIPPETS.dangerous)) {
                const result = await testUtils.withTimeout(interpreter.executeCode(code));
                expect(result).toBeValidPythonResult();
                expect(result).toHaveVulnerability();
            }

            interpreter.killAllProcesses();
        });
    });

    describe('Integration Tests', () => {
        it('should work together to create different interpreter types', async () => {
            const safe = createInterpreter();
            const educational = createQuickInterpreter('educational');
            const dangerous = createUnsafeInterpreter();

            const code = TEST_SNIPPETS.dangerous.fileRead;

            // Safe interpreter should block or sanitize
            const safeResult = await testUtils.withTimeout(safe.executeCode(code));

            // Educational might allow with warnings
            const eduResult = await testUtils.withTimeout(educational.executeCode(code));

            // Dangerous should definitely allow
            const dangerousResult = await testUtils.withTimeout(dangerous.executeCode(code));

            expect(safeResult).toBeValidPythonResult();
            expect(eduResult).toBeValidPythonResult();
            expect(dangerousResult).toBeValidPythonResult();
            expect(dangerousResult).toHaveVulnerability();

            safe.killAllProcesses();
            educational.killAllProcesses();
            dangerous.killAllProcesses();
        });

        it('should demonstrate escalating vulnerability levels', () => {
            const safe = createQuickInterpreter('safe');
            const testing = createQuickInterpreter('testing');
            const educational = createQuickInterpreter('educational');
            const dangerous = createQuickInterpreter('dangerous');

            const configs = [
                safe.getConfig(),
                testing.getConfig(),
                educational.getConfig(),
                dangerous.getConfig()
            ];

            // Should show escalating vulnerability levels
            expect(configs[0].allowUnsafeOperations).toBe(false); // safe
            expect(configs[1].allowUnsafeOperations).toBe(false); // testing
            expect(configs[2].allowUnsafeOperations).toBe(true);  // educational
            expect(configs[3].allowUnsafeOperations).toBe(true);  // dangerous

            // Timeouts should get more permissive
            expect(configs[0].timeout).toBeLessThan(configs[1].timeout!);
            expect(configs[3].timeout).toBe(0); // No timeout for dangerous

            [safe, testing, educational, dangerous].forEach(i => i.killAllProcesses());
        });
    });
}); 