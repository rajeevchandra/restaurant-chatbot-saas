import { Request, Response, NextFunction } from 'express';

/**
 * Request timing middleware
 * Adds timing information to response headers and logs
 */
export function requestTiming(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const startHrTime = process.hrtime();

  // Store start time on request object
  (req as any).startTime = startTime;

  // Hook into response finish event
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: any[]) {
    const duration = Date.now() - startTime;
    const hrDuration = process.hrtime(startHrTime);
    const durationMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000;

    // Add timing headers
    res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    res.setHeader('X-Request-Id', (req as any).id);

    // Attach duration to request for logging
    (req as any).duration = duration;
    (req as any).durationMs = durationMs;

    // Call original end
    return originalEnd.apply(this, args as any);
  };

  next();
}
