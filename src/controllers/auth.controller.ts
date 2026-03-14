import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import AppError from '../utils/AppError';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, email, password, registration_code } = req.body; // CHANGED: role → registration_code

  try {
    // CHANGED: Validate registration code first (new block)
    const codeResult = await pool.query(
      `SELECT * FROM registration_codes WHERE code = $1 AND status = 'unused'`,
      [registration_code]
    );
    if (codeResult.rows.length === 0) {
      throw new AppError('Invalid or already used registration code', 400);
    }
    const codeRecord = codeResult.rows[0];
    // END OF NEW BLOCK

    // Check if user exists — unchanged
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password — unchanged
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user — CHANGED: role now comes from codeRecord.role not user input
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4) RETURNING id, email, role, name',
      [email, password_hash, codeRecord.role, name] // CHANGED: role || 'student' → codeRecord.role
    );

    const user = result.rows[0];

    // CHANGED: Mark code as used (new block)
    await pool.query(
      `UPDATE registration_codes SET status = 'used', used_by = $1, used_at = NOW() WHERE code = $2`,
      [user.id, registration_code]
    );
    // END OF NEW BLOCK

    // CHANGED: Auto create student profile if role is student (new block)
    if (codeRecord.role === 'student') {
      await pool.query(
        `INSERT INTO students (institute_id, name, user_id) VALUES ($1, $2, $3)`,
        [codeRecord.institute_id, name, user.id]
      );
    }
    // END OF NEW BLOCK

    // Generate token — unchanged
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: `${codeRecord.role} account created successfully`, // CHANGED: message now shows role
      data: { user, token }
    });
  } catch (error) {
    next(error);
  }
};

// login — completely unchanged ✅
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, email: user.email, role: user.role, name: user.name },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// getMe — completely unchanged ✅
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, name, created_at FROM users WHERE id = $1',
      [(req as any).user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};