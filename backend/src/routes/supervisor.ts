import { Router, Response } from 'express';
import { directorRouter } from './director';
import { AuthRequest, requireRoles } from '../middleware/auth';

export const supervisorRouter = Router();
// Supervisors get same read-only view via director endpoints
supervisorRouter.use('/', requireRoles('SUPERVISOR', 'DIRECTOR', 'ADMIN'), directorRouter);
