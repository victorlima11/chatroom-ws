import { createUser, getUserByEmail, updateUser } from '../services/userService';
import { User } from '../types/userTypes';
import { comparePassword } from '../utils/hash';
import { generateToken } from '../utils/token';
import { Request, Response } from 'express';

function toSafeUser(user: User) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_pic: user.profile_pic,
        created_at: user.created_at,
    };
}

export async function login(req: Request, res: Response) {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email });
    return res.json({ user: toSafeUser(user), token });
}

export async function register(req: Request, res: Response) {
    const newUser = req.body;
    try {
        const createdUser = await createUser(newUser);
        const token = generateToken({ id: createdUser.id, email: createdUser.email });
        return res.status(201).json({ user: toSafeUser(createdUser), token });
    } catch (error: any) {
        return res.status(400).json({ error: error?.message });
    }
}

export async function updateMe(req: Request, res: Response) {
    const authUser = (req as any).user;
    if (!authUser?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const updates = { ...req.body } as Record<string, any>;
        const file = (req as any).file;
        if (file?.filename) {
            updates.profile_pic = `/uploads/${file.filename}`;
        }

        const updatedUser = await updateUser(authUser.id, updates);
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ user: toSafeUser(updatedUser) });
    } catch (error: any) {
        return res.status(400).json({ error: error?.message });
    }
}
