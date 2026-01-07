import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../config';
import prisma from '../../db/prisma';
import { validate } from '../../middleware/validate';
import { loginSchema } from '@restaurant-saas/shared';

const router = Router();

// Login
router.post('/login', validate(loginSchema), async (req, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.restaurantUser.findFirst({
    where: { email, isActive: true },
    include: { restaurant: { select: { id: true, name: true, slug: true } } },
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = jwt.sign(
    { userId: user.id, restaurantId: user.restaurantId },
    config.jwt.secret as jwt.Secret,
    { expiresIn: config.jwt.accessTokenExpiry } as SignOptions
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    config.jwt.refreshSecret as jwt.Secret,
    { expiresIn: config.jwt.refreshTokenExpiry } as SignOptions
  );

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
        restaurant: user.restaurant,
      },
    },
  });
});

// Refresh token
router.post('/refresh', async (req, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
    const user = await prisma.restaurantUser.findUnique({
      where: { id: decoded.userId, isActive: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId, restaurantId: user.restaurantId },
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.accessTokenExpiry } as SignOptions
    );

    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.post('/logout', (req, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
