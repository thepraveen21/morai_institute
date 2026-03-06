import { Request, Response, NextFunction } from 'express'; 
import pool from '../config/db';
import AppError from '../utils/AppError'; 

export const createFee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { student_id, class_id, month, year, amount } = req.body;

  try {
    if (!student_id || !class_id || !month || !year || !amount) {
      throw new AppError('student_id, class_id, month, year and amount are required', 400);
    }

    const enrollment = await pool.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND class_id = $2',
      [student_id, class_id]
    );
    if (enrollment.rows.length === 0) {
      throw new AppError('Student is not enrolled in this class', 400);
    }

    const result = await pool.query(
      `INSERT INTO fees (student_id, class_id, month, year, amount)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [student_id, class_id, month, year, amount]
    );

    res.status(201).json({
      success: true,
      message: 'Fee record created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error); 
  }
};

export const getFees = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { student_id, class_id, month, year, status } = req.query;

  try {
    let query = `
      SELECT f.*,
             s.name as student_name,
             s.parent_contact,
             c.name as class_name
      FROM fees f
      LEFT JOIN students s ON f.student_id = s.id
      LEFT JOIN classes c ON f.class_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let count = 1;

    if (student_id) { query += ` AND f.student_id = $${count++}`; params.push(student_id); }
    if (class_id)   { query += ` AND f.class_id = $${count++}`;   params.push(class_id); }
    if (month)      { query += ` AND f.month = $${count++}`;       params.push(month); }
    if (year)       { query += ` AND f.year = $${count++}`;        params.push(year); }
    if (status)     { query += ` AND f.status = $${count++}`;      params.push(status); }

    query += ' ORDER BY f.year DESC, f.month DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error); 
  }
};

export const getFeeById = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT f.*,
              s.name as student_name,
              s.parent_contact,
              c.name as class_name
       FROM fees f
       LEFT JOIN students s ON f.student_id = s.id
       LEFT JOIN classes c ON f.class_id = c.id
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Fee record not found', 404); 
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error); 
  }
};

export const updateFeeStatus = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { id } = req.params;
  const { status, amount, notes } = req.body;

  try {
    if (!status) {
      throw new AppError('status is required', 400); 
    }

    const paid_at = status === 'paid' ? new Date() : null;

    const result = await pool.query(
      `UPDATE fees
       SET status  = $1,
           paid_at = $2,
           amount  = COALESCE($3, amount),
           notes   = COALESCE($4, notes)
       WHERE id = $5
       RETURNING *`,
      [status, paid_at, amount, notes, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Fee record not found', 404); 
    }

    res.json({
      success: true,
      message: `Fee marked as ${status}`,
      data: result.rows[0]
    });
  } catch (error) {
    next(error); 
  }
};

export const uploadProof = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { id } = req.params;
  const { proof_url } = req.body;

  try {
    if (!proof_url) {
      throw new AppError('proof_url is required', 400); 
    }

    const result = await pool.query(
      'UPDATE fees SET proof_url = $1 WHERE id = $2 RETURNING *',
      [proof_url, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Fee record not found', 404);
    }

    res.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error); 
  }
};

export const getReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT f.*,
              s.name as student_name, s.grade, s.parent_name, s.parent_contact,
              c.name as class_name, c.subject,
              i.name as institute_name, i.address as institute_address, i.contact as institute_contact
       FROM fees f
       LEFT JOIN students s ON f.student_id = s.id
       LEFT JOIN classes c ON f.class_id = c.id
       LEFT JOIN institutes i ON c.institute_id = i.id
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Fee record not found', 404); 
    }

    const fee = result.rows[0];
    const receipt = {
      receipt_number: `RCPT-${fee.id.substring(0, 8).toUpperCase()}`,
      institute: { name: fee.institute_name, address: fee.institute_address, contact: fee.institute_contact },
      student: { name: fee.student_name, grade: fee.grade, parent_name: fee.parent_name, parent_contact: fee.parent_contact },
      class: { name: fee.class_name, subject: fee.subject },
      payment: { month: fee.month, year: fee.year, amount: fee.amount, status: fee.status, paid_at: fee.paid_at, notes: fee.notes },
      generated_at: new Date()
    };

    res.json({ success: true, data: receipt });
  } catch (error) {
    next(error); 
  }
};

export const getUnpaidSummary = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { class_id, month, year } = req.query;

  try {
    if (!class_id || !month || !year) {
      throw new AppError('class_id, month and year are required', 400); 
    }

    const result = await pool.query(
      `SELECT f.*, s.name as student_name, s.parent_contact, s.parent_name
       FROM fees f
       LEFT JOIN students s ON f.student_id = s.id
       WHERE f.class_id = $1 AND f.month = $2 AND f.year = $3 AND f.status != 'paid'
       ORDER BY s.name ASC`,
      [class_id, month, year]
    );

    res.json({
      success: true,
      count: result.rows.length,
      message: `${result.rows.length} unpaid/partial fees found`,
      data: result.rows
    });
  } catch (error) {
    next(error); 
  }
};