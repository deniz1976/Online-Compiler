import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { ApiError } from '../middleware/errorHandler';

const sendTokenCookie = (res: Response, token: string) => {
  const cookieOptions = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES_IN || '1') * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res.cookie('jwt', token, cookieOptions);
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      next(new ApiError('Please fill in all required fields', 400));
      return;
    }

    const user = await UserService.register(username, email, password);

    const { password: _, ...userResponse } = user;

    res.status(201).json({
      status: 'success',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      next(new ApiError('Please provide email and password', 400));
      return;
    }

    const { user, token } = await UserService.login(email, password);

    const { password: _, ...userResponse } = user;

    sendTokenCookie(res, token);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response): void => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new ApiError('Please log in', 401));
      return;
    }

    const user = await UserService.getUserById(req.user.id);
    
    if (!user) {
      next(new ApiError('No user found with this ID', 404));
      return;
    }

    const { password: _, ...userResponse } = user;

    res.status(200).json({
      status: 'success',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    next(error);
  }
}; 