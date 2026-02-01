import { Request, Response, NextFunction } from 'express';

export function validateUserRegister(req: Request, res: Response, next: NextFunction) {

    if (!req.body) {
        return res.status(400).json({ error: 'User data is required.' });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    next();
};

export function validateUserLogin(req: Request, res: Response, next: NextFunction) {

    if (!req.body) {
        return res.status(400).json({ error: 'User data is required.' });
    }
    
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    next();
};

export function validateUserUpdate(req: Request, res: Response, next: NextFunction) {
    if (!req.body) {
        return res.status(400).json({ error: 'User data is required.' });
    }

    const { name, email, password, profile_pic } = req.body;
    const hasFile = Boolean((req as any).file);

    const hasAnyField =
        typeof name !== 'undefined' ||
        typeof email !== 'undefined' ||
        typeof password !== 'undefined' ||
        typeof profile_pic !== 'undefined';

    if (!hasAnyField && !hasFile) {
        return res.status(400).json({ error: 'At least one field must be provided.' });
    }

    next();
};
