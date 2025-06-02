import express from 'express';

import { login, logout, register, getCurrentUser } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/authJwt.js';
import { userRegistrationValidation, loginValidation, validate } from '../middlewares/validator.js';

const router = express.Router();

router.post('/login', loginValidation, validate, login);
router.post('/register', userRegistrationValidation, register);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, getCurrentUser);

export default router;