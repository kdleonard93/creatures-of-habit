import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}