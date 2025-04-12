import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import * as fsSync from 'fs';

const execAsync = promisify(exec);


const SECURITY_CHECKS = {
  severeDanger: [
    { pattern: /system\s*\(/g, name: 'system()' },
    { pattern: /popen\s*\(/g, name: 'popen()' },
    { pattern: /exec[lv]?[pe]?\s*\(/g, name: 'exec family functions' },
    { pattern: /fork\s*\(/g, name: 'fork()' },
  ],
  
  network: [
    { pattern: /socket\s*\(/g, name: 'socket()' },
    { pattern: /connect\s*\(/g, name: 'connect()' },
    { pattern: /bind\s*\(/g, name: 'bind()' },
    { pattern: /\blisten\s*\(/g, name: 'listen()' },
  ],
  
  fileOperations: [
    { pattern: /\bfopen\s*\(/g, name: 'fopen()' },
    { pattern: /\bfreopen\s*\(/g, name: 'freopen()' },
    { pattern: /std::ofstream/g, name: 'std::ofstream' },
    { pattern: /std::ifstream/g, name: 'std::ifstream' },
    { pattern: /std::fstream/g, name: 'std::fstream' },
  ],
  
  processControl: [
    { pattern: /\bkill\s*\(/g, name: 'kill()' },
    { pattern: /\babort\s*\(/g, name: 'abort()' },
    { pattern: /\bexit\s*\(/g, name: 'exit()' },
  ],
  
  memoryOps: [
    { pattern: /\balloca\s*\(/g, name: 'alloca()' },
  ]
};

const LOOP_PATTERNS = [
  { pattern: /while\s*\(\s*true\s*\)/g, name: 'while(true)' },
  { pattern: /while\s*\(\s*1\s*\)/g, name: 'while(1)' },
  { pattern: /for\s*\(\s*;;\s*\)/g, name: 'for(;;)' },
];


const LOOP_EXIT_PATTERNS = [
  /\bbreak\s*;/g,
  /\breturn\b/g,
  /\bthrow\b/g,
  /\bexit\s*\(/g,
  /\bstd::exit\s*\(/g,
];


const DANGEROUS_INCLUDES = [
  'process.h', 'thread', 'filesystem', 'socket', 'windows.h', 'unistd.h',
  'sys/socket.h', 'arpa/inet.h', 'netinet/in.h', 'signal.h'
];

const ALLOWED_INCLUDES = [
  'iostream', 'vector', 'string', 'map', 'unordered_map', 'set', 
  'unordered_set', 'list', 'deque', 'queue', 'stack', 'algorithm',
  'cmath', 'numeric', 'iterator', 'utility', 'functional', 'memory',
  'chrono', 'random', 'array', 'tuple', 'iomanip', 'sstream', 
  'fstream', 'cctype', 'cstring', 'limits', 'stdexcept'
];


export class CodeValidator {
 
  static validateCode(code: string): { safe: boolean; issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    SECURITY_CHECKS.severeDanger.forEach(check => {
      if (check.pattern.test(code)) {
        issues.push(`Prohibited system call detected: ${check.name}`);
      }
    });
    
    SECURITY_CHECKS.network.forEach(check => {
      if (check.pattern.test(code)) {
        issues.push(`Network operation not allowed: ${check.name}`);
      }
    });
    
    SECURITY_CHECKS.fileOperations.forEach(check => {
      if (check.pattern.test(code)) {
        const fileOpUsage = code.match(new RegExp(`${check.pattern.source.replace(/\\bg/, '').replace(/\\s\*\\\(/g, '\\s*\\([^)]*')}`, 'g'));
        
        if (fileOpUsage && fileOpUsage.some(match => 
          /\/etc\/|\/var\/|\/root\/|\/home\/|\/usr\/|\/bin\/|\.\.\/|~\//.test(match))) {
          issues.push(`File operation with sensitive path detected: ${check.name}`);
        } else {
          warnings.push(`File operation detected (allowed but monitored): ${check.name}`);
        }
      }
    });
    
    SECURITY_CHECKS.processControl.forEach(check => {
      if (check.pattern.test(code)) {
        warnings.push(`Process control operation detected: ${check.name}`);
      }
    });
    
    SECURITY_CHECKS.memoryOps.forEach(check => {
      if (check.pattern.test(code)) {
        warnings.push(`Potentially unsafe memory operation: ${check.name}`);
      }
    });
    
    LOOP_PATTERNS.forEach(loopPattern => {
      if (loopPattern.pattern.test(code)) {
        let hasExitPoint = false;
        
        const regex = new RegExp(loopPattern.pattern.source.replace(/\\bg/, '').replace(/\g$/, '') + '\\s*{([^{}]|{[^{}]*})*}', 'g');
        const loopBlocks = code.match(regex);
        
        if (loopBlocks) {
          for (const block of loopBlocks) {
            if (LOOP_EXIT_PATTERNS.some(exitPattern => exitPattern.test(block))) {
              hasExitPoint = true;
              break;
            }
          }
          
          if (!hasExitPoint) {
            issues.push(`Potential infinite loop detected: ${loopPattern.name} without exit points`);
          } else {
            warnings.push(`Loop pattern detected with exit points: ${loopPattern.name}`);
          }
        } else {
          warnings.push(`Loop pattern detected but couldn't analyze structure: ${loopPattern.name}`);
        }
      }
    });
    
    const includeRegex = /#include\s*<([^>]+)>/g;
    let match;
    while ((match = includeRegex.exec(code)) !== null) {
      const include = match[1].trim();
      
      if (DANGEROUS_INCLUDES.includes(include)) {
        issues.push(`Prohibited include detected: <${include}>`);
      } else if (!ALLOWED_INCLUDES.includes(include)) {
        warnings.push(`Unknown include detected: <${include}>`);
      }
    }
    
    if ((code.match(/for\s*\(/g) || []).length > 15) {
      warnings.push('Code has many loops - possible complexity issue');
    }
    
    const largeAllocationRegex = /new\s+\w+\s*\[\s*([0-9]+)\s*\]/g;
    while ((match = largeAllocationRegex.exec(code)) !== null) {
      const size = parseInt(match[1]);
      if (size > 10000000) { 
        issues.push(`Extremely large memory allocation detected: ${size} elements`);
      } else if (size > 1000000) { 
        warnings.push(`Large memory allocation detected: ${size} elements`);
      }
    }
    
    return {
      safe: issues.length === 0,
      issues,
      warnings
    };
  }
  

  static async staticAnalysis(code: string, tempDir: string): Promise<{ safe: boolean; issues: string[]; warnings: string[] }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const analysisId = uuidv4().split('-')[0];
    const containerId = `cppcheck-${analysisId}`;
    const tmpDir = path.join(os.tmpdir(), 'online-compiler');
    const codeFilePath = path.join(tmpDir, `analysis_${analysisId}.cpp`);
    
    if (!fsSync.existsSync(tmpDir)) {
      await fs.mkdir(tmpDir, { recursive: true });
    }
    
    try {
      await fs.writeFile(codeFilePath, code);
      
      try {
        await execAsync('docker pull pipelinecomponents/cppcheck:latest');
      } catch (error) {
        warnings.push('Static analysis skipped: Failed to pull cppcheck image');
        return { safe: true, issues: [], warnings };
      }
      
      try {
        await execAsync(`docker run --name ${containerId} -d -i pipelinecomponents/cppcheck:latest tail -f /dev/null`);
        
        await execAsync(`docker cp "${codeFilePath}" ${containerId}:/code.cpp`);
        
        const { stdout, stderr } = await execAsync(
          `docker exec ${containerId} cppcheck --enable=all --suppress=missingIncludeSystem /code.cpp 2>&1`
        );
        
        const output = stdout || stderr || '';
        
        const errorLines = output.split('\n').filter(line => line.includes('error:'));
        const warningLines = output.split('\n').filter(line => 
          line.includes('warning:') || 
          line.includes('style:') || 
          line.includes('performance:')
        );
        
        errorLines.forEach(line => {
          issues.push(`Static analysis error: ${line.trim()}`);
        });
        
        warningLines.forEach(line => {
          warnings.push(`Static analysis warning: ${line.trim()}`);
        });
        
      } catch (error: any) {
        warnings.push(`Static analysis error: ${error.message || 'Unknown error'}`);
      } finally {
        try {
          if (fsSync.existsSync(codeFilePath)) {
            await fs.unlink(codeFilePath);
          }
        } catch (err) {
        }
        
        try {
          await execAsync(`docker rm -f ${containerId}`);
        } catch (err) {
        }
      }
      
      return {
        safe: issues.length === 0,
        issues,
        warnings
      };
    } catch (error: any) {
      warnings.push(`Static analysis error: ${error.message || 'Unknown error'}`);
      
      try {
        if (fsSync.existsSync(codeFilePath)) {
          await fs.unlink(codeFilePath);
        }
      } catch (err) {
      }
      
      return {
        safe: true, 
        issues: [],
        warnings
      };
    }
  }
} 