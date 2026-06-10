import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';

const router = Router();

router.get('/', getAuditLogs);

export default router;
