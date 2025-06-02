// Role-based access control middleware
export default (allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated (should be handled by verifyToken middleware first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'E_UNAUTHORIZED',
        message: 'Unauthorized: No user data'
      });
    }

    // Get role name from JWT token (stored in req.user.role_name)
    const userRole = req.user.role_name;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        code: 'E_FORBIDDEN',
        message: `Forbidden: Insufficient role. User role: ${userRole}, Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};
