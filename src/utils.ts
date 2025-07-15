import { PythonInterpreter } from './interpreter';
import { InterpreterConfig, UnsafeExecutionContext } from './types';

/**
 * Create a new Python interpreter with safe defaults
 * @param config - Optional configuration
 * @returns PythonInterpreter instance
 */
export function createInterpreter(config: InterpreterConfig = {}): PythonInterpreter {
    const mergedConfig: InterpreterConfig = {
        enableLinting: true,
        allowUnsafeOperations: false,
        timeout: 30000,
        maxOutputLines: 1000,
        ...config
    };

    // Force safe defaults - override any unsafe settings that might have been passed
    const safeConfig: InterpreterConfig = {
        ...mergedConfig,
        enableLinting: true,
        allowUnsafeOperations: false
    };

    return new PythonInterpreter(safeConfig);
}

/**
 * Create a deliberately unsafe Python interpreter for testing vulnerabilities
 * WARNING: This function creates an interpreter with all safety measures disabled
 * @param config - Optional configuration
 * @returns PythonInterpreter instance with unsafe defaults
 */
export function createUnsafeInterpreter(config: InterpreterConfig = {}): PythonInterpreter {
    const unsafeConfig: InterpreterConfig = {
        enableLinting: false,
        allowUnsafeOperations: true,
        timeout: 0, // No timeout
        maxOutputLines: Number.MAX_SAFE_INTEGER,
        ...config
    };

    console.warn('🚨 DANGER: Creating interpreter with unsafe configuration!');
    return new PythonInterpreter(unsafeConfig);
}

/**
 * Create a quick-start interpreter for common use cases
 * @param preset - Preset configuration type
 * @param customConfig - Additional configuration to override preset
 * @returns PythonInterpreter instance
 */
export function createQuickInterpreter(
    preset: 'safe' | 'testing' | 'educational' | 'dangerous',
    customConfig: InterpreterConfig = {}
): PythonInterpreter {
    let baseConfig: InterpreterConfig;

    switch (preset) {
        case 'safe':
            baseConfig = {
                enableLinting: true,
                allowUnsafeOperations: false,
                timeout: 10000,
                maxOutputLines: 100
            };
            break;

        case 'testing':
            baseConfig = {
                enableLinting: true,
                allowUnsafeOperations: false,
                timeout: 60000,
                maxOutputLines: 5000
            };
            break;

        case 'educational':
            baseConfig = {
                enableLinting: true,
                allowUnsafeOperations: true, // Allow some unsafe operations for learning
                timeout: 30000,
                maxOutputLines: 1000
            };
            console.warn('📚 Educational mode: Some unsafe operations are enabled for learning purposes');
            break;

        case 'dangerous':
            baseConfig = {
                enableLinting: false,
                allowUnsafeOperations: true,
                timeout: 0,
                maxOutputLines: Number.MAX_SAFE_INTEGER
            };
            console.warn('💀 DANGEROUS MODE: All safety measures disabled!');
            break;

        default:
            throw new Error(`Unknown preset: ${preset}`);
    }

    return new PythonInterpreter({ ...baseConfig, ...customConfig });
}

/**
 * Utility function to check if Python is available on the system
 * @param pythonPath - Path to Python executable (defaults to 'python3')
 * @returns Promise<boolean> - True if Python is available
 */
export async function checkPythonAvailability(pythonPath: string = 'python3'): Promise<boolean> {
    return new Promise((resolve) => {
        const { spawn } = require('child_process');
        const python = spawn(pythonPath, ['--version']);

        python.on('close', (code: number) => {
            resolve(code === 0);
        });

        python.on('error', () => {
            resolve(false);
        });
    });
}

/**
 * Get system information for debugging
 * @returns System information object
 */
export function getSystemInfo() {
    const os = require('os');
    return {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        tempDir: os.tmpdir(),
        homeDir: os.homedir(),
        cwd: process.cwd()
    };
}

/**
 * Create an unsafe execution context for vulnerability testing
 * @param overrides - Context overrides
 * @returns UnsafeExecutionContext
 */
export function createUnsafeContext(overrides: Partial<UnsafeExecutionContext> = {}): UnsafeExecutionContext {
    return {
        allowShellAccess: true,
        allowFileSystemAccess: true,
        allowNetworkAccess: true,
        allowImportAll: true,
        bypassSandbox: true,
        ...overrides
    };
}

/**
 * Common Python code snippets for testing
 */
export const TEST_SNIPPETS = {
    hello: 'print("Hello, World!")',

    math: `
import math
result = math.sqrt(16)
print(f"Square root of 16 is: {result}")
`,

    loop: `
for i in range(5):
    print(f"Count: {i}")
`,

    error: `
# This will cause a deliberate error
print(undefined_variable)
`,

    // Dangerous snippets for vulnerability testing
    dangerous: {
        fileRead: `
import os
print(os.listdir('.'))
`,

        subprocess: `
import subprocess
result = subprocess.run(['ls', '-la'], capture_output=True, text=True)
print(result.stdout)
`,

        exec: `
exec('print("Code executed via exec!")')
`,

        eval: `
result = eval('2 + 2')
print(f"Eval result: {result}")
`
    }
}; 