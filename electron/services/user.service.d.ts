import { DatabaseService } from '../database/database.service';
export interface User {
    id: number;
    username: string;
    role: string;
    fullName: string;
    email?: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
}
export declare class UserService {
    private db;
    constructor(dbService: DatabaseService);
    getAllUsers(): User[];
    getUserById(id: number): User | null;
    createUser(data: {
        username: string;
        password: string;
        role: string;
        fullName: string;
        email?: string;
        createdBy: number;
    }): Promise<{
        success: boolean;
        userId?: number;
        error?: string;
    }>;
    updateUser(id: number, data: {
        fullName?: string;
        email?: string;
        role?: string;
        isActive?: boolean;
    }): {
        success: boolean;
        error?: string;
    };
    deleteUser(id: number): {
        success: boolean;
        error?: string;
    };
    resetPassword(userId: number, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
}
