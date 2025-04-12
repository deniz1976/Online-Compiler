import { Request, Response, NextFunction } from 'express';
import { CodeService } from '../services/CodeService';
import { ApiError } from '../middleware/errorHandler';
import { CppVersion } from '../domain/Code';

export const saveCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new ApiError('Please log in', 401));
      return;
    }

    const { title, code, language = 'cpp', cppVersion } = req.body;

    if (!title || !code) {
      next(new ApiError('Title and code are required', 400));
      return;
    }

    // Geçerli bir C++ sürümü mü kontrol et
    const validVersions: CppVersion[] = ['cpp98', 'cpp11', 'cpp14', 'cpp17', 'cpp20'];
    const selectedVersion: CppVersion = validVersions.includes(cppVersion) ? cppVersion : 'cpp17';

    const savedCode = await CodeService.saveCode(req.user.id, title, code, language, selectedVersion);

    res.status(201).json({
      status: 'success',
      data: {
        code: savedCode
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new ApiError('Please log in', 401));
      return;
    }

    const { id } = req.params;
    const { title, code, cppVersion } = req.body;

    if (!title || !code) {
      next(new ApiError('Title and code are required', 400));
      return;
    }

    // Geçerli bir C++ sürümü mü kontrol et
    let selectedVersion: CppVersion | undefined = undefined;
    if (cppVersion) {
      const validVersions: CppVersion[] = ['cpp98', 'cpp11', 'cpp14', 'cpp17', 'cpp20'];
      selectedVersion = validVersions.includes(cppVersion) ? cppVersion : undefined;
    }

    const updatedCode = await CodeService.updateCode(id, req.user.id, title, code, selectedVersion);

    res.status(200).json({
      status: 'success',
      data: {
        code: updatedCode
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new ApiError('Please log in', 401));
      return;
    }

    const { id } = req.params;
    const code = await CodeService.getCodeById(id, req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        code
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCodes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new ApiError('Please log in', 401));
      return;
    }

    const codes = await CodeService.getAllCodesByUser(req.user.id);

    res.status(200).json({
      status: 'success',
      results: codes.length,
      data: {
        codes
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new ApiError('Please log in', 401));
      return;
    }

    const { id } = req.params;
    await CodeService.deleteCode(id, req.user.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
}; 