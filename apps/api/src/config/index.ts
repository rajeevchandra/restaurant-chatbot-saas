// Always load .env from current working directory
import 'dotenv/config';
import path from 'path';
import { validateEnv } from './env.validation';


// Validate environment variables at startup
const env = validateEnv();

export const config = {
  port: env.API_PORT,
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  bodyLimit: env.BODY_LIMIT,
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTokenExpiry: env.JWT_EXPIRES_IN,
    refreshTokenExpiry: env.JWT_REFRESH_EXPIRES_IN,
  },
  cors: {
    origin: env.CORS_ORIGIN.split(','),
    credentials: env.CORS_CREDENTIALS,
  },
  cookie: {
    secret: env.COOKIE_SECRET,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: env.COOKIE_MAX_AGE,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  stripe: {
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },
  square: {
    webhookSecret: env.SQUARE_WEBHOOK_SECRET,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
};
