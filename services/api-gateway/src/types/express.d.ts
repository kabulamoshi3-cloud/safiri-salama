declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        phone_number?: string;
        type: 'passenger' | 'driver' | 'operator' | 'admin' | 'support_agent';
        name?: string;
        email?: string;
      };
    }
  }
}

export {};
