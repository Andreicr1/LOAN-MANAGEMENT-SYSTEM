import { DatabaseService } from '../database/database.service';
export interface LoginResult {
    success: boolean;
    user?: {
        id: number;
        username: string;
        role: string;
        fullName: string;
        mustChangePassword: boolean;
    };
    error?: string;
}
export declare class AuthService {
    private db;
    constructor(dbService: DatabaseService);
    login(username: string, password: string): Promise<LoginResult>;
    logout(userId: number): boolean;
    changePassword(userId: number, oldPassword: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
}
