import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'defaultSecret';

export function generateToken(payload: object): string {
    return jwt.sign(payload, SECRET, { expiresIn: '1d' });
}

export function validateToken(token: string): any {
    try {
        return jwt.verify(token, SECRET);
    } catch {
        return null;
    }
}