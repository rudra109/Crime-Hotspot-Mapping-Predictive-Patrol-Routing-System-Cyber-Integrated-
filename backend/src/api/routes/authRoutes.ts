import { Router } from 'express';
import { register, login, verifyMfa, generateMfaCode } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/mfa/verify', verifyMfa);
router.post('/mfa/generate', generateMfaCode);

export default router;
