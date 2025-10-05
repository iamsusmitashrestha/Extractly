import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  logger.http(`${req.method} ${req.path} - ${req.ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? 'ERROR' : 'OK';
    
    const logLevel = res.statusCode >= 400 ? 'error' : 'http';
    logger[logLevel](`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};
