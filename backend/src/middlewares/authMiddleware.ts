import { Request, Response, NextFunction } from 'express';
import { validateToken } from '../utils/token';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token not provided' });

    const token = authHeader.split(' ')[1];
    const payload = validateToken(token);

    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    (req as any).user = payload;
    next();
}
