import { UserRepository } from '../repositories/userRepository';
import { NewUser } from '../types/userTypes';
import { hashPassword } from '../utils/hash';

export async function createUser(user: NewUser) {
    try {
        const exists = await UserRepository.findUserByEmail(user.email);
        if (exists) {
            throw new Error('User already registered with this email');
        }

        const passwordHash = await hashPassword(user.password);

        return await UserRepository.createUser({
            ...user,
            password: passwordHash
        });
    } catch (error) {
        throw error;
    }
}


export async function getAllUsers() {
    return UserRepository.findAllUsers();
}

export async function getUserById(id: string) {
    return UserRepository.findUserById(id);
}

export async function getUserByEmail(email: string) {
    return UserRepository.findUserByEmail(email);
}

export async function updateUser(id: string, user: Partial<NewUser>) {
    if (user.password) {
        user.password = await hashPassword(user.password);
    }
    return UserRepository.updateUser(id, user);
}

export async function deleteUserByEmail(email: string) {
    return UserRepository.deleteUserByEmail(email);
}

export async function deleteUserById(id: string) {
    return UserRepository.deleteUser(id);
}
