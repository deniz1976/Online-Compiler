import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import { CppVersion } from '../domain/Code';

const execAsync = promisify(exec);

interface ExecutionResult {
  success: boolean;
  output: string;
  executionTime?: number;
  memoryUsage?: number;
  error?: string;
}

export class SecureRunner {
  private static readonly TEMP_DIR = path.join(os.tmpdir(), 'online-compiler');
  private static readonly MAX_EXECUTION_TIME = 10000;
  private static readonly MEMORY_LIMIT_MB = 50;
  private static readonly CPU_LIMIT = 0.25;
  private static readonly TIME_LIMIT_SEC = 3;
  private static readonly PROCESS_LIMIT = 10;
  
  private static getCppVersionFlag(version: CppVersion): string {
    const versionFlags: Record<CppVersion, string> = {
      'cpp98': '-std=c++98',
      'cpp11': '-std=c++11',
      'cpp14': '-std=c++14',
      'cpp17': '-std=c++17',
      'cpp20': '-std=c++20'
    };
    
    return versionFlags[version] || '-std=c++17'; 
  }
  
  static async initialize(): Promise<void> {
    try {
      if (!fsSync.existsSync(this.TEMP_DIR)) {
        await fs.mkdir(this.TEMP_DIR, { recursive: true });
      }
      
      await execAsync('docker pull gcc:latest');
      await execAsync('docker pull alpine:latest');
      
      try {
        await execAsync('docker network create --driver bridge compiler-network');
      } catch (err) {
      }
      
      console.log('Secure runner environment initialized');
    } catch (error) {
      console.error('Failed to initialize secure runner:', error);
      throw error;
    }
  }
  

  static async runCpp(code: string, input: string, cppVersion: CppVersion = 'cpp17'): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const runId = uuidv4().split('-')[0];
    const containerId = `cpp-${runId}`;
    const tmpDir = path.join(os.tmpdir(), 'online-compiler');
    const codeFilePath = path.join(tmpDir, `${runId}.cpp`);
    const inputFilePath = path.join(tmpDir, `${runId}.input`);
    
    if (!fsSync.existsSync(tmpDir)) {
      await fs.mkdir(tmpDir, { recursive: true });
    }
    
    try {
      await fs.writeFile(codeFilePath, code);
      await fs.writeFile(inputFilePath, input);
      
      return await this.compileInContainer(containerId, codeFilePath, inputFilePath, cppVersion);
    } catch (error: any) {
      return {
        stdout: '',
        stderr: `Execution error: ${error.message || 'Unknown error'}`,
        exitCode: 1
      };
    } finally {
      try {
        if (fsSync.existsSync(codeFilePath)) {
          await fs.unlink(codeFilePath);
        }
        if (fsSync.existsSync(inputFilePath)) {
          await fs.unlink(inputFilePath);
        }
      } catch (err) {
      }
    }
  }
  

  private static async compileInContainer(
    containerId: string,
    codeFilePath: string,
    inputFilePath: string,
    cppVersion: CppVersion = 'cpp17'
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      await execAsync(`docker run --name ${containerId} -d -i gcc:latest tail -f /dev/null`);
      
      await execAsync(`docker cp "${codeFilePath}" ${containerId}:/code.cpp`);
      await execAsync(`docker cp "${inputFilePath}" ${containerId}:/input.txt`);
      
      try {
        const cppStandardFlag = this.getCppVersionFlag(cppVersion);
        await execAsync(`docker exec ${containerId} g++ -o program /code.cpp ${cppStandardFlag} -Wall`);
        
        const { stdout, stderr } = await execAsync(
          `docker exec ${containerId} sh -c "cat /input.txt | timeout 2s ./program"`,
          { maxBuffer: 1024 * 1024 }
        );
        
        return {
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: 0
        };
      } catch (error: any) {
        if (error.stderr && error.stderr.includes('error:')) {
          return {
            stdout: '',
            stderr: `Compilation error: ${error.stderr}`,
            exitCode: 1
          };
        } else {
          return {
            stdout: error.stdout || '',
            stderr: error.stderr || 'Execution error: Timeout or runtime error',
            exitCode: error.code || 1
          };
        }
      }
    } catch (error: any) {
      return {
        stdout: '',
        stderr: `Docker error: ${error.message || 'Unknown error'}`,
        exitCode: 1
      };
    } finally {
      try {
        await execAsync(`docker rm -f ${containerId}`);
      } catch (err) {
      }
    }
  }
  
  private static async cleanup(files: string[], ...containerIds: string[]): Promise<void> {
    try {
      for (const file of files) {
        try {
          if (fsSync.existsSync(file)) {
            await fs.unlink(file);
          }
        } catch (err) {
        }
      }
      
      for (const containerId of containerIds) {
        try {
          await execAsync(`docker rm -f ${containerId}`);
        } catch (err) {
        }
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  }
} 