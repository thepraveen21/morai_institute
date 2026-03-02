import { Request, Response, NextFunction } from 'express'; // CHANGED: Added NextFunction
import pool from '../config/db';
import AppError from '../utils/AppError'; // CHANGED: Added AppError import
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { class_id, date } = req.body;
  const created_by = (req as any).user.id;

  try {
    if (!class_id || !date) {
      throw new AppError('class_id and date are required', 400); // CHANGED: throw AppError
    }

    const classCheck = await pool.query('SELECT id FROM classes WHERE id = $1', [class_id]);
    if (classCheck.rows.length === 0) {
      throw new AppError('Class not found', 404); // CHANGED: throw AppError
    }

    const qr_expires_at = new Date();
    qr_expires_at.setHours(qr_expires_at.getHours() + 2);

    const qr_token = uuidv4();
    const qr_code = await QRCode.toDataURL(qr_token);

    const result = await pool.query(
      `INSERT INTO attendance_sessions (class_id, date, qr_code, qr_expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [class_id, date, qr_token, qr_expires_at, created_by]
    );

    res.status(201).json({
      success: true,
      message: 'Attendance session created successfully',
      data: { ...result.rows[0], qr_image: qr_code }
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const getSessions = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { class_id } = req.query;

  try {
    let query = `
      SELECT s.*, c.name as class_name, u.name as created_by_name
      FROM attendance_sessions s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN users u ON s.created_by = u.id
    `;
    const params: any[] = [];

    if (class_id) {
      query += ' WHERE s.class_id = $1';
      params.push(class_id);
    }

    query += ' ORDER BY s.date DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const getSessionById = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { id } = req.params;

  try {
    const sessionResult = await pool.query(
      `SELECT s.*, c.name as class_name
       FROM attendance_sessions s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      throw new AppError('Session not found', 404); // CHANGED: throw AppError
    }

    const attendanceResult = await pool.query(
      `SELECT a.*, st.name as student_name, st.grade
       FROM attendance a
       LEFT JOIN students st ON a.student_id = st.id
       WHERE a.session_id = $1
       ORDER BY a.marked_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...sessionResult.rows[0],
        attendance: attendanceResult.rows,
        total_present: attendanceResult.rows.length
      }
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const scanQR = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { qr_token, student_id } = req.body;

  try {
    if (!qr_token || !student_id) {
      throw new AppError('qr_token and student_id are required', 400); // CHANGED: throw AppError
    }

    const sessionResult = await pool.query(
      'SELECT * FROM attendance_sessions WHERE qr_code = $1',
      [qr_token]
    );

    if (sessionResult.rows.length === 0) {
      throw new AppError('Invalid QR code', 404); // CHANGED: throw AppError
    }

    const session = sessionResult.rows[0];

    if (new Date() > new Date(session.qr_expires_at)) {
      throw new AppError('QR code has expired', 400); // CHANGED: throw AppError
    }

    const enrollment = await pool.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND class_id = $2',
      [student_id, session.class_id]
    );

    if (enrollment.rows.length === 0) {
      throw new AppError('Student is not enrolled in this class', 400); // CHANGED: throw AppError
    }

    const result = await pool.query(
      `INSERT INTO attendance (session_id, student_id, method)
       VALUES ($1, $2, 'qr') RETURNING *`,
      [session.id, student_id]
    );

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully via QR',
      data: result.rows[0]
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const markManual = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { session_id, student_id } = req.body;

  try {
    if (!session_id || !student_id) {
      throw new AppError('session_id and student_id are required', 400); // CHANGED: throw AppError
    }

    const session = await pool.query(
      'SELECT * FROM attendance_sessions WHERE id = $1',
      [session_id]
    );

    if (session.rows.length === 0) {
      throw new AppError('Session not found', 404); // CHANGED: throw AppError
    }

    const result = await pool.query(
      `INSERT INTO attendance (session_id, student_id, method)
       VALUES ($1, $2, 'manual') RETURNING *`,
      [session_id, student_id]
    );

    res.status(201).json({
      success: true,
      message: 'Attendance marked manually',
      data: result.rows[0]
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const getAbsentList = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { session_id } = req.params;

  try {
    const session = await pool.query(
      'SELECT * FROM attendance_sessions WHERE id = $1',
      [session_id]
    );

    if (session.rows.length === 0) {
      throw new AppError('Session not found', 404); // CHANGED: throw AppError
    }

    const class_id = session.rows[0].class_id;

    const result = await pool.query(
      `SELECT s.id, s.name, s.grade, s.parent_contact, s.parent_name
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.class_id = $1
         AND s.id NOT IN (SELECT student_id FROM attendance WHERE session_id = $2)
       ORDER BY s.name ASC`,
      [class_id, session_id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      message: `${result.rows.length} students absent`,
      data: result.rows
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const getStudentAttendanceSummary = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { student_id } = req.params;
  const { class_id } = req.query;

  try {
    let query = `
      SELECT
        COUNT(e.id) as total_sessions,
        COUNT(a.id) as attended,
        ROUND((COUNT(a.id)::decimal / NULLIF(COUNT(e.id), 0)) * 100, 2) as percentage
      FROM attendance_sessions e
      LEFT JOIN attendance a ON a.session_id = e.id AND a.student_id = $1
      WHERE 1=1
    `;
    const params: any[] = [student_id];
    let count = 2;

    if (class_id) {
      query += ` AND e.class_id = $${count++}`;
      params.push(class_id);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};