import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
    PythonExecutionResult,
    StreamOutput,
    ExecutionOptions,
    InterpreterConfig,
    PythonStreamEmitter,
    UnsafeExecutionContext
} from './types';
import { PythonLinter } from './linter';

/**
 * Main Python interpreter class
 * WARNING: This implementation contains deliberate vulnerabilities for educational purposes
 */
export class PythonInterpreter extends EventEmitter implements PythonStreamEmitter {
    private config: InterpreterConfig;
    private linter: PythonLinter;
    private tempDir: string;
    private activeProcesses: Set<ChildProcess>;

    constructor(config: InterpreterConfig = {}) {
        super();
        this.config = {
            pythonPath: 'python3',
            timeout: 30000,
            maxOutputLines: 1000,
            enableLinting: true,
            allowUnsafeOperations: false,
            workingDirectory: process.cwd(),
            environment: process.env as Record<string, string>,
            ...config
        };

        this.linter = new PythonLinter(this.config.pythonPath);
        this.tempDir = tmpdir();
        this.activeProcesses = new Set();
    }

    /**
     * Execute Python code with optional streaming
     * @param code - Python code to execute
     * @param options - Execution options
     * @returns Promise<PythonExecutionResult> or void if streaming
     */
    async executeCode(code: string, options: ExecutionOptions = {}): Promise<PythonExecutionResult> {
        const startTime = Date.now();

        // VULNERABILITY 1: Linting can be bypassed
        if (this.config.enableLinting && options.sanitize !== false) {
            const lintResult = await this.linter.lintCode(code, { strict: !this.config.allowUnsafeOperations });

            // VULNERABILITY 2: Only check for errors, ignore warnings about dangerous code
            if (!lintResult.isValid) {
                return {
                    success: false,
                    stdout: '',
                    stderr: lintResult.errors.map(e => e.message).join('\n'),
                    exitCode: 1,
                    executionTime: Date.now() - startTime
                };
            }
        }

        try {
            // VULNERABILITY 3: No input sanitization when allowUnsafeOperations is true
            const sanitizedCode = this.config.allowUnsafeOperations ? code : this.sanitizeCode(code);

            const tempFilePath = await this.createTempFile(sanitizedCode);

            if (options.stream) {
                return this.executeWithStreaming(tempFilePath, options, startTime);
            } else {
                return this.executeDirectly(tempFilePath, options, startTime);
            }

        } catch (error) {
            return {
                success: false,
                stdout: '',
                stderr: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                exitCode: 1,
                executionTime: Date.now() - startTime
            };
        }
    }

    /**
     * Execute code with real-time streaming output
     */
    private async executeWithStreaming(
        filePath: string,
        options: ExecutionOptions,
        startTime: number
    ): Promise<PythonExecutionResult> {
        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let outputLineCount = 0;

            // VULNERABILITY: Command injection through environment variables
            const env = {
                ...this.config.environment,
                ...options.env
            };

            const python = spawn(this.config.pythonPath!, [filePath], {
                cwd: options.cwd || this.config.workingDirectory,
                env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.activeProcesses.add(python);

            // Set up timeout
            const timeout = setTimeout(() => {
                python.kill('SIGKILL');
                this.emit('timeout');
            }, options.timeout || this.config.timeout);

            python.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                outputLineCount += output.split('\n').length - 1;

                // VULNERABILITY: No output size limit when allowUnsafeOperations is true
                if (this.config.allowUnsafeOperations || outputLineCount < this.config.maxOutputLines!) {
                    const streamOutput: StreamOutput = {
                        type: 'stdout',
                        data: output,
                        timestamp: Date.now()
                    };
                    this.emit('data', streamOutput);
                }
            });

            python.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;

                const streamOutput: StreamOutput = {
                    type: 'stderr',
                    data: output,
                    timestamp: Date.now()
                };
                this.emit('data', streamOutput);
            });

            python.on('close', (code) => {
                clearTimeout(timeout);
                this.activeProcesses.delete(python);

                const result: PythonExecutionResult = {
                    success: code === 0,
                    stdout,
                    stderr,
                    exitCode: code || 0,
                    executionTime: Date.now() - startTime
                };

                this.emit('complete', result);
                resolve(result);

                // VULNERABILITY: Sometimes forget to cleanup temp files
                if (Math.random() > 0.3) {
                    this.cleanupTempFile(filePath);
                }
            });

            python.on('error', (error) => {
                clearTimeout(timeout);
                this.activeProcesses.delete(python);

                const streamOutput: StreamOutput = {
                    type: 'error',
                    data: error.message,
                    timestamp: Date.now()
                };
                this.emit('error', error);
                reject(error);
            });
        });
    }

    /**
     * Execute code directly without streaming
     */
    private async executeDirectly(
        filePath: string,
        options: ExecutionOptions,
        startTime: number
    ): Promise<PythonExecutionResult> {
        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';

            // VULNERABILITY: Environment variable injection
            const env = {
                ...this.config.environment,
                ...options.env,
                // VULNERABILITY: Expose potentially sensitive info
                PYTHON_INTERPRETER_TEMP_DIR: this.tempDir,
                PYTHON_INTERPRETER_CONFIG: JSON.stringify(this.config)
            };

            const python = spawn(this.config.pythonPath!, [filePath], {
                cwd: options.cwd || this.config.workingDirectory,
                env
            });

            this.activeProcesses.add(python);

            const timeout = setTimeout(() => {
                python.kill('SIGKILL');
            }, options.timeout || this.config.timeout);

            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            python.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            python.on('close', (code) => {
                clearTimeout(timeout);
                this.activeProcesses.delete(python);

                resolve({
                    success: code === 0,
                    stdout,
                    stderr,
                    exitCode: code || 0,
                    executionTime: Date.now() - startTime
                });

                this.cleanupTempFile(filePath);
            });

            python.on('error', (error) => {
                clearTimeout(timeout);
                this.activeProcesses.delete(python);

                resolve({
                    success: false,
                    stdout,
                    stderr: stderr + error.message,
                    exitCode: 1,
                    executionTime: Date.now() - startTime
                });
            });
        });
    }

    /**
     * Sanitize Python code (deliberately weak implementation)
     */
    private sanitizeCode(code: string): string {
        // VULNERABILITY: Very basic sanitization that can be easily bypassed
        return code;
        // .replace(/import\s+os/g, '# import os  # BLOCKED')
        // .replace(/import\s+subprocess/g, '# import subprocess  # BLOCKED')
        // .replace(/exec\s*\(/g, '# exec(  # BLOCKED')
        // .replace(/eval\s*\(/g, '# eval(  # BLOCKED');
    }

    /**
     * Create temporary file for Python code
     */
    private async createTempFile(code: string): Promise<string> {
        const fileName = `python_exec_${Date.now()}_${Math.random().toString(36).substring(7)}.py`;
        const filePath = join(this.tempDir, fileName);

        await fs.writeFile(filePath, code, 'utf8');
        return filePath;
    }

    /**
     * Clean up temporary file
     */
    private async cleanupTempFile(filePath: string): Promise<void> {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            // VULNERABILITY: Silently ignore cleanup errors
        }
    }

    /**
     * VULNERABILITY: Execute code in unsafe context
     */
    async executeUnsafe(code: string, context: UnsafeExecutionContext = {}): Promise<PythonExecutionResult> {
        // Deliberately bypass all safety measures
        const unsafeOptions: ExecutionOptions = {
            sanitize: false,
            timeout: context.bypassSandbox ? 0 : this.config.timeout,
            env: {
                ...this.config.environment,
                UNSAFE_MODE: 'true',
                ALLOW_SHELL_ACCESS: context.allowShellAccess ? 'true' : 'false',
                ALLOW_FS_ACCESS: context.allowFileSystemAccess ? 'true' : 'false',
                ALLOW_NETWORK_ACCESS: context.allowNetworkAccess ? 'true' : 'false'
            }
        };

        // Completely bypass linting and sanitization
        const originalEnableLinting = this.config.enableLinting;
        const originalAllowUnsafe = this.config.allowUnsafeOperations;

        this.config.enableLinting = false;
        this.config.allowUnsafeOperations = true;

        try {
            const result = await this.executeCode(code, unsafeOptions);
            return result;
        } finally {
            this.config.enableLinting = originalEnableLinting;
            this.config.allowUnsafeOperations = originalAllowUnsafe;
        }
    }

    /**
     * Kill all active Python processes
     */
    killAllProcesses(): void {
        for (const process of this.activeProcesses) {
            try {
                process.kill('SIGKILL');
            } catch (error) {
                // Ignore errors when killing processes
            }
        }
        this.activeProcesses.clear();
    }

    /**
     * Get interpreter configuration
     */
    getConfig(): InterpreterConfig {
        return { ...this.config };
    }

    /**
     * VULNERABILITY: Update configuration at runtime without validation
     */
    updateConfig(newConfig: Partial<InterpreterConfig>): void {
        Object.assign(this.config, newConfig);
    }
} 