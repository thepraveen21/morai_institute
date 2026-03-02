import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';
import AppError from '../utils/AppError';

// Create Institute
export const createInstitute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, address, contact, email } = req.body;
  const created_by = (req as any).user.id;

  try {
    if (!name) {
       throw new AppError('Institute name is required', 400);
    }

    const result = await pool.query(
      `INSERT INTO institutes (name, address, contact, email, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, address, contact, email, created_by]
    );

    res.status(201).json({
      success: true,
      message: 'Institute created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Get All Institutes
export const getInstitutes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT i.*, u.name as created_by_name
       FROM institutes i
       LEFT JOIN users u ON i.created_by = u.id
       ORDER BY i.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Institute
export const getInstituteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT i.*, u.name as created_by_name
       FROM institutes i
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Institute not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Update Institute
export const updateInstitute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { name, address, contact, email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE institutes
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           contact = COALESCE($3, contact),
           email = COALESCE($4, email)
       WHERE id = $5
       RETURNING *`,
      [name, address, contact, email, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Institute not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Institute updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Delete Institute
export const deleteInstitute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM institutes WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Institute not found' });
      return;
    }

    res.json({ success: true, message: 'Institute deleted successfully' });
  } catch (error) {
    next(error);
  }
};