import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { CppVersion } from '../domain/Code';

const execAsync = promisify(exec);

interface ExecutionResult {
  success: boolean;
  output: string;
  executionTime?: number;
  memoryUsage?: number;
  error?: string;
}

export class CompilerService {
  private static readonly TEMP_DIR = path.join(process.cwd(), 'temp');
  private static readonly MAX_EXECUTION_TIME = 10000;
  private static readonly MEMORY_LIMIT_MB = 50;
  private static readonly TIME_LIMIT_SEC = 5;
  
  private static getCppVersionFlag(version: CppVersion): string {
    const versionFlags: Record<CppVersion, string> = {
      'cpp98': '-std=c++98',
      'cpp11': '-std=c++11',
      'cpp14': '-std=c++14',
      'cpp17': '-std=c++17',
      'cpp20': '-std=c++20'
    };
    
    return versionFlags[version] || '-std=c++17'; // Default to C++17 if unknown
  }
  
  static async runCppCode(code: string, input: string = '', cppVersion: CppVersion = 'cpp17'): Promise<ExecutionResult> {
    const runId = uuidv4();
    const cppFilePath = path.join(this.TEMP_DIR, `${runId}.cpp`);
    const outPath = path.join(this.TEMP_DIR, `${runId}.out`);
    const inputFilePath = path.join(this.TEMP_DIR, `${runId}.in`);
    const resultPath = path.join(this.TEMP_DIR, `${runId}_result.txt`);
    
    try {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
      
      const startTime = Date.now();
      
      await fs.writeFile(cppFilePath, code);
      if (input) {
        await fs.writeFile(inputFilePath, input);
      }
      
      const cppStandardFlag = this.getCppVersionFlag(cppVersion);
      const compileCmd = `g++ ${cppStandardFlag} -O2 -Wall -o ${outPath} ${cppFilePath}`;
      
      const dockerCmd = `docker run --rm \
        --memory=${this.MEMORY_LIMIT_MB}m \
        --memory-swap=${this.MEMORY_LIMIT_MB}m \
        --network none \
        -v "${this.TEMP_DIR}:/code" \
        -w /code \
        gcc:latest \
        bash -c "${compileCmd} && timeout ${this.TIME_LIMIT_SEC} /code/${runId}.out ${input ? '< /code/' + runId + '.in' : ''} > /code/${runId}_result.txt"`;
      
      try {
        await execAsync(dockerCmd, { timeout: this.MAX_EXECUTION_TIME });
        
        const output = await fs.readFile(resultPath, 'utf-8');
        const executionTime = Date.now() - startTime;
        
        return {
          success: true,
          output,
          executionTime,
          memoryUsage: 0
        };
      } catch (error: any) {
        if (error.killed) {
          return {
            success: false,
            output: 'Execution timeout: Program terminated',
            error: 'Timeout'
          };
        }
        
        if (error.stderr && error.stderr.includes('error')) {
          return {
            success: false,
            output: error.stderr,
            error: 'Compilation error'
          };
        }
        
        return {
          success: false,
          output: error.stderr || error.message || 'Unknown error',
          error: 'Runtime error'
        };
      }
    } finally {
      try {
        await fs.unlink(cppFilePath).catch(() => {});
        await fs.unlink(outPath).catch(() => {});
        if (input) await fs.unlink(inputFilePath).catch(() => {});
        await fs.unlink(resultPath).catch(() => {});
      } catch (error) {
        console.error('Error cleaning up files:', error);
      }
    }
  }
} 