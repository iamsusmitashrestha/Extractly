import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  console.log(`${req.method} ${req.path} - ${req.ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? 'ERROR' : 'OK';
    
    console.log(
      `${statusColor} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};
