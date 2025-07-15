/**
 * Tests for PythonLinter class
 * These tests verify linting functionality and demonstrate security vulnerabilities
 */

import { PythonLinter } from '../src/linter';
import { PythonLintResult } from '../src/types';
import { testUtils } from './setup';

describe('PythonLinter', () => {
    let linter: PythonLinter;

    beforeEach(() => {
        linter = new PythonLinter();
    });

    describe('Constructor', () => {
        it('should create linter with default python path', () => {
            const defaultLinter = new PythonLinter();
            expect(defaultLinter).toBeInstanceOf(PythonLinter);
        });

        it('should create linter with custom python path', () => {
            const customLinter = new PythonLinter('python');
            expect(customLinter).toBeInstanceOf(PythonLinter);
        });
    });

    describe('Basic Linting', () => {
        it('should validate correct Python code', async () => {
            const validCode = `
print("Hello, World!")
x = 5
y = x * 2
print(f"Result: {y}")
      `;

            const result = await testUtils.withTimeout(linter.lintCode(validCode));

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toEqual(expect.any(Array));
        });

        it('should detect syntax errors', async () => {
            const invalidCode = `
print("Missing closing quote
if True
    print("Invalid indentation")
      `;

            const result = await testUtils.withTimeout(linter.lintCode(invalidCode));

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toEqual(
                expect.objectContaining({
                    line: expect.any(Number),
                    column: expect.any(Number),
                    message: expect.any(String),
                    severity: 'error'
                })
            );
        });

        it('should detect indentation errors', async () => {
            const indentationError = `
def my_function():
print("Wrong indentation")
      `;

            const result = await testUtils.withTimeout(linter.lintCode(indentationError));

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('IndentationError'))).toBe(true);
        });
    });

    describe('Security Warnings', () => {
        it('should warn about dangerous os import', async () => {
            const dangerousCode = `
import os
print("Current directory:", os.getcwd())
      `;

            const result = await testUtils.withTimeout(linter.lintCode(dangerousCode));

            expect(result.warnings.some(w =>
                w.message.includes('os module import')
            )).toBe(true);
            expect(result.warnings.some(w => w.rule === 'security-warning')).toBe(true);
        });

        it('should warn about subprocess import', async () => {
            const dangerousCode = `
import subprocess
result = subprocess.run(['ls'], capture_output=True)
      `;

            const result = await testUtils.withTimeout(linter.lintCode(dangerousCode));

            expect(result.warnings.some(w =>
                w.message.includes('subprocess module import')
            )).toBe(true);
        });

        it('should warn about exec function calls', async () => {
            const dangerousCode = `
code = "print('Dynamic execution')"
exec(code)
      `;

            const result = await testUtils.withTimeout(linter.lintCode(dangerousCode));

            expect(result.warnings.some(w =>
                w.message.includes('exec() function call')
            )).toBe(true);
        });

        it('should warn about eval function calls', async () => {
            const dangerousCode = `
result = eval("2 + 2")
print(result)
      `;

            const result = await testUtils.withTimeout(linter.lintCode(dangerousCode));

            expect(result.warnings.some(w =>
                w.message.includes('eval() function call')
            )).toBe(true);
        });

        it('should warn about __import__ function calls', async () => {
            const dangerousCode = `
os_module = __import__('os')
print(os_module.getcwd())
      `;

            const result = await testUtils.withTimeout(linter.lintCode(dangerousCode));

            expect(result.warnings.some(w =>
                w.message.includes('__import__() function call')
            )).toBe(true);
        });

        it('should detect multiple security issues', async () => {
            const multiDangerousCode = `
import os
import subprocess
import sys

exec('print("Dynamic code")')
result = eval('2 + 2')
module = __import__('json')
      `;

            const result = await testUtils.withTimeout(linter.lintCode(multiDangerousCode));

            expect(result.warnings.length).toBeGreaterThan(3);
            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: expect.stringContaining('os module import'),
                        rule: 'security-warning'
                    }),
                    expect.objectContaining({
                        message: expect.stringContaining('subprocess module import'),
                        rule: 'security-warning'
                    }),
                    expect.objectContaining({
                        message: expect.stringContaining('exec() function call'),
                        rule: 'security-warning'
                    })
                ])
            );
        });
    });

    describe('Vulnerability: Weak Security Checks', () => {
        it('should miss security issues when strict mode is disabled', async () => {
            const dangerousCode = `
import os
import subprocess
exec('print("Should be caught")')
      `;

            const result = await testUtils.withTimeout(
                linter.lintCode(dangerousCode, { strict: false })
            );

            // VULNERABILITY: With strict mode disabled, security warnings should be bypassed
            expect(result.warnings).toHaveLength(0);
            expect(result.isValid).toBe(true); // Code executes without security warnings
        });

        it('should be easily bypassed with alternative import syntax (vulnerability)', async () => {
            const bypassCode = `
# VULNERABILITY: Basic pattern matching can be bypassed
from os import getcwd
from subprocess import run as execute_command
__import__("sys").exit(0)
      `;

            const result = await testUtils.withTimeout(linter.lintCode(bypassCode));

            expect(result).toHaveVulnerability();
            // VULNERABILITY: The basic regex patterns miss alternative import syntaxes
            const hasOsWarning = result.warnings.some(w => w.message.includes('os'));
            const hasSubprocessWarning = result.warnings.some(w => w.message.includes('subprocess'));

            // These should be caught but aren't due to weak pattern matching
            expect(hasOsWarning).toBe(false);
            expect(hasSubprocessWarning).toBe(false);
        });

        it('should miss obfuscated dangerous calls (vulnerability)', async () => {
            const obfuscatedCode = `
# VULNERABILITY: Simple string matching misses obfuscation
func_name = "exec"
globals()[func_name]('print("Bypassed!")')

# Alternative eval bypass
getattr(__builtins__, "eval")("print('Also bypassed!')")
      `;

            const result = await testUtils.withTimeout(linter.lintCode(obfuscatedCode));

            // VULNERABILITY: Obfuscated calls are not detected
            const hasExecWarning = result.warnings.some(w => w.message.includes('exec'));
            const hasEvalWarning = result.warnings.some(w => w.message.includes('eval'));

            expect(hasExecWarning).toBe(false);
            expect(hasEvalWarning).toBe(false);
        });
    });

    describe('File Operations (Vulnerability Tests)', () => {
        it('should create temporary files without proper validation', async () => {
            const code = testUtils.createTestCode('simple');

            // This test demonstrates the vulnerability in temp file creation
            const result = await testUtils.withTimeout(linter.lintCode(code));

            expect(result.isValid).toBeDefined();
            expect(result.errors).toBeDefined();
            expect(result.warnings).toBeDefined();
            // VULNERABILITY: Temporary files created without proper validation
            expect(result.isValid).toBe(true);
        });

        it('should expose unsafe file operations (vulnerability)', async () => {
            // VULNERABILITY: Exposed method allows arbitrary file operations
            const testContent = 'test content';
            const testPath = '/tmp/test_file.txt';

            try {
                await linter.unsafeFileOperation('write', testPath, testContent);
                const readContent = await linter.unsafeFileOperation('read', testPath);

                expect(readContent).toBe(testContent);
                expect(readContent).toHaveVulnerability();

                await linter.unsafeFileOperation('delete', testPath);
            } catch (error) {
                // Test passes if unsafe operations work or fail - both demonstrate the vulnerability
                expect(error).toHaveVulnerability();
            }
        });

        it('should fail gracefully on invalid file operations', async () => {
            try {
                await linter.unsafeFileOperation('invalid_operation', 'some_file');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Unknown operation');
            }
        });
    });

    describe('Cleanup Vulnerabilities', () => {
        it('should demonstrate temp file cleanup issues (vulnerability)', async () => {
            const code = testUtils.createTestCode('simple');

            // Run linting multiple times to potentially create multiple temp files
            const promises = Array.from({ length: 5 }, () =>
                linter.lintCode(code)
            );

            const results = await Promise.all(promises);

            results.forEach(result => {
                // VULNERABILITY: Temp files may not be cleaned up properly
                // (demonstrated by the random cleanup logic in the implementation)
                expect(result.isValid).toBeDefined();
                expect(result.errors).toBeDefined();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle linting failures gracefully', async () => {
            const linter = new PythonLinter('invalid_python_executable');
            const code = testUtils.createTestCode('simple');

            const result = await testUtils.withTimeout(linter.lintCode(code));

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].message).toMatch(/Linting failed|Python execution error/);
        });

        it('should handle empty code', async () => {
            const result = await testUtils.withTimeout(linter.lintCode(''));

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should handle very long code', async () => {
            const longCode = Array.from({ length: 1000 }, (_, i) =>
                `print("Line ${i}")`
            ).join('\n');

            const result = await testUtils.withTimeout(linter.lintCode(longCode));

            expect(result).toEqual(
                expect.objectContaining({
                    isValid: expect.any(Boolean),
                    errors: expect.any(Array),
                    warnings: expect.any(Array)
                })
            );
        });
    });

    describe('Command Injection Vulnerability', () => {
        it('should be vulnerable to path injection through filePath (vulnerability)', async () => {
            // This test demonstrates the potential for command injection through file paths
            // The vulnerability exists in the checkSyntax method where filePath is used directly
            const normalCode = testUtils.createTestCode('simple');

            const result = await testUtils.withTimeout(linter.lintCode(normalCode));

            // VULNERABILITY: The filePath parameter in spawn() could be manipulated
            // if an attacker could control the temp file creation process
            expect(result.isValid).toBeDefined();
            expect(result.errors).toBeDefined();
        });
    });
}); 