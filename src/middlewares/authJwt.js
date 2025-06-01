import jwt from 'jsonwebtoken';

import config from '../config/index.js';

export const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;

    // Sliding TTL - issue new token if less than 2 hours remaining
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp - now < 2 * 60 * 60) {
      const newToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email },
        config.jwt.secret,
        { expiresIn: config.jwt.ttl }
      );
      res.cookie('token', newToken, { httpOnly: true });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
