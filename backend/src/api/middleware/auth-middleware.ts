import { Request, Response, NextFunction } from 'express';
import { CryptoHelper } from '../../config/crypto-helper';
import { auditService } from '../../services/audit-service';

// Extend express Request interface to support user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        badgeNumber: string;
        name: string;
        role: 'dispatcher' | 'supervisor' | 'officer';
      };
    }
  }
}

export const authenticateJwt = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header is missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = CryptoHelper.verifyToken(token);
    req.user = {
      id: decoded.id,
      badgeNumber: decoded.badgeNumber,
      name: decoded.name,
      role: decoded.role
    };
    next();
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid authorization token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      auditService.record({
        userId: req.user.badgeNumber,
        action: 'RBAC_VIOLATION',
        resource: `${req.method} ${req.originalUrl}`,
        status: 'denied',
        changes: { userRole: req.user.role, requiredRoles: allowedRoles }
      });
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges for this operation' });
    }

    next();
  };
};

export const accessAuditor = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const badge = req.user?.badgeNumber || 'ANONYMOUS';
    
    // Ignore static assets or simple health checks in audit logs to keep it clean
    if (req.originalUrl === '/health' || req.originalUrl.includes('assets') || req.originalUrl.includes('favicon')) {
      return;
    }

    auditService.record({
      userId: badge,
      action: 'API_REQUEST',
      resource: `${req.method} ${req.originalUrl}`,
      status: res.statusCode >= 400 ? 'failed' : 'success',
      changes: {
        ip: req.ip || req.socket.remoteAddress,
        statusCode: res.statusCode,
        responseTimeMs: duration
      }
    });
  });
  next();
};
