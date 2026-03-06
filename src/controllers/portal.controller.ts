import { Request, Response, NextFunction } from 'express'; 
import pool from '../config/db';
import AppError from '../utils/AppError'; 

export const getPortalDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user_id = (req as any).user.id;

  try {
    const studentResult = await pool.query(
      `SELECT s.*, i.name as institute_name
       FROM students s
       LEFT JOIN institutes i ON s.institute_id = i.id
       WHERE s.user_id = $1`,
      [user_id]
    );

    if (studentResult.rows.length === 0) {
      throw new AppError('No student profile found for this account', 404); 
    }

    const student = studentResult.rows[0];
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const feeResult = await pool.query(
      `SELECT f.*, c.name as class_name
       FROM fees f
       JOIN classes c ON f.class_id = c.id
       WHERE f.student_id = $1 AND f.month = $2 AND f.year = $3`,
      [student.id, currentMonth, currentYear]
    );

    const attendanceResult = await pool.query(
      `SELECT
         COUNT(sess.id) as total_sessions,
         COUNT(a.id) as attended,
         ROUND((COUNT(a.id)::decimal / NULLIF(COUNT(sess.id), 0)) * 100, 2) as percentage
       FROM enrollments e
       JOIN attendance_sessions sess ON sess.class_id = e.class_id
       LEFT JOIN attendance a ON a.session_id = sess.id AND a.student_id = $1
       WHERE e.student_id = $1`,
      [student.id]
    );

    const classesResult = await pool.query(
      `SELECT c.id, c.name, c.subject, c.schedule, c.fee_amount
       FROM enrollments e
       JOIN classes c ON e.class_id = c.id
       WHERE e.student_id = $1`,
      [student.id]
    );

    res.json({
      success: true,
      data: {
        student,
        current_month_fees: feeResult.rows,
        attendance_overview: attendanceResult.rows[0],
        enrolled_classes: classesResult.rows
      }
    });
  } catch (error) {
    next(error); 
  }
};

export const getMyFees = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user_id = (req as any).user.id;

  try {
    const studentResult = await pool.query(
      'SELECT id FROM students WHERE user_id = $1',
      [user_id]
    );

    if (studentResult.rows.length === 0) {
      throw new AppError('Student profile not found', 404); 
    }

    const student_id = studentResult.rows[0].id;

    const result = await pool.query(
      `SELECT f.id, f.month, f.year, f.amount, f.status,
              f.paid_at, f.proof_url, f.notes,
              c.name as class_name, c.subject
       FROM fees f
       JOIN classes c ON f.class_id = c.id
       WHERE f.student_id = $1
       ORDER BY f.year DESC, f.month DESC`,
      [student_id]
    );

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error); 
  }
};

export const getMyAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const user_id = (req as any).user.id;
  const { class_id } = req.query;

  try {
    const studentResult = await pool.query(
      'SELECT id FROM students WHERE user_id = $1',
      [user_id]
    );

    if (studentResult.rows.length === 0) {
      throw new AppError('Student profile not found', 404); 
    }

    const student_id = studentResult.rows[0].id;

    let query = `
      SELECT sess.date, c.name as class_name, c.subject,
             CASE WHEN a.id IS NOT NULL THEN 'present' ELSE 'absent' END as status,
             a.method, a.marked_at
      FROM attendance_sessions sess
      JOIN classes c ON sess.class_id = c.id
      JOIN enrollments e ON e.class_id = c.id AND e.student_id = $1
      LEFT JOIN attendance a ON a.session_id = sess.id AND a.student_id = $1
      WHERE 1=1
    `;
    const params: any[] = [student_id];
    let count = 2;

    if (class_id) {
      query += ` AND sess.class_id = $${count++}`;
      params.push(class_id);
    }

    query += ' ORDER BY sess.date DESC';

    const result = await pool.query(query, params);

    const total = result.rows.length;
    const present = result.rows.filter((r: any) => r.status === 'present').length;
    const absent = total - present;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : '0';

    res.json({
      success: true,
      summary: { total_sessions: total, present, absent, percentage: `${percentage}%` },
      data: result.rows
    });
  } catch (error) {
    next(error); 
  }
};

export const uploadMyProof = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const user_id = (req as any).user.id;
  const { fee_id, proof_url } = req.body;

  try {
    if (!fee_id || !proof_url) {
      throw new AppError('fee_id and proof_url are required', 400); 
    }

    const studentResult = await pool.query(
      'SELECT id FROM students WHERE user_id = $1',
      [user_id]
    );

    if (studentResult.rows.length === 0) {
      throw new AppError('Student profile not found', 404); 
    }

    const student_id = studentResult.rows[0].id;

    const feeCheck = await pool.query(
      'SELECT id FROM fees WHERE id = $1 AND student_id = $2',
      [fee_id, student_id]
    );

    if (feeCheck.rows.length === 0) {
      throw new AppError('This fee record does not belong to you', 403); 
    }

    const result = await pool.query(
      'UPDATE fees SET proof_url = $1 WHERE id = $2 RETURNING *',
      [proof_url, fee_id]
    );

    res.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error); 
  }
};

export const getMyAnnouncements = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const user_id = (req as any).user.id;

  try {
    const studentResult = await pool.query(
      'SELECT id FROM students WHERE user_id = $1',
      [user_id]
    );

    if (studentResult.rows.length === 0) {
      throw new AppError('Student profile not found', 404); 
    }

    const student_id = studentResult.rows[0].id;

    const result = await pool.query(
      `SELECT a.id, a.title, a.body, a.created_at,
              c.name as class_name, u.name as posted_by
       FROM announcements a
       JOIN classes c ON a.class_id = c.id
       JOIN enrollments e ON e.class_id = c.id
       JOIN users u ON a.posted_by = u.id
       WHERE e.student_id = $1
       ORDER BY a.created_at DESC`,
      [student_id]
    );

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error); 
  }
};

export const getMyReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const user_id = (req as any).user.id;
  const { fee_id } = req.params;

  try {
    const studentResult = await pool.query(
      'SELECT id FROM students WHERE user_id = $1',
      [user_id]
    );

    if (studentResult.rows.length === 0) {
      throw new AppError('Student profile not found', 404); 
    }

    const student_id = studentResult.rows[0].id;

    const result = await pool.query(
      `SELECT f.*,
              s.name as student_name, s.grade, s.parent_name,
              c.name as class_name, c.subject,
              i.name as institute_name, i.address as institute_address, i.contact as institute_contact
       FROM fees f
       JOIN students s ON f.student_id = s.id
       JOIN classes c ON f.class_id = c.id
       JOIN institutes i ON c.institute_id = i.id
       WHERE f.id = $1 AND f.student_id = $2`,
      [fee_id, student_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Receipt not found or does not belong to you', 404); 
    }

    const fee = result.rows[0];
    const receipt = {
      receipt_number: `RCPT-${fee.id.substring(0, 8).toUpperCase()}`,
      institute: { name: fee.institute_name, address: fee.institute_address, contact: fee.institute_contact },
      student: { name: fee.student_name, grade: fee.grade, parent_name: fee.parent_name },
      class: { name: fee.class_name, subject: fee.subject },
      payment: { month: fee.month, year: fee.year, amount: fee.amount, status: fee.status, paid_at: fee.paid_at },
      generated_at: new Date()
    };

    res.json({ success: true, data: receipt });
  } catch (error) {
    next(error); 
  }
};