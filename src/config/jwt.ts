import jwt, { SignOptions } from 'jsonwebtoken';

export const jwtConfig = {
  access: {
    secret: (process.env.JWT_SECRET || 'default-secret-change-in-production') as string,
    expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as string,
  },
  refresh: {
    secret: (process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production') as string,
    expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as string,
  },
};

export interface JWTPayload {
  id: string;
  email: string;
  rol: string;
}

export const generateTokens = (payload: JWTPayload) => {
  const accessToken = jwt.sign(payload, jwtConfig.access.secret, {
    expiresIn: jwtConfig.access.expiresIn,
  } as SignOptions);

  const refreshToken = jwt.sign(payload, jwtConfig.refresh.secret, {
    expiresIn: jwtConfig.refresh.expiresIn,
  } as SignOptions);

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, jwtConfig.access.secret) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, jwtConfig.refresh.secret) as JWTPayload;
};
