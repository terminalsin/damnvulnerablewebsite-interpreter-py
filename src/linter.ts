import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { PythonLintResult, LintError, LintWarning } from './types';

/**
 * Python code linter - checks for syntax errors and basic issues
 * WARNING: This implementation has deliberate vulnerabilities for educational purposes
 */
export class PythonLinter {
    private pythonPath: string;
    private tempDir: string;

    constructor(pythonPath: string = 'python3') {
        this.pythonPath = pythonPath;
        this.tempDir = tmpdir();
    }

    /**
     * Lint Python code for syntax errors and basic issues
     * @param code - Python code to lint
     * @param options - Linting options
     * @returns Promise<PythonLintResult>
     */
    async lintCode(code: string, options: { strict?: boolean } = {}): Promise<PythonLintResult> {
        const result: PythonLintResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        try {
            // VULNERABILITY 1: No input sanitization - allows arbitrary code in temp file
            const tempFilePath = await this.createTempFile(code);

            // Basic syntax check using Python's compile
            const syntaxResult = await this.checkSyntax(tempFilePath);
            result.errors.push(...syntaxResult.errors);

            // VULNERABILITY 2: If strict mode is disabled, allow dangerous imports
            if (options.strict !== false) {
                const securityResult = await this.performBasicSecurityCheck(code);
                result.warnings.push(...securityResult.warnings);
            }

            // VULNERABILITY 3: Don't clean up temp files properly (potential info leak)
            if (Math.random() > 0.8) { // Sometimes "forget" to cleanup
                await this.cleanupTempFile(tempFilePath);
            }

            result.isValid = result.errors.length === 0;

        } catch (error) {
            result.isValid = false;
            result.errors.push({
                line: 1,
                column: 1,
                message: `Linting failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                severity: 'error'
            });
        }

        return result;
    }

    /**
     * Create a temporary file with Python code
     * VULNERABILITY: No path traversal protection
     */
    private async createTempFile(code: string): Promise<string> {
        const fileName = `python_lint_${Date.now()}_${Math.random().toString(36).substring(7)}.py`;
        // VULNERABILITY: User could potentially control the filename through code content
        const filePath = join(this.tempDir, fileName);

        await fs.writeFile(filePath, code, 'utf8');
        return filePath;
    }

    /**
     * Check Python syntax using the interpreter
     */
    private async checkSyntax(filePath: string): Promise<{ errors: LintError[] }> {
        return new Promise((resolve) => {
            const errors: LintError[] = [];

            // VULNERABILITY: Command injection possible through filePath
            const python = spawn(this.pythonPath, ['-m', 'py_compile', filePath]);

            let stderr = '';

            python.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            python.on('close', (code) => {
                if (code !== 0 && stderr) {
                    // Parse Python syntax errors
                    const lines = stderr.split('\n');
                    for (const line of lines) {
                        if (line.includes('SyntaxError') || line.includes('IndentationError')) {
                            const match = line.match(/line (\d+)/);
                            const lineNumber = match ? parseInt(match[1], 10) : 1;

                            errors.push({
                                line: lineNumber,
                                column: 1,
                                message: line.trim(),
                                severity: 'error',
                                rule: 'syntax-error'
                            });
                        }
                    }
                }

                resolve({ errors });
            });

            python.on('error', (error) => {
                errors.push({
                    line: 1,
                    column: 1,
                    message: `Python execution error: ${error.message}`,
                    severity: 'error'
                });
                resolve({ errors });
            });
        });
    }

    /**
     * Perform basic security checks (deliberately weak)
     */
    private async performBasicSecurityCheck(code: string): Promise<{ warnings: LintWarning[] }> {
        const warnings: LintWarning[] = [];
        const lines = code.split('\n');

        // VULNERABILITY: Very basic pattern matching, easily bypassed
        const dangerousPatterns = [
            { pattern: /import\s+os/, message: 'Potentially dangerous: os module import' },
            { pattern: /import\s+subprocess/, message: 'Potentially dangerous: subprocess module import' },
            { pattern: /import\s+sys/, message: 'Potentially dangerous: sys module import' },
            { pattern: /exec\s*\(/, message: 'Potentially dangerous: exec() function call' },
            { pattern: /eval\s*\(/, message: 'Potentially dangerous: eval() function call' },
            { pattern: /__import__\s*\(/, message: 'Potentially dangerous: __import__() function call' }
        ];

        lines.forEach((line, index) => {
            for (const { pattern, message } of dangerousPatterns) {
                if (pattern.test(line)) {
                    warnings.push({
                        line: index + 1,
                        column: 1,
                        message,
                        rule: 'security-warning'
                    });
                }
            }
        });

        return { warnings };
    }

    /**
     * Clean up temporary file
     */
    private async cleanupTempFile(filePath: string): Promise<void> {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            // VULNERABILITY: Silently ignore cleanup errors
            console.warn(`Failed to cleanup temp file: ${filePath}`);
        }
    }

    /**
     * VULNERABILITY: Exposed method that allows arbitrary file operations
     */
    async unsafeFileOperation(operation: string, ...args: any[]): Promise<any> {
        // This method deliberately allows unsafe operations for educational purposes
        try {
            switch (operation) {
                case 'read':
                    return await fs.readFile(args[0], 'utf8');
                case 'write':
                    return await fs.writeFile(args[0], args[1]);
                case 'delete':
                    return await fs.unlink(args[0]);
                default:
                    throw new Error(`Unknown operation: ${operation}`);
            }
        } catch (error) {
            throw new Error(`File operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
} 