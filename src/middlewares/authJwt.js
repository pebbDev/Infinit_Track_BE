import jwt from 'jsonwebtoken';

import config from '../config/index.js';
import { User, Role } from '../models/index.js';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const decoded = jwt.verify(token, config.jwt.secret);

    // If role_name is missing from token, fetch it from database
    if (!decoded.role_name && decoded.id) {
      try {
        const userWithRole = await User.findByPk(decoded.id, {
          include: [
            {
              model: Role,
              as: 'role',
              attributes: ['role_name']
            }
          ]
        });

        if (userWithRole && userWithRole.role) {
          decoded.role_name = userWithRole.role.role_name;
          console.log('🔧 Fixed missing role_name in token:', decoded.role_name);
        }
      } catch (dbError) {
        console.error('Error fetching user role from database:', dbError.message);
      }
    }

    req.user = decoded;

    // Debug logging untuk troubleshooting role issues
    console.log('🔍 Token Debug Info:');
    console.log('- User ID:', decoded.id);
    console.log('- Email:', decoded.email);
    console.log('- Role Name:', decoded.role_name);
    console.log('- Full Token Payload:', decoded);

    // Sliding TTL - issue new token if less than 2 hours remaining
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp - now < 2 * 60 * 60) {
      const newToken = jwt.sign(
        {
          id: decoded.id,
          email: decoded.email,
          full_name: decoded.full_name,
          role_name: decoded.role_name,
          photo: decoded.photo
        },
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
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
