

<!-- TOC --><a name="damnvulnerableinterpreter-py"></a>

<!-- TOC start (generated with https://github.com/derlin/bitdowntoc) -->
<div style="display: flex; align-items: center; gap: 15px;">
<img src=".docs/icon.png" width="100px">
<div>
<h1 style="margin: 0;"> 
DamnVulnerableWebsite - Python Interpreter </h1>

<img alt="NPM License" src="https://img.shields.io/npm/l/%40damnvulnerablewebsite%2Finterpreter-py?style=flat-square">
<img alt="NPM Version" src="https://img.shields.io/npm/v/%40damnvulnerablewebsite%2Finterpreter-py?style=flat-square">
</div>
</div>



---

- [⚠️ SECURITY WARNING](#️-security-warning)
- [📋 Features](#-features)
- [🚀 Installation](#-installation)
  - [Prerequisites](#prerequisites)
- [📖 Quick Start](#-quick-start)
  - [Basic Usage](#basic-usage)
  - [Streaming Output](#streaming-output)
  - [Educational Vulnerability Demonstration](#educational-vulnerability-demonstration)
- [🛠️ API Reference](#️-api-reference)
  - [Classes](#classes)
    - [`PythonInterpreter`](#pythoninterpreter)
    - [`PythonLinter`](#pythonlinter)
  - [Utility Functions](#utility-functions)
    - [`createInterpreter(config?)`](#createinterpreterconfig)
    - [`createUnsafeInterpreter(config?)`](#createunsafeinterpreterconfig)
    - [`createQuickInterpreter(preset, config?)`](#createquickinterpreterpreset-config)
    - [`checkPythonAvailability(pythonPath?)`](#checkpythonavailabilitypythonpath)
  - [Configuration Options](#configuration-options)
  - [Execution Options](#execution-options)
- [🎯 Examples](#-examples)
- [🔒 Security Vulnerabilities (Educational)](#-security-vulnerabilities-educational)
  - [1. Command Injection](#1-command-injection)
  - [2. Arbitrary Code Execution](#2-arbitrary-code-execution)
  - [3. File System Access](#3-file-system-access)
  - [4. Input Sanitization Bypass](#4-input-sanitization-bypass)
  - [5. Information Disclosure](#5-information-disclosure)
  - [6. Resource Exhaustion](#6-resource-exhaustion)
- [🧪 Testing](#-testing)
- [📜 Scripts](#-scripts)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [⚖️ Legal Disclaimer](#️-legal-disclaimer)
- [🎓 Educational Use Cases](#-educational-use-cases)
- [🔗 Inspired from](#-inspired-from)

<!-- TOC end -->


A deliberately vulnerable Python code interpreter library for TypeScript, designed for **educational and security testing purposes**.

<!-- TOC --><a name="-security-warning"></a>
## ⚠️ SECURITY WARNING

**🚨 THIS PACKAGE CONTAINS INTENTIONAL VULNERABILITIES FOR EDUCATIONAL PURPOSES ONLY!**

**DO NOT USE IN PRODUCTION ENVIRONMENTS!**

This package is designed to demonstrate common security vulnerabilities in code interpretation systems. It includes:
- Command injection vulnerabilities
- Arbitrary code execution without sandboxing
- File system access bypass
- Input sanitization bypass
- Environment variable injection
- Information disclosure
- Resource exhaustion vulnerabilities
- Insufficient error handling

<!-- TOC --><a name="-features"></a>
## 📋 Features

This TypeScript package provides:
- ✅ Receives Python code as input
- ✅ Lints Python code and checks for basic errors
- ✅ Interprets Python code and streams output back to TypeScript
- ✅ Multiple execution modes (safe, testing, educational, dangerous)
- ✅ Real-time streaming output
- ✅ Event-driven architecture
- ✅ TypeScript support with full type definitions
- ⚠️ Deliberately vulnerable implementation for security education

<!-- TOC --><a name="-installation"></a>
## 🚀 Installation

```bash
npm install @damnvulnerablewebsite/interpreter-py
```

<!-- TOC --><a name="prerequisites"></a>
### Prerequisites

- Node.js 18 or higher
- Python 3.x installed and accessible in PATH
- TypeScript (if using TypeScript)

<!-- TOC --><a name="-quick-start"></a>
## 📖 Quick Start

<!-- TOC --><a name="basic-usage"></a>
### Basic Usage

```typescript
import { createInterpreter } from '@damnvulnerablewebsite/interpreter-py';

async function example() {
  const interpreter = createInterpreter();
  
  const result = await interpreter.executeCode(`
    print("Hello from Python!")
    import math
    print(f"Pi is approximately {math.pi}")
  `);
  
  console.log('Output:', result.stdout);
  console.log('Success:', result.success);
}
```

<!-- TOC --><a name="streaming-output"></a>
### Streaming Output

```typescript
import { createQuickInterpreter } from '@damnvulnerablewebsite/interpreter-py';

const interpreter = createQuickInterpreter('testing');

interpreter.on('data', (output) => {
  console.log(`[${output.type}]`, output.data);
});

interpreter.on('complete', (result) => {
  console.log('Execution completed:', result.success);
});

await interpreter.executeCode(`
import time
for i in range(3):
    print(f"Step {i + 1}")
    time.sleep(1)
`, { stream: true });
```

<!-- TOC --><a name="educational-vulnerability-demonstration"></a>
### Educational Vulnerability Demonstration

```typescript
import { createUnsafeInterpreter, createUnsafeContext } from '@damnvulnerablewebsite/interpreter-py';

// WARNING: This creates an interpreter with NO security measures!
const unsafeInterpreter = createUnsafeInterpreter();

// This demonstrates how vulnerabilities can be exploited
const dangerousCode = `
import os
import subprocess

# This would normally be blocked by security measures
print("Current directory:", os.getcwd())
print("Environment vars:", list(os.environ.keys())[:5])

# Command execution
result = subprocess.run(['echo', 'System access!'], capture_output=True, text=True)
print("Command output:", result.stdout)
`;

const result = await unsafeInterpreter.executeUnsafe(dangerousCode, createUnsafeContext());
```

<!-- TOC --><a name="-api-reference"></a>
## 🛠️ API Reference

<!-- TOC --><a name="classes"></a>
### Classes

<!-- TOC --><a name="pythoninterpreter"></a>
#### `PythonInterpreter`

Main interpreter class for executing Python code.

```typescript
const interpreter = new PythonInterpreter({
  pythonPath: 'python3',
  timeout: 30000,
  maxOutputLines: 1000,
  enableLinting: true,
  allowUnsafeOperations: false
});
```

<!-- TOC --><a name="pythonlinter"></a>
#### `PythonLinter`

Lints Python code for syntax errors and security issues.

```typescript
const linter = new PythonLinter();
const result = await linter.lintCode('print("hello")');
```

<!-- TOC --><a name="utility-functions"></a>
### Utility Functions

<!-- TOC --><a name="createinterpreterconfig"></a>
#### `createInterpreter(config?)`
Creates a safe interpreter with security measures enabled.

<!-- TOC --><a name="createunsafeinterpreterconfig"></a>
#### `createUnsafeInterpreter(config?)`
Creates an unsafe interpreter with all security measures disabled.

<!-- TOC --><a name="createquickinterpreterpreset-config"></a>
#### `createQuickInterpreter(preset, config?)`
Creates an interpreter with preset configurations:
- `'safe'` - Maximum security, limited execution time
- `'testing'` - Balanced security for testing
- `'educational'` - Some unsafe operations for learning
- `'dangerous'` - All security measures disabled

<!-- TOC --><a name="checkpythonavailabilitypythonpath"></a>
#### `checkPythonAvailability(pythonPath?)`
Checks if Python is available on the system.

<!-- TOC --><a name="configuration-options"></a>
### Configuration Options

```typescript
interface InterpreterConfig {
  pythonPath?: string;          // Path to Python executable
  timeout?: number;             // Execution timeout in ms
  maxOutputLines?: number;      // Maximum output lines
  enableLinting?: boolean;      // Enable code linting
  allowUnsafeOperations?: boolean; // Allow dangerous operations
  workingDirectory?: string;    // Working directory for execution
  environment?: Record<string, string>; // Environment variables
}
```

<!-- TOC --><a name="execution-options"></a>
### Execution Options

```typescript
interface ExecutionOptions {
  timeout?: number;     // Override timeout
  cwd?: string;         // Working directory
  env?: Record<string, string>; // Environment variables
  stream?: boolean;     // Enable streaming output
  sanitize?: boolean;   // Enable input sanitization
}
```

<!-- TOC --><a name="-examples"></a>
## 🎯 Examples

See the [`examples/`](./examples/) directory for comprehensive examples:

- `basic-usage.ts` - Complete demonstration of all features
- More examples coming soon...

Run the examples:

```bash
npm run dev  # Runs examples/basic-usage.ts
```

<!-- TOC --><a name="-security-vulnerabilities-educational"></a>
## 🔒 Security Vulnerabilities (Educational)

This package intentionally contains the following vulnerabilities for educational purposes:

<!-- TOC --><a name="1-command-injection"></a>
### 1. Command Injection
- Environment variables can be manipulated to execute arbitrary commands
- Python path can be controlled by attackers

<!-- TOC --><a name="2-arbitrary-code-execution"></a>
### 2. Arbitrary Code Execution
- Unsafe mode allows execution of any Python code
- Linting can be completely bypassed

<!-- TOC --><a name="3-file-system-access"></a>
### 3. File System Access
- No sandboxing when unsafe operations are enabled
- Temporary files may not be properly cleaned up

<!-- TOC --><a name="4-input-sanitization-bypass"></a>
### 4. Input Sanitization Bypass
- Very basic sanitization that can be easily circumvented
- Regular expressions can be bypassed with alternative syntax

<!-- TOC --><a name="5-information-disclosure"></a>
### 5. Information Disclosure
- Configuration details exposed in environment variables
- Error messages may leak sensitive information
- Temporary file paths may be predictable

<!-- TOC --><a name="6-resource-exhaustion"></a>
### 6. Resource Exhaustion
- No limits on execution time when disabled
- No limits on output size when disabled
- Memory usage not controlled

<!-- TOC --><a name="-testing"></a>
## 🧪 Testing

```bash
npm test        # Run tests (when implemented)
npm run build   # Build TypeScript
npm run dev     # Run example in development mode
```

<!-- TOC --><a name="-scripts"></a>
## 📜 Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run example with hot reload
- `npm start` - Run compiled JavaScript
- `npm run clean` - Remove compiled files

<!-- TOC --><a name="-contributing"></a>
## 🤝 Contributing

This is an educational project. Contributions that add new vulnerabilities or improve the educational value are welcome!

<!-- TOC --><a name="-license"></a>
## 📄 License

ISC License - see [LICENSE](LICENSE) file for details.

<!-- TOC --><a name="-legal-disclaimer"></a>
## ⚖️ Legal Disclaimer

This software is provided for educational and security research purposes only. The authors are not responsible for any misuse of this software. Users must comply with all applicable laws and regulations.

**DO NOT USE THIS SOFTWARE IN PRODUCTION ENVIRONMENTS OR FOR MALICIOUS PURPOSES.**

<!-- TOC --><a name="-educational-use-cases"></a>
## 🎓 Educational Use Cases

- Security training and awareness
- Penetration testing practice
- Code review training
- Secure coding education
- Understanding common vulnerabilities
- Testing security tools and scanners

<!-- TOC --><a name="-inspired-from"></a>
## 🔗 Inspired from

- [DVWA](https://github.com/digininja/DVWA) - Damn Vulnerable Web Application
- [WebGoat](https://github.com/WebGoat/WebGoat) - Deliberately insecure application
- [Juice Shop](https://github.com/juice-shop/juice-shop) - Vulnerable web application
