import * as crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'ahmedabad_police_secure_secret_key_2026';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'aegis_secure_encryption_key_32bytes_len'; // 32 bytes key

export class CryptoHelper {
  // ─── 1. Password Hashing (PBKDF2) ──────────────────────────────────────────
  public static hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
    return { hash, salt };
  }

  public static verifyPassword(password: string, hash: string, salt: string): boolean {
    const calculatedHash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
    return calculatedHash === hash;
  }

  // ─── 2. JSON Web Token (HMAC-SHA256) ───────────────────────────────────────
  public static signToken(payload: Record<string, any>, expiresInSeconds = 3600): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    
    const now = Math.floor(Date.now() / 1000);
    const expPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds
    };
    const encodedPayload = Buffer.from(JSON.stringify(expPayload)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
      
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  public static verifyToken(token: string): Record<string, any> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Malformed token structure');
    }
    
    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }
    
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && now > decodedPayload.exp) {
      throw new Error('Token has expired');
    }
    
    return decodedPayload;
  }

  // ─── 3. Time-based One Time Password (TOTP MFA - RFC 6238) ──────────────────
  public static generateTotpSecret(): string {
    // Generate a 20-byte base32-like random hex string as the secret seed
    return crypto.randomBytes(10).toString('hex').toUpperCase();
  }

  public static verifyTotp(secret: string, token: string, window = 1): boolean {
    const timeStep = 30; // 30 seconds
    const currentTime = Math.floor(Date.now() / 1000);
    const currentStep = Math.floor(currentTime / timeStep);

    // Verify code for current, previous, and next steps to tolerate latency
    for (let i = -window; i <= window; i++) {
      const step = currentStep + i;
      const expectedCode = this.calculateTotpCode(secret, step);
      if (expectedCode === token) {
        return true;
      }
    }
    return false;
  }

  public static calculateTotpCode(secret: string, step: number): string {
    // Convert step counter to 8-byte buffer
    const buffer = Buffer.alloc(8);
    let temp = step;
    for (let i = 7; i >= 0; i--) {
      buffer[i] = temp & 0xff;
      temp >>= 8;
    }

    // Generate HMAC-SHA1 using hex-encoded secret key
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    const hash = hmac.update(buffer).digest();

    // Dynamic Truncation
    const offset = hash[hash.length - 1] & 0xf;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    // Modulo 1,000,000 to get a 6-digit code
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  // ─── 4. Symmetric Encryption (AES-256-GCM) ────────────────────────────────
  public static encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(12);
      // Ensure key is exactly 32 bytes (pad or truncate)
      const keyBuffer = Buffer.alloc(32);
      Buffer.from(ENCRYPTION_KEY).copy(keyBuffer);
      
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag().toString('hex');
      // Format: iv:authTag:ciphertext
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (e: any) {
      console.error('Encryption failed:', e.message);
      return text;
    }
  }

  public static decrypt(cipherText: string): string {
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) {
        return cipherText; // Return raw text if not formatted correctly
      }
      
      const [ivHex, tagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      
      const keyBuffer = Buffer.alloc(32);
      Buffer.from(ENCRYPTION_KEY).copy(keyBuffer);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e: any) {
      // Return raw text if decryption fails (handles unencrypted legacy data)
      return cipherText;
    }
  }
}
