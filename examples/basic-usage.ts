import {
    PythonInterpreter,
    createInterpreter,
    createUnsafeInterpreter,
    createQuickInterpreter,
    TEST_SNIPPETS,
    checkPythonAvailability
} from '../src/index';

async function basicExample() {
    console.log('🐍 DamnVulnerableInterpreter PY - Basic Usage Example\n');

    // Check if Python is available
    const pythonAvailable = await checkPythonAvailability();
    if (!pythonAvailable) {
        console.error('❌ Python is not available on this system');
        return;
    }
    console.log('✅ Python is available\n');

    // Create a safe interpreter
    const safeInterpreter = createInterpreter({
        timeout: 10000,
        maxOutputLines: 100
    });

    console.log('1. Safe Interpreter Example:');
    console.log('===========================');

    try {
        const result = await safeInterpreter.executeCode(TEST_SNIPPETS.hello);
        console.log('Output:', result.stdout);
        console.log('Success:', result.success);
        console.log('Execution time:', result.executionTime, 'ms\n');
    } catch (error) {
        console.error('Error:', error);
    }

    // Example with math
    console.log('2. Math Example:');
    console.log('================');

    try {
        const result = await safeInterpreter.executeCode(TEST_SNIPPETS.math);
        console.log('Output:', result.stdout);
        console.log('Success:', result.success, '\n');
    } catch (error) {
        console.error('Error:', error);
    }

    // Example with error
    console.log('3. Error Handling Example:');
    console.log('==========================');

    try {
        const result = await safeInterpreter.executeCode(TEST_SNIPPETS.error);
        console.log('Output:', result.stdout);
        console.log('Error output:', result.stderr);
        console.log('Success:', result.success, '\n');
    } catch (error) {
        console.error('Error:', error);
    }

    // Example with linting
    console.log('4. Linting Example:');
    console.log('===================');

    const badCode = `
import os
import subprocess
print("This code has dangerous imports")
exec('print("Also using exec")')
`;

    try {
        const result = await safeInterpreter.executeCode(badCode);
        console.log('Linting caught dangerous code!');
        console.log('Output:', result.stdout);
        console.log('Error output:', result.stderr);
        console.log('Success:', result.success, '\n');
    } catch (error) {
        console.error('Error:', error);
    }

    safeInterpreter.killAllProcesses();
}

async function streamingExample() {
    console.log('5. Streaming Example:');
    console.log('=====================');

    const interpreter = createQuickInterpreter('testing');

    const longRunningCode = `
import time
for i in range(5):
    print(f"Processing step {i + 1}")
    time.sleep(1)
print("Done!")
`;

    // Set up event listeners
    interpreter.on('data', (output) => {
        console.log(`[${output.type}]`, output.data.trim());
    });

    interpreter.on('complete', (result) => {
        console.log('Streaming completed!');
        console.log('Final result:', result.success);
        console.log('Total execution time:', result.executionTime, 'ms\n');
    });

    try {
        await interpreter.executeCode(longRunningCode, { stream: true });
    } catch (error) {
        console.error('Streaming error:', error);
    }

    interpreter.killAllProcesses();
}

async function vulnerabilityExample() {
    console.log('6. Vulnerability Example (Educational):');
    console.log('=======================================');
    console.log('⚠️  WARNING: The following demonstrates vulnerabilities!');

    // Create an unsafe interpreter
    const unsafeInterpreter = createUnsafeInterpreter();

    console.log('\n🚨 Unsafe interpreter created - all safety measures disabled');

    // This would normally be blocked by linting, but unsafe mode allows it
    const dangerousCode = `
import os
print("Current directory contents:")
for item in os.listdir('.'):
    print(f"  {item}")

print("\\nEnvironment variables:")
for key, value in os.environ.items():
    if 'PYTHON' in key:
        print(f"  {key}: {value}")
`;

    try {
        console.log('\nExecuting dangerous code that accesses file system...');
        const result = await unsafeInterpreter.executeCode(dangerousCode);
        console.log('Output:\n', result.stdout);
        console.log('This demonstrates how the unsafe mode bypasses security!');
    } catch (error) {
        console.error('Error:', error);
    }

    // Even more dangerous - using executeUnsafe method
    console.log('\n💀 Using executeUnsafe method...');
    try {
        const result = await unsafeInterpreter.executeUnsafe(
            TEST_SNIPPETS.dangerous.subprocess,
            {
                allowShellAccess: true,
                allowFileSystemAccess: true,
                bypassSandbox: true
            }
        );
        console.log('Unsafe execution output:\n', result.stdout);
    } catch (error) {
        console.error('Error:', error);
    }

    unsafeInterpreter.killAllProcesses();
}

async function main() {
    try {
        await basicExample();
        await streamingExample();
        await vulnerabilityExample();

        console.log('\n✨ Example completed! Check the output above to understand:');
        console.log('   - How the safe interpreter works');
        console.log('   - How linting catches dangerous code');
        console.log('   - How streaming provides real-time output');
        console.log('   - How the unsafe mode demonstrates vulnerabilities');
        console.log('\n💡 This package is for educational purposes only!');

    } catch (error) {
        console.error('Main execution error:', error);
    }
}

// Run the example
if (require.main === module) {
    main();
} 