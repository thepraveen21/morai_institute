import { Request, Response } from 'express';
import pool from '../config/db';

// Create Class
export const createClass = async (req: Request, res: Response): Promise<void> => {
  const { institute_id, teacher_id, name, subject, schedule, fee_amount } = req.body;

  try {
    if (!institute_id || !name || !fee_amount) {
      res.status(400).json({
        success: false,
        message: 'institute_id, name and fee_amount are required'
      });
      return;
    }

    // Check institute exists
    const institute = await pool.query('SELECT id FROM institutes WHERE id = $1', [institute_id]);
    if (institute.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Institute not found' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO classes (institute_id, teacher_id, name, subject, schedule, fee_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [institute_id, teacher_id || null, name, subject, schedule || null, fee_amount]
    );

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get All Classes (with institute and teacher info)
export const getClasses = async (req: Request, res: Response): Promise<void> => {
  const { institute_id } = req.query;

  try {
    let query = `
      SELECT c.*,
             i.name as institute_name,
             u.name as teacher_name
      FROM classes c
      LEFT JOIN institutes i ON c.institute_id = i.id
      LEFT JOIN users u ON c.teacher_id = u.id
    `;
    const params: any[] = [];

    if (institute_id) {
      query += ' WHERE c.institute_id = $1';
      params.push(institute_id);
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Single Class
export const getClassById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.*,
              i.name as institute_name,
              u.name as teacher_name
       FROM classes c
       LEFT JOIN institutes i ON c.institute_id = i.id
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update Class
export const updateClass = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { teacher_id, name, subject, schedule, fee_amount } = req.body;

  try {
    const result = await pool.query(
      `UPDATE classes
       SET teacher_id  = COALESCE($1, teacher_id),
           name        = COALESCE($2, name),
           subject     = COALESCE($3, subject),
           schedule    = COALESCE($4, schedule),
           fee_amount  = COALESCE($5, fee_amount)
       WHERE id = $6
       RETURNING *`,
      [teacher_id, name, subject, schedule, fee_amount, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete Class
export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM classes WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }

    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};