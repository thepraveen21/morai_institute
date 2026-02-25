import { Request, Response } from 'express';
import pool from '../config/db';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// Create Attendance Session + Generate QR
export const createSession = async (req: Request, res: Response): Promise<void> => {
  const { class_id, date } = req.body;
  const created_by = (req as any).user.id;

  try {
    if (!class_id || !date) {
      res.status(400).json({
        success: false,
        message: 'class_id and date are required'
      });
      return;
    }

    // Check class exists
    const classCheck = await pool.query(
      'SELECT id FROM classes WHERE id = $1',
      [class_id]
    );
    if (classCheck.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }

    // QR expires in 2 hours
    const qr_expires_at = new Date();
    qr_expires_at.setHours(qr_expires_at.getHours() + 2);

    // Generate unique QR token
    const qr_token = uuidv4();

    // Generate QR code as base64 image
    const qr_code = await QRCode.toDataURL(qr_token);

    const result = await pool.query(
      `INSERT INTO attendance_sessions
        (class_id, date, qr_code, qr_expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [class_id, date, qr_token, qr_expires_at, created_by]
    );

    res.status(201).json({
      success: true,
      message: 'Attendance session created successfully',
      data: {
        ...result.rows[0],
        qr_image: qr_code  // base64 image to display in frontend
      }
    });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).json({
        success: false,
        message: 'Attendance session already exists for this class and date'
      });
      return;
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get All Sessions (filter by class)
export const getSessions = async (req: Request, res: Response): Promise<void> => {
  const { class_id } = req.query;

  try {
    let query = `
      SELECT s.*,
             c.name as class_name,
             u.name as created_by_name
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
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Single Session with attendance records
export const getSessionById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Get session
    const sessionResult = await pool.query(
      `SELECT s.*, c.name as class_name
       FROM attendance_sessions s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    // Get attendance records for session
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
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Scan QR Code — Mark Attendance
export const scanQR = async (req: Request, res: Response): Promise<void> => {
  const { qr_token, student_id } = req.body;

  try {
    if (!qr_token || !student_id) {
      res.status(400).json({
        success: false,
        message: 'qr_token and student_id are required'
      });
      return;
    }

    // Find session by QR token
    const sessionResult = await pool.query(
      `SELECT * FROM attendance_sessions WHERE qr_code = $1`,
      [qr_token]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Invalid QR code' });
      return;
    }

    const session = sessionResult.rows[0];

    // Check QR not expired
    if (new Date() > new Date(session.qr_expires_at)) {
      res.status(400).json({ success: false, message: 'QR code has expired' });
      return;
    }

    // Check student is enrolled in this class
    const enrollment = await pool.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND class_id = $2',
      [student_id, session.class_id]
    );

    if (enrollment.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Student is not enrolled in this class'
      });
      return;
    }

    // Mark attendance
    const result = await pool.query(
      `INSERT INTO attendance (session_id, student_id, method)
       VALUES ($1, $2, 'qr')
       RETURNING *`,
      [session.id, student_id]
    );

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully via QR',
      data: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).json({
        success: false,
        message: 'Attendance already marked for this student'
      });
      return;
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Manual Attendance Marking
export const markManual = async (req: Request, res: Response): Promise<void> => {
  const { session_id, student_id } = req.body;

  try {
    if (!session_id || !student_id) {
      res.status(400).json({
        success: false,
        message: 'session_id and student_id are required'
      });
      return;
    }

    // Check session exists
    const session = await pool.query(
      'SELECT * FROM attendance_sessions WHERE id = $1',
      [session_id]
    );
    if (session.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO attendance (session_id, student_id, method)
       VALUES ($1, $2, 'manual')
       RETURNING *`,
      [session_id, student_id]
    );

    res.status(201).json({
      success: true,
      message: 'Attendance marked manually',
      data: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).json({
        success: false,
        message: 'Attendance already marked for this student'
      });
      return;
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Absent List for a Session
export const getAbsentList = async (req: Request, res: Response): Promise<void> => {
  const { session_id } = req.params;

  try {
    // Get session to find class_id
    const session = await pool.query(
      'SELECT * FROM attendance_sessions WHERE id = $1',
      [session_id]
    );

    if (session.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const class_id = session.rows[0].class_id;

    // Get all enrolled students NOT in attendance for this session
    const result = await pool.query(
      `SELECT s.id, s.name, s.grade, s.parent_contact, s.parent_name
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.class_id = $1
         AND s.id NOT IN (
           SELECT student_id FROM attendance WHERE session_id = $2
         )
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
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Attendance Summary for a Student
export const getStudentAttendanceSummary = async (req: Request, res: Response): Promise<void> => {
  const { student_id } = req.params;
  const { class_id } = req.query;

  try {
    let query = `
      SELECT
        COUNT(e.id) as total_sessions,
        COUNT(a.id) as attended,
        ROUND((COUNT(a.id)::decimal / NULLIF(COUNT(e.id), 0)) * 100, 2) as percentage
      FROM attendance_sessions e
      LEFT JOIN attendance a
        ON a.session_id = e.id AND a.student_id = $1
      WHERE 1=1
    `;
    const params: any[] = [student_id];
    let count = 2;

    if (class_id) {
      query += ` AND e.class_id = $${count++}`;
      params.push(class_id);
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};