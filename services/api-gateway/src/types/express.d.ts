import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        type: 'passenger' | 'driver' | 'operator';
        name?: string;
        email?: string;
      };
    }
  }
}
