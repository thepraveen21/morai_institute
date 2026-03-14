import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';
import AppError from '../utils/AppError';
import { generateBatch } from '../services/codegen.service';

// Admin — Generate batch of codes
export const generateCodes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { institute_id, role, count } = req.body;
  const created_by = (req as any).user.id;

  try {
    if (!institute_id || !role || !count) {
      throw new AppError('institute_id, role and count are required', 400);
    }

    if (count < 1 || count > 200) {
      throw new AppError('Count must be between 1 and 200', 400);
    }

    const validRoles = ['student', 'teacher', 'parent', 'admin'];
    if (!validRoles.includes(role)) {
      throw new AppError('Role must be student, teacher, parent or admin', 400);
    }

    // Check institute exists
    const institute = await pool.query(
      'SELECT id FROM institutes WHERE id = $1', [institute_id]
    );
    if (institute.rows.length === 0) {
      throw new AppError('Institute not found', 404);
    }

    // Generate codes
    const codes = generateBatch(role, count);

    // Insert all codes in one query
    const values = codes.map(
      (code, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
    ).join(', ');

    const params = codes.flatMap(code => [code, role, institute_id, created_by]);

    const result = await pool.query(
      `INSERT INTO registration_codes (code, role, institute_id, created_by)
       VALUES ${values}
       RETURNING code, role, status, created_at`,
      params
    );

    res.status(201).json({
      success: true,
      message: `${count} ${role} codes generated successfully`,
      total: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Admin — Get All Codes (with filters)
export const getCodes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { institute_id, role, status } = req.query;

  try {
    let query = `
      SELECT
        rc.code, rc.role, rc.status,
        rc.created_at, rc.used_at,
        u.name as used_by_name,
        u.email as used_by_email
      FROM registration_codes rc
      LEFT JOIN users u ON rc.used_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let count = 1;

    if (institute_id) { query += ` AND rc.institute_id = $${count++}`; params.push(institute_id); }
    if (role)         { query += ` AND rc.role = $${count++}`;         params.push(role); }
    if (status)       { query += ` AND rc.status = $${count++}`;       params.push(status); }

    query += ' ORDER BY rc.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Admin — Delete unused codes
export const deleteCodes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { institute_id, role } = req.body;

  try {
    if (!institute_id) {
      throw new AppError('institute_id is required', 400);
    }

    let query = `
      DELETE FROM registration_codes
      WHERE institute_id = $1 AND status = 'unused'
    `;
    const params: any[] = [institute_id];

    if (role) {
      query += ` AND role = $2`;
      params.push(role);
    }

    query += ' RETURNING code';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      message: `${result.rows.length} unused codes deleted`
    });
  } catch (error) {
    next(error);
  }
};

// Updated Register — uses registration code
export const registerWithCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { name, email, password, registration_code } = req.body;

  try {
    if (!name || !email || !password || !registration_code) {
      throw new AppError('name, email, password and registration_code are required', 400);
    }

    // Check code exists and is unused
    const codeResult = await pool.query(
      `SELECT * FROM registration_codes
       WHERE code = $1 AND status = 'unused'`,
      [registration_code]
    );

    if (codeResult.rows.length === 0) {
      throw new AppError('Invalid or already used registration code', 400);
    }

    const codeRecord = codeResult.rows[0];

    // Check email not already registered
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    if (existing.rows.length > 0) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 12);

    // Create user with role from code
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, role, name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, name`,
      [email, password_hash, codeRecord.role, name]
    );

    const user = userResult.rows[0];

    // Mark code as used
    await pool.query(
      `UPDATE registration_codes
       SET status = 'used', used_by = $1, used_at = NOW()
       WHERE code = $2`,
      [user.id, registration_code]
    );

    // If student — auto create student profile
    if (codeRecord.role === 'student') {
      await pool.query(
        `INSERT INTO students (institute_id, name, user_id)
         VALUES ($1, $2, $3)`,
        [codeRecord.institute_id, name, user.id]
      );
    }

    // Generate JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: `${codeRecord.role} account created successfully`,
      data: { user, token }
    });
  } catch (error) {
    next(error);
  }
};

// Validate a code (check before showing register form)
export const validateCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      `SELECT code, role, status, institute_id
       FROM registration_codes
       WHERE code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      throw new AppError('Code not found', 404);
    }

    const record = result.rows[0];

    if (record.status === 'used') {
      throw new AppError('This code has already been used', 400);
    }

    res.json({
      success: true,
      message: 'Code is valid',
      data: {
        code: record.code,
        role: record.role,
        institute_id: record.institute_id
      }
    });
  } catch (error) {
    next(error);
  }
};