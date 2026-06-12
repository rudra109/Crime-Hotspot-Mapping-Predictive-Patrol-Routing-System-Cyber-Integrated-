import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { CryptoHelper } from '../../config/crypto-helper';
import { auditService } from '../../services/audit-service';

const USERS_STORE_FILE = path.join(__dirname, '../../../data/users-store.json');

export interface UserAccount {
  id: string;
  badgeNumber: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role: 'dispatcher' | 'supervisor' | 'officer';
  totpSecret: string;
  mfaActive: boolean;
  createdAt: string;
}

let inMemoryUsers: UserAccount[] = [];

const loadUsers = () => {
  try {
    const dir = path.dirname(USERS_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(USERS_STORE_FILE)) {
      inMemoryUsers = JSON.parse(fs.readFileSync(USERS_STORE_FILE, 'utf-8'));
    } else {
      // Seed default accounts
      const adminPass = CryptoHelper.hashPassword('admin_pass_2026');
      const supervisorPass = CryptoHelper.hashPassword('supervisor_pass');
      const dispatcherPass = CryptoHelper.hashPassword('dispatcher_pass');
      
      inMemoryUsers = [
        {
          id: 'user-001',
          badgeNumber: 'BADGE-1111',
          name: 'Chief Inspector Dave',
          passwordHash: supervisorPass.hash,
          passwordSalt: supervisorPass.salt,
          role: 'supervisor',
          totpSecret: 'D3S9A2F8H4K6L8M2N4P6', // hex
          mfaActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'user-002',
          badgeNumber: 'BADGE-2222',
          name: 'Officer Patel',
          passwordHash: dispatcherPass.hash,
          passwordSalt: dispatcherPass.salt,
          role: 'dispatcher',
          totpSecret: 'A2B4C6D8E2F4A2C4E6F8',
          mfaActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      saveUsers();
    }
  } catch (e) {
    console.error('Failed to load user accounts:', e);
  }
};

const saveUsers = () => {
  try {
    fs.writeFileSync(USERS_STORE_FILE, JSON.stringify(inMemoryUsers, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save user accounts:', e);
  }
};

// Load initially
loadUsers();

export const register = async (req: Request, res: Response) => {
  try {
    loadUsers();
    const { badgeNumber, name, password, role } = req.body;
    if (!badgeNumber || !name || !password) {
      return res.status(400).json({ error: 'badgeNumber, name, and password are required' });
    }

    const cleanedBadge = String(badgeNumber).toUpperCase().trim();
    const exists = inMemoryUsers.some(u => u.badgeNumber === cleanedBadge);
    if (exists) {
      return res.status(400).json({ error: `Badge number ${cleanedBadge} is already registered` });
    }

    const { hash, salt } = CryptoHelper.hashPassword(password);
    const totpSecret = CryptoHelper.generateTotpSecret();

    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      badgeNumber: cleanedBadge,
      name,
      passwordHash: hash,
      passwordSalt: salt,
      role: role || 'officer',
      totpSecret,
      mfaActive: false, // will activate upon first successful MFA verify
      createdAt: new Date().toISOString()
    };

    inMemoryUsers.push(newUser);
    saveUsers();

    await auditService.record({
      userId: cleanedBadge,
      action: 'USER_REGISTER',
      resource: `user/${newUser.id}`,
      changes: { badgeNumber: cleanedBadge, name, role: newUser.role },
      status: 'success'
    });

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        badgeNumber: newUser.badgeNumber,
        name: newUser.name,
        role: newUser.role,
        mfaActive: false
      },
      totpSecret // returned so the front-end simulation panel can display it
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    loadUsers();
    const { badgeNumber, password } = req.body;
    if (!badgeNumber || !password) {
      return res.status(400).json({ error: 'badgeNumber and password are required' });
    }

    const cleanedBadge = String(badgeNumber).toUpperCase().trim();
    const user = inMemoryUsers.find(u => u.badgeNumber === cleanedBadge);
    if (!user) {
      await auditService.record({
        userId: cleanedBadge,
        action: 'USER_LOGIN_FAIL',
        resource: 'auth/login',
        status: 'denied',
        changes: { reason: 'User not found' }
      });
      return res.status(401).json({ error: 'Invalid badge credentials' });
    }

    const valid = CryptoHelper.verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!valid) {
      await auditService.record({
        userId: cleanedBadge,
        action: 'USER_LOGIN_FAIL',
        resource: 'auth/login',
        status: 'denied',
        changes: { reason: 'Incorrect password' }
      });
      return res.status(401).json({ error: 'Invalid badge credentials' });
    }

    // Return MFA challenge (we enforce MFA step for all users)
    return res.json({
      mfaRequired: true,
      badgeNumber: user.badgeNumber,
      totpSecret: user.totpSecret, // Exposed for test simulator
      message: 'MFA Verification code required'
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const verifyMfa = async (req: Request, res: Response) => {
  try {
    loadUsers();
    const { badgeNumber, token } = req.body;
    if (!badgeNumber || !token) {
      return res.status(400).json({ error: 'badgeNumber and token are required' });
    }

    const cleanedBadge = String(badgeNumber).toUpperCase().trim();
    const user = inMemoryUsers.find(u => u.badgeNumber === cleanedBadge);
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const verified = CryptoHelper.verifyTotp(user.totpSecret, String(token));
    if (!verified) {
      await auditService.record({
        userId: cleanedBadge,
        action: 'USER_MFA_FAIL',
        resource: 'auth/mfa/verify',
        status: 'denied',
        changes: { reason: 'Invalid TOTP code token' }
      });
      return res.status(401).json({ error: 'Invalid MFA verification token' });
    }

    // Set MFA as active since verification succeeded
    if (!user.mfaActive) {
      user.mfaActive = true;
      saveUsers();
    }

    // Generate signed JWT token
    const jwtToken = CryptoHelper.signToken({
      id: user.id,
      badgeNumber: user.badgeNumber,
      name: user.name,
      role: user.role
    });

    await auditService.record({
      userId: cleanedBadge,
      action: 'USER_LOGIN_SUCCESS',
      resource: 'auth/login',
      status: 'success'
    });

    return res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        badgeNumber: user.badgeNumber,
        name: user.name,
        role: user.role,
        mfaActive: true
      }
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const generateMfaCode = async (req: Request, res: Response) => {
  try {
    const { secret } = req.body;
    if (!secret) {
      return res.status(400).json({ error: 'Secret is required' });
    }
    const timeStep = 30;
    const currentStep = Math.floor(Date.now() / 1000 / timeStep);
    const code = CryptoHelper.calculateTotpCode(secret, currentStep);
    return res.json({ code });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};
