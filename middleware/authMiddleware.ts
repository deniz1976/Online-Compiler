import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new ApiError('Please log in', 401));
    }

    const jwtSecret = process.env.JWT_SECRET || 'default_secret_please_change';
    
    const decoded = jwt.verify(
      token,
      Buffer.from(jwtSecret)
    ) as JwtPayload;

    req.user = {
      id: decoded.id,
    };

    next();
  } catch (error) {
    next(new ApiError('Authentication failed', 401));
  }
}; 