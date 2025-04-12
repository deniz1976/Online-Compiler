import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { CodeValidator } from '../services/CodeValidator';
import { SecureRunner } from '../services/SecureRunner';
import { CodeService } from '../services/CodeService';
import { CppVersion } from '../domain/Code';

export const compileCpp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, input, saveCode, cppVersion } = req.body;

    if (!code) {
      next(new ApiError('Code field cannot be empty', 400));
      return;
    }

    const validVersions: CppVersion[] = ['cpp98', 'cpp11', 'cpp14', 'cpp17', 'cpp20'];
    const selectedVersion: CppVersion = validVersions.includes(cppVersion) ? cppVersion : 'cpp17';

    const validationResult = CodeValidator.validateCode(code);
    
    if (!validationResult.safe) {
      res.status(400).json({
        status: 'error',
        data: {
          success: false,
          output: 'Code contains potentially unsafe patterns',
          security_issues: validationResult.issues,
          warnings: validationResult.warnings
        }
      });
      return;
    }

    let staticAnalysisWarnings: string[] = [];
    try {
      const staticAnalysisResult = await CodeValidator.staticAnalysis(code, '');
      
      staticAnalysisWarnings = staticAnalysisResult.warnings || [];
      
      if (!staticAnalysisResult.safe) {
        res.status(400).json({
          status: 'error',
          data: {
            success: false,
            output: 'Static analysis detected potential issues',
            security_issues: staticAnalysisResult.issues,
            warnings: [...validationResult.warnings, ...staticAnalysisWarnings]
          }
        });
        return;
      }
    } catch (error: any) {
      console.error('Static analysis error:', error);
      staticAnalysisWarnings = [`Static analysis skipped: ${error.message || 'Unknown error'}`];
    }

    const executionResult = await SecureRunner.runCpp(code, input || '', selectedVersion);
    
    const success = executionResult.exitCode === 0;
    const output = success ? executionResult.stdout : executionResult.stderr;
    const allWarnings = [...validationResult.warnings, ...staticAnalysisWarnings];

    let savedCode;
    if (success && saveCode && req.user) {
      const { title } = req.body;
      if (title) {
        try {
          savedCode = await CodeService.saveCode(req.user.id, title, code, 'cpp', selectedVersion);
        } catch (error) {
          console.error('Error saving code:', error);
        }
      }
    }

    res.status(200).json({
      status: success ? 'success' : 'error',
      data: {
        success,
        output,
        error: success ? undefined : 'Compilation failed',
        executionTime: 0,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
        savedCode: savedCode || undefined,
        cppVersion: selectedVersion
      }
    });
  } catch (error) {
    console.error('Compiler error:', error);
    next(error);
  }
};

export const initializeCompilerService = async () => {
  try {
    await SecureRunner.initialize();
    console.log('Compiler service initialized with secure runner');
  } catch (error) {
    console.error('Failed to initialize compiler service:', error);
    process.exit(1);
  }
}; 