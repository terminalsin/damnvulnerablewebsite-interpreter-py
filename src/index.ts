/**
 * DamnVulnerableInterpreter PY
 * 
 * A deliberately vulnerable Python code interpreter for TypeScript
 * WARNING: This package contains intentional security vulnerabilities for educational purposes.
 * DO NOT USE IN PRODUCTION ENVIRONMENTS.
 * 
 * @author DamnVulnerableInterpreter Team
 * @version 1.0.0
 */

// Export main classes
export { PythonInterpreter } from './interpreter';
export { PythonLinter } from './linter';

// Export all types and interfaces
export {
    PythonExecutionResult,
    PythonLintResult,
    LintError,
    LintWarning,
    InterpreterConfig,
    StreamOutput,
    ExecutionOptions,
    PythonStreamEmitter,
    UnsafeExecutionContext
} from './types';

// Export utility functions
export {
    createInterpreter,
    createUnsafeInterpreter,
    createQuickInterpreter,
    checkPythonAvailability,
    getSystemInfo,
    createUnsafeContext,
    TEST_SNIPPETS
} from './utils';

// Default export for convenience
import { PythonInterpreter } from './interpreter';
import { InterpreterConfig } from './types';

/**
 * Create a new Python interpreter instance with default configuration
 */
export default function createDefaultInterpreter(config?: InterpreterConfig): PythonInterpreter {
    return new PythonInterpreter(config);
}

/**
 * Version information
 */
export const VERSION = '1.0.0';

/**
 * Security warning
 */
export const SECURITY_WARNING = `
⚠️  SECURITY WARNING ⚠️ 
This package contains deliberate vulnerabilities for educational purposes.
DO NOT USE IN PRODUCTION ENVIRONMENTS.
The following vulnerabilities are intentionally present:
- Command injection
- Arbitrary code execution
- File system access bypass
- Input sanitization bypass
- Environment variable injection
- Information disclosure
- Resource exhaustion
- Insufficient error handling
`;

// Print warning when package is imported
console.warn(SECURITY_WARNING); 