import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: string;
    ordreNumber?: string;
    organizationId?: string;
  }
}
