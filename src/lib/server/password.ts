import { encodeHexLowerCase } from '@oslojs/encoding';
import { pbkdf2Sync } from 'node:crypto';

export async function hashPassword(password: string): Promise<string> {
    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = encodeHexLowerCase(salt);
    
    // Hash the password with the salt using pbkdf2
    const hashedBytes = pbkdf2Sync(
        password,
        salt,
        100000, // iterations
        32, // key length
        'sha256'
    );
    
    const hashedHex = encodeHexLowerCase(hashedBytes);
    
    // Return salt and hash combined
    return `${saltHex}:${hashedHex}`;
}

export async function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    try {
        const [saltHex, storedHashHex] = hashedPassword.split(':');
        if (!saltHex || !storedHashHex) return false;
        
        // Convert hex salt back to Uint8Array
        const salt = Uint8Array.from(
            saltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
        );
        
        // Hash the provided password with the same salt
        const calculatedHash = pbkdf2Sync(
            plainPassword,
            salt,
            100000,
            32,
            'sha256'
        );
        
        const calculatedHex = encodeHexLowerCase(calculatedHash);
        
        // Compare the hashes
        return calculatedHex === storedHashHex;
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}