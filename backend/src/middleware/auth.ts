import { Request, Response, NextFunction } from 'express';

// Simple RBAC middleware stub - replace with real JWT/session validation
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (!user.roles || !user.roles.includes(role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

export function attachMockUser(req: Request, _res: Response, next: NextFunction) {
  // In development only: attaches a mock user
  (req as any).user = { id: 'dev-user', name: 'Dev User', roles: ['analyst', 'patrol'] };
  next();
}
