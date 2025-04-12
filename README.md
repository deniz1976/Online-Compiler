# Online C++ Compiler Platform

A comprehensive web-based IDE for C++ development with a secure backend and interactive frontend. This platform allows users to write, compile, execute, and save C++ code through an intuitive browser interface, all backed by a multi-layered security architecture.

## Key Features

### Frontend Features
- **Interactive Code Editor**
  - Syntax highlighting with CodeMirror editor
  - Real-time auto-completion for C++ keywords and snippets
  - Automatic bracket matching and indentation
  - Line numbering and error underlining
  - Basic syntax checking with real-time feedback
  - Dark theme with Dracula color scheme for reduced eye strain
  - Support for different C++ standard versions (C++98 to C++20)

- **User Experience**
  - Responsive design for desktop and mobile devices
  - Fixed-size input/output panels with scrollbars for better content management
  - Keyboard shortcuts for efficient workflow (Ctrl+Enter to run, Ctrl+S to save)
  - Modal dialogs for login, register, and saved code management
  - Realtime compilation error display with color-coded error messages
  - Auto-scrolling output panel to show latest results

- **User Management**
  - User registration and authentication
  - JWT-based secure login system with token storage
  - Profile display and session management
  - Automatic authentication state persistence

- **Code Management**
  - Save code snippets with custom titles
  - Browse and manage previously saved code
  - Load and modify previously saved code
  - Delete unwanted code snippets
  - Version tracking for C++ standards

### Backend Features
- **Secure API Architecture**
  - RESTful API design with Express.js and TypeScript
  - JWT-based authentication middleware
  - Error handling and validation
  - CORS security configuration
  - Helmet for HTTP security headers

- **Code Execution Engine**
  - Secure C++ code compilation and execution
  - Support for multiple C++ standards (C++98, C++11, C++14, C++17, C++20)
  - Input handling for program execution
  - Multi-layered security validation:
    - Static code analysis to detect dangerous patterns
    - CppCheck integration for deep code analysis
    - Execution timeout enforcement
    - Memory and CPU limitations
    - Container isolation with gVisor

- **Data Management**
  - User data storage and retrieval
  - Code snippet persistence
  - Version tracking
  - API response formatting

## Technical Architecture

### Frontend Architecture
- **Technologies Used**
  - HTML5 for structure
  - CSS3 with custom variables for theming
  - Vanilla JavaScript with modern ES6+ features
  - CodeMirror for the code editor component
  - Font Awesome for icons

- **JavaScript Organization**
  - Module-based code structure
  - Event-driven architecture
  - Asynchronous API communication with fetch API
  - Promise-based error handling
  - Local storage for authentication persistence

- **CSS Architecture**
  - CSS custom properties (variables) for theming
  - Flexbox layout for responsive design
  - Mobile-first media queries
  - Custom scrollbars with WebKit and standard implementations
  - Consistent spacing and color scheme

### Backend Architecture
- **Technologies Used**
  - Node.js runtime environment
  - Express.js for API routing and middleware
  - TypeScript for type safety and code organization
  - Docker and gVisor for secure code execution
  - JWT for authentication
  - Swagger for API documentation

- **Security Layers**
  - **Layer 1**: Static code analysis and pattern detection
  - **Layer 2**: CppCheck static analysis in isolated container
  - **Layer 3**: gVisor container runtime for kernel-level isolation
  - **Layer 4**: Resource limitations (memory, CPU, execution time)
  - **Layer 5**: Cleanup and monitoring

- **API Endpoints**
  - Authentication endpoints (`/api/auth/*`)
  - Compiler endpoints (`/api/compiler/cpp`)
  - User management endpoints (`/api/users/*`)
  - Code management endpoints (`/api/codes/*`)

## Installation and Setup

### Prerequisites
- Node.js 18+ for the server
- Docker and Docker Compose for containerization
- gVisor runtime for secure execution
- Modern web browser for the frontend

### Server Setup
1. Clone the repository
```bash
git clone https://github.com/deniz1976/online-compiler.git
cd online-compiler
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file with the following variables:
```
NODE_ENV=development
PORT=3000
JWT_SECRET=your_secure_jwt_secret_change_this
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90
```

4. Start the development server
```bash
npm run dev
```

### Docker Setup (Recommended for Production)
1. Make sure Docker and Docker Compose are installed
2. Configure environment variables in `docker-compose.yml`
3. Run the application with gVisor support:
```bash
docker-compose up -d
```

### Frontend Development
- Frontend code is located in the `public` directory
- Modify HTML in `public/index.html`
- Update styles in `public/css/style.css`
- Enhance functionality in `public/js/app.js`
- C++ keyword definitions are in `public/js/cpp-keywords.js`

## Usage Guide

### Writing and Running Code
1. Open the application in your web browser
2. Write your C++ code in the editor
3. Select the desired C++ standard version
4. Add any input needed for your program in the Input panel
5. Click the "Run" button or press Ctrl+Enter to execute the code
6. View the results in the Output panel

### Saving and Managing Code
1. Log in or create an account
2. Give your code a title in the title field
3. Click the "Save" button or press Ctrl+S to save your code
4. Access your saved code by clicking "My Codes"
5. Load or delete your saved code from the My Codes dialog

### User Authentication
1. Click "Login" to access your account
2. Register a new account if you don't have one
3. Stay logged in to retain access to your saved code
4. Click "Logout" to end your session

## Technical Implementation Details

### Frontend Implementation

#### CodeMirror Configuration
```javascript
const codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    mode: 'text/x-c++src',
    theme: 'dracula',
    lineNumbers: true,
    indentUnit: 4,
    autoCloseBrackets: true,
    matchBrackets: true,
    lineWrapping: true,
    extraKeys: {
        'Ctrl-Space': 'autocomplete',
        'Tab': function(cm) {
            const spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
            cm.replaceSelection(spaces);
        }
    },
    hintOptions: {
        completeSingle: false,
        alignWithWord: true,
        closeOnUnfocus: true
    }
});
```

#### Custom Auto-completion
A specialized C++ auto-completion system is implemented with:
- Keywords list for C++ language elements
- Standard library function suggestions
- Code snippet templates for common patterns
- Document context-aware suggestions

#### Error Handling and Display
```javascript
const processCompileErrors = (errorLines, code) => {
    const codeLines = code.split('\n');
    let formattedError = '';
    
    for (let line of errorLines) {
        const lineColMatch = line.match(/(\d+):(\d+):/);
        
        if (lineColMatch) {
            const lineNum = parseInt(lineColMatch[1]);
            const colNum = parseInt(lineColMatch[2]);
            
            if (lineNum > 0 && lineNum <= codeLines.length) {
                const codeLine = codeLines[lineNum - 1];
                
                formattedError += line + '\n';
                formattedError += codeLine + '\n';
                
                if (colNum > 0 && colNum <= codeLine.length) {
                    formattedError += ' '.repeat(colNum - 1) + '^\n';
                }
                
                continue;
            }
        }
        
        formattedError += line + '\n';
    }
    
    return formattedError;
};
```

#### Code Execution Flow
1. User inputs code in the CodeMirror editor
2. Basic syntax checking happens in real-time
3. Upon execution, code is sent to the backend API
4. The backend compiles and runs the code in an isolated environment
5. Results are returned and displayed in the output panel
6. Error messages are formatted for better understanding

### Backend Implementation

#### Code Execution Security
The backend implements a defense-in-depth approach to security:
1. **Pattern Validation**: Scans code for potentially dangerous constructs
2. **Static Analysis**: Uses CppCheck to identify unsafe code patterns
3. **Resource Limitation**: Sets strict CPU and memory boundaries
4. **Isolation**: Executes code in a containerized environment
5. **Timeouts**: Enforces strict execution time limits

#### API Response Format
All API endpoints follow a consistent response format:
```json
{
  "status": "success|error",
  "data": {
    // Response data specific to the endpoint
  },
  "message": "Optional message"
}
```

#### JWT Authentication Flow
1. User registers or logs in
2. Server validates credentials and generates a JWT
3. Token is stored in localStorage on the client
4. Token is included in the Authorization header for API requests
5. Server validates the token for protected endpoints

## Acknowledgements

- [CodeMirror](https://codemirror.net/) for the powerful text editor
- [Express.js](https://expressjs.com/) for the backend framework
- [Docker](https://www.docker.com/) and [gVisor](https://gvisor.dev/) for secure execution
- [JWT](https://jwt.io/) for authentication 