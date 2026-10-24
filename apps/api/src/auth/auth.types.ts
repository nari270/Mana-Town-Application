import type { Request } from 'express';
import { UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  authUserId: string;
  roles: UserRole[];
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
