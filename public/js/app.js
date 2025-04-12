document.addEventListener('DOMContentLoaded', () => {
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

    codeEditor.on('keyup', function(cm, event) {
        if ((!cm.state.completionActive && 
             /^[a-zA-Z0-9_\.\>\:]$/.test(String.fromCharCode(event.keyCode))) ||
            event.keyCode === 8) {
            CodeMirror.commands.autocomplete(cm, null, {completeSingle: false});
        }
    });

    let syntaxCheckTimer = null;
    codeEditor.on('change', function(cm) {
        clearTimeout(syntaxCheckTimer);
        syntaxCheckTimer = setTimeout(function() {
            checkCodeSyntax(cm.getValue());
        }, 1000);
    });

    const checkCodeSyntax = (code) => {
        const errors = [];
        
        let openParens = 0, openBraces = 0, openBrackets = 0;
        
        for (let i = 0; i < code.length; i++) {
            switch(code[i]) {
                case '(': openParens++; break;
                case ')': openParens--; break;
                case '{': openBraces++; break;
                case '}': openBraces--; break;
                case '[': openBrackets++; break;
                case ']': openBrackets--; break;
            }
            
            if (openParens < 0 || openBraces < 0 || openBrackets < 0) {
                errors.push(`Unexpected closing bracket/brace/parenthesis at position ${i}`);
                break;
            }
        }
        
        if (openParens > 0) errors.push(`${openParens} unclosed parentheses`);
        if (openBraces > 0) errors.push(`${openBraces} unclosed braces`);
        if (openBrackets > 0) errors.push(`${openBrackets} unclosed brackets`);
        
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.endsWith('{') && !line.endsWith('}') && 
                !line.endsWith(';') && !line.startsWith('#') && 
                !line.startsWith('//') && line.length > 0) {
                
                if (!line.includes('class ') && !line.includes('struct ') && 
                    !line.includes('if ') && !line.includes('else') && 
                    !line.includes('for ') && !line.includes('while ') && 
                    !line.includes('switch ') && !line.includes('case ')) {
                    
                    if (!line.endsWith(':')) {
                        codeEditor.addLineClass(i, 'background', 'line-warning');
                    }
                }
            } else {
                codeEditor.removeLineClass(i, 'background', 'line-warning');
            }
        }
        
        if (errors.length > 0) {
            console.warn('Syntax warnings:', errors);
        }
    };

    let isLoggedIn = false;
    let token = localStorage.getItem('token');
    let currentUser = null;

    const runBtn = document.getElementById('run-btn');
    const saveBtn = document.getElementById('save-btn');
    const clearOutputBtn = document.getElementById('clear-output-btn');
    const myCodesBtn = document.getElementById('my-codes-btn');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const cppVersionSelect = document.getElementById('cpp-version');
    const codeTitle = document.getElementById('code-title');
    const inputArea = document.getElementById('input');
    const outputArea = document.getElementById('output');
    const usernameDisplay = document.getElementById('username-display');

    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const myCodesModal = document.getElementById('my-codes-modal');
    const codesList = document.getElementById('codes-list');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const closeButtons = document.querySelectorAll('.close');

    const API_BASE_URL = 'http://localhost:3000/api';
    const COMPILER_ENDPOINT = `${API_BASE_URL}/compiler/cpp`;
    const CODES_ENDPOINT = `${API_BASE_URL}/codes`;
    const AUTH_ENDPOINT = `${API_BASE_URL}/auth`;

    const checkAuthStatus = async () => {
        if (token) {
            try {
                const response = await fetch(`${AUTH_ENDPOINT}/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    currentUser = data.data.user;
                    isLoggedIn = true;
                    updateAuthUI();
                } else {
                    localStorage.removeItem('token');
                    token = null;
                    isLoggedIn = false;
                    updateAuthUI();
                }
            } catch (error) {
                console.error('Auth check error:', error);
                isLoggedIn = false;
                updateAuthUI();
            }
        } else {
            isLoggedIn = false;
            updateAuthUI();
        }
    };

    const updateAuthUI = () => {
        if (isLoggedIn && currentUser) {
            usernameDisplay.textContent = currentUser.username;
            loginBtn.classList.add('hidden');
            registerBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            myCodesBtn.classList.remove('hidden');
            saveBtn.disabled = false;
        } else {
            usernameDisplay.textContent = 'Guest';
            loginBtn.classList.remove('hidden');
            registerBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            saveBtn.disabled = true;
        }
    };

    const runCode = async () => {
        const code = codeEditor.getValue();
        const input = inputArea.value;
        const cppVersion = cppVersionSelect.value;
        
        if (!code.trim()) {
            showOutput('Please write some code first', true);
            return;
        }
        
        showOutput('Running...', false);
        
        try {
            const response = await fetch(COMPILER_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ code, input, cppVersion })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                showOutput(data.data.output || 'Program executed successfully with no output', false);
            } else {
                let errorMessage = data.data.output || 'Execution failed';
                
                const errorLines = errorMessage.split('\n');
                const formattedError = processCompileErrors(errorLines, code);
                
                showOutput(formattedError, true);
                
                if (data.data.security_issues && data.data.security_issues.length > 0) {
                    const securityIssues = document.createElement('div');
                    securityIssues.className = 'security-issues';
                    securityIssues.innerHTML = '<strong>Security Issues:</strong><br>' + 
                        data.data.security_issues.join('<br>');
                    outputArea.appendChild(securityIssues);
                }
            }
        } catch (error) {
            console.error('Compilation error:', error);
            showOutput('Failed to communicate with the server', true);
        }
    };

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

    const saveCode = async () => {
        if (!isLoggedIn) {
            showModal('Please login to save your code');
            return;
        }
        
        const title = codeTitle.value.trim() || 'Untitled Code';
        const code = codeEditor.getValue();
        const cppVersion = cppVersionSelect.value;
        
        if (!code.trim()) {
            showModal('Cannot save empty code');
            return;
        }
        
        try {
            const response = await fetch(CODES_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, code, cppVersion })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showModal('Code saved successfully!');
                codeTitle.value = title;
            } else {
                showModal(`Failed to save: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Save error:', error);
            showModal('Failed to communicate with the server');
        }
    };

    const loadMyCodes = async () => {
        if (!isLoggedIn) {
            showModal('Please login to view your codes');
            return;
        }
        
        try {
            const response = await fetch(CODES_ENDPOINT, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                displayCodesList(data.data.codes);
                myCodesModal.style.display = 'block';
            } else {
                showModal(`Failed to load codes: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Load codes error:', error);
            showModal('Failed to communicate with the server');
        }
    };

    const displayCodesList = (codes) => {
        codesList.innerHTML = '';
        
        if (!codes || codes.length === 0) {
            codesList.innerHTML = '<p>You have no saved codes yet.</p>';
            return;
        }
        
        codes.forEach(code => {
            const codeItem = document.createElement('div');
            codeItem.className = 'code-item';
            
            const codeInfo = document.createElement('div');
            codeInfo.className = 'code-info';
            
            const codeTitle = document.createElement('div');
            codeTitle.className = 'code-item-title';
            codeTitle.textContent = code.title;
            
            const codeVersion = document.createElement('div');
            codeVersion.className = 'code-item-version';
            codeVersion.textContent = code.cppVersion || 'C++17';
            
            codeInfo.appendChild(codeTitle);
            codeInfo.appendChild(codeVersion);
            
            const codeActions = document.createElement('div');
            codeActions.className = 'code-item-actions';
            
            const loadBtn = document.createElement('button');
            loadBtn.innerHTML = '<i class="fas fa-folder-open"></i>';
            loadBtn.title = 'Load code';
            loadBtn.addEventListener('click', () => loadCode(code));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'Delete code';
            deleteBtn.addEventListener('click', () => deleteCode(code.id));
            
            codeActions.appendChild(loadBtn);
            codeActions.appendChild(deleteBtn);
            
            codeItem.appendChild(codeInfo);
            codeItem.appendChild(codeActions);
            
            codesList.appendChild(codeItem);
        });
    };

    const loadCode = async (code) => {
        codeEditor.setValue(code.code);
        codeTitle.value = code.title;
        
        if (code.cppVersion) {
            cppVersionSelect.value = code.cppVersion;
        }
        
        myCodesModal.style.display = 'none';
        showModal('Code loaded successfully!');
    };

    const deleteCode = async (id) => {
        if (confirm('Are you sure you want to delete this code?')) {
            try {
                const response = await fetch(`${CODES_ENDPOINT}/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    showModal('Code deleted successfully!');
                    loadMyCodes();
                } else {
                    const data = await response.json();
                    showModal(`Failed to delete: ${data.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Delete error:', error);
                showModal('Failed to communicate with the server');
            }
        }
    };

    const showOutput = (message, isError) => {
        outputArea.innerHTML = '';
        const outputText = document.createElement('pre');
        outputText.textContent = message;
        
        if (isError) {
            outputText.classList.add('error-text');
        } else {
            outputText.classList.remove('error-text');
        }
        
        outputArea.appendChild(outputText);
        
        outputArea.scrollTop = outputArea.scrollHeight;
    };

    const showModal = (message) => {
        modalBody.innerHTML = `<p>${message}</p>`;
        modal.style.display = 'block';
    };

    const login = async (email, password) => {
        try {
            const response = await fetch(`${AUTH_ENDPOINT}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                token = data.token;
                localStorage.setItem('token', token);
                currentUser = data.data.user;
                isLoggedIn = true;
                updateAuthUI();
                loginModal.style.display = 'none';
                showModal('Logged in successfully!');
            } else {
                showModal(`Login failed: ${data.message || 'Invalid credentials'}`);
            }
        } catch (error) {
            console.error('Login error:', error);
            showModal('Failed to communicate with the server');
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await fetch(`${AUTH_ENDPOINT}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                registerModal.style.display = 'none';
                showModal('Registered successfully! You can now login.');
            } else {
                showModal(`Registration failed: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Registration error:', error);
            showModal('Failed to communicate with the server');
        }
    };

    const logout = async () => {
        try {
            await fetch(`${AUTH_ENDPOINT}/logout`);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            token = null;
            currentUser = null;
            isLoggedIn = false;
            updateAuthUI();
            showModal('Logged out successfully!');
        }
    };

    runBtn.addEventListener('click', runCode);
    saveBtn.addEventListener('click', saveCode);
    myCodesBtn.addEventListener('click', loadMyCodes);
    loginBtn.addEventListener('click', () => loginModal.style.display = 'block');
    registerBtn.addEventListener('click', () => registerModal.style.display = 'block');
    logoutBtn.addEventListener('click', logout);
    clearOutputBtn.addEventListener('click', () => outputArea.innerHTML = '');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        login(email, password);
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        register(username, email, password);
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'none';
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
            myCodesModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === registerModal) registerModal.style.display = 'none';
        if (e.target === myCodesModal) myCodesModal.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            runCode();
        }
        
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (isLoggedIn) {
                saveCode();
            } else {
                loginModal.style.display = 'block';
            }
        }
    });

    checkAuthStatus();
}); 