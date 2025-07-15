import { EventEmitter } from 'events';

/**
 * Python code execution result
 */
export interface PythonExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
}

/**
 * Python linting result
 */
export interface PythonLintResult {
    isValid: boolean;
    errors: LintError[];
    warnings: LintWarning[];
}

/**
 * Lint error interface
 */
export interface LintError {
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
    rule?: string;
}

/**
 * Lint warning interface
 */
export interface LintWarning {
    line: number;
    column: number;
    message: string;
    rule?: string;
}

/**
 * Interpreter configuration options
 */
export interface InterpreterConfig {
    pythonPath?: string;
    timeout?: number;
    maxOutputLines?: number;
    enableLinting?: boolean;
    allowUnsafeOperations?: boolean; // Deliberately vulnerable option
    workingDirectory?: string;
    environment?: Record<string, string>;
}

/**
 * Stream output interface for real-time execution feedback
 */
export interface StreamOutput {
    type: 'stdout' | 'stderr' | 'error' | 'complete';
    data: string;
    timestamp: number;
}

/**
 * Python execution options
 */
export interface ExecutionOptions {
    timeout?: number;
    cwd?: string;
    env?: Record<string, string>;
    stream?: boolean;
    sanitize?: boolean; // Deliberately vulnerable when false
}

/**
 * Event emitter for streaming Python execution
 */
export interface PythonStreamEmitter extends EventEmitter {
    on(event: 'data', listener: (output: StreamOutput) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'complete', listener: (result: PythonExecutionResult) => void): this;
    on(event: 'timeout', listener: () => void): this;
}

/**
 * Dangerous execution context - deliberately vulnerable
 */
export interface UnsafeExecutionContext {
    allowShellAccess?: boolean;
    allowFileSystemAccess?: boolean;
    allowNetworkAccess?: boolean;
    allowImportAll?: boolean;
    bypassSandbox?: boolean;
} 