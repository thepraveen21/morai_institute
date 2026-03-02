import { Request, Response, NextFunction } from 'express'; // CHANGED: Added NextFunction
import pool from '../config/db';
import AppError from '../utils/AppError'; // CHANGED: Added AppError import

export const unpaidFeeReport = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { class_id, month, year } = req.query;

  try {
    if (!class_id || !month || !year) {
      throw new AppError('class_id, month and year are required', 400); // CHANGED: throw AppError
    }

    const result = await pool.query(
      `SELECT s.name as student_name, s.grade, s.parent_name, s.parent_contact,
              f.amount, f.status, f.month, f.year, c.name as class_name
       FROM fees f
       JOIN students s ON f.student_id = s.id
       JOIN classes c ON f.class_id = c.id
       WHERE f.class_id = $1 AND f.month = $2 AND f.year = $3 AND f.status != 'paid'
       ORDER BY s.name ASC`,
      [class_id, month, year]
    );

    const totalUnpaid = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

    res.json({
      success: true,
      report: 'Unpaid Fee Report',
      month, year,
      total_unpaid_students: result.rows.length,
      total_unpaid_amount: `Rs. ${totalUnpaid.toFixed(2)}`,
      data: result.rows
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const feeCollectionSummary = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { class_id, month, year } = req.query;

  try {
    if (!class_id || !month || !year) {
      throw new AppError('class_id, month and year are required', 400); // CHANGED: throw AppError
    }

    const result = await pool.query(
      `SELECT
         COUNT(*) as total_students,
         COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
         COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count,
         COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_collected,
         SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END) as total_pending
       FROM fees
       WHERE class_id = $1 AND month = $2 AND year = $3`,
      [class_id, month, year]
    );

    res.json({
      success: true,
      report: 'Fee Collection Summary',
      month, year,
      data: result.rows[0]
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const attendanceSummaryReport = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { class_id, month, year } = req.query;

  try {
    if (!class_id) {
      throw new AppError('class_id is required', 400); // CHANGED: throw AppError
    }

    let sessionQuery = `SELECT id FROM attendance_sessions WHERE class_id = $1`;
    const params: any[] = [class_id];
    let count = 2;

    if (month && year) {
      sessionQuery += ` AND EXTRACT(MONTH FROM date) = $${count++} AND EXTRACT(YEAR FROM date) = $${count++}`;
      params.push(month, year);
    }

    const sessions = await pool.query(sessionQuery, params);
    const sessionIds = sessions.rows.map((s: any) => s.id);

    if (sessionIds.length === 0) {
      res.json({ success: true, report: 'Attendance Summary', total_sessions: 0, data: [] });
      return;
    }

    const result = await pool.query(
      `SELECT s.id, s.name as student_name, s.grade,
              COUNT(a.id) as attended,
              $1::int as total_sessions,
              ROUND((COUNT(a.id)::decimal / $1::int) * 100, 2) as percentage
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.session_id = ANY($2::uuid[])
       WHERE e.class_id = $3
       GROUP BY s.id, s.name, s.grade
       ORDER BY percentage DESC`,
      [sessionIds.length, sessionIds, class_id]
    );

    res.json({ success: true, report: 'Attendance Summary', total_sessions: sessionIds.length, data: result.rows });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const chronicAbsenteeReport = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { class_id, threshold } = req.query;
  const absenceThreshold = parseInt(threshold as string) || 50;

  try {
    if (!class_id) {
      throw new AppError('class_id is required', 400); // CHANGED: throw AppError
    }

    const sessions = await pool.query(
      'SELECT COUNT(*) as total FROM attendance_sessions WHERE class_id = $1',
      [class_id]
    );

    const totalSessions = parseInt(sessions.rows[0].total);

    if (totalSessions === 0) {
      res.json({ success: true, report: 'Chronic Absentee Report', data: [] });
      return;
    }

    const result = await pool.query(
      `SELECT s.id, s.name as student_name, s.grade, s.parent_name, s.parent_contact,
              COUNT(a.id) as attended,
              $1::int as total_sessions,
              ROUND((COUNT(a.id)::decimal / $1::int) * 100, 2) as attendance_percentage
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       LEFT JOIN attendance a
         ON a.student_id = s.id
         AND a.session_id IN (SELECT id FROM attendance_sessions WHERE class_id = $2)
       WHERE e.class_id = $2
       GROUP BY s.id, s.name, s.grade, s.parent_name, s.parent_contact
       HAVING ROUND((COUNT(a.id)::decimal / $1::int) * 100, 2) < $3
       ORDER BY attendance_percentage ASC`,
      [totalSessions, class_id, absenceThreshold]
    );

    res.json({
      success: true,
      report: 'Chronic Absentee Report',
      threshold_percentage: absenceThreshold,
      total_chronic_absentees: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const studentFullReport = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { student_id } = req.params;

  try {
    const studentResult = await pool.query(
      `SELECT s.*, i.name as institute_name
       FROM students s
       LEFT JOIN institutes i ON s.institute_id = i.id
       WHERE s.id = $1`,
      [student_id]
    );

    if (studentResult.rows.length === 0) {
      throw new AppError('Student not found', 404); // CHANGED: throw AppError
    }

    const feeResult = await pool.query(
      `SELECT f.month, f.year, f.amount, f.status, f.paid_at, c.name as class_name
       FROM fees f
       JOIN classes c ON f.class_id = c.id
       WHERE f.student_id = $1
       ORDER BY f.year DESC, f.month DESC`,
      [student_id]
    );

    const attendanceResult = await pool.query(
      `SELECT c.name as class_name,
              COUNT(sess.id) as total_sessions,
              COUNT(a.id) as attended,
              ROUND((COUNT(a.id)::decimal / NULLIF(COUNT(sess.id), 0)) * 100, 2) as percentage
       FROM enrollments e
       JOIN classes c ON e.class_id = c.id
       JOIN attendance_sessions sess ON sess.class_id = c.id
       LEFT JOIN attendance a ON a.session_id = sess.id AND a.student_id = $1
       WHERE e.student_id = $1
       GROUP BY c.id, c.name`,
      [student_id]
    );

    res.json({
      success: true,
      report: 'Full Student Report',
      data: {
        student: studentResult.rows[0],
        fee_history: feeResult.rows,
        attendance_summary: attendanceResult.rows
      }
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const dashboardSummary = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { institute_id } = req.query;

  try {
    if (!institute_id) {
      throw new AppError('institute_id is required', 400); // CHANGED: throw AppError
    }

    const studentsResult = await pool.query(
      'SELECT COUNT(*) as total FROM students WHERE institute_id = $1',
      [institute_id]
    );

    const classesResult = await pool.query(
      'SELECT COUNT(*) as total FROM classes WHERE institute_id = $1',
      [institute_id]
    );

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const feeResult = await pool.query(
      `SELECT
         COUNT(*) as total_fee_records,
         COUNT(CASE WHEN f.status = 'paid' THEN 1 END) as paid,
         COUNT(CASE WHEN f.status = 'unpaid' THEN 1 END) as unpaid,
         COUNT(CASE WHEN f.status = 'partial' THEN 1 END) as partial,
         SUM(CASE WHEN f.status = 'paid' THEN f.amount ELSE 0 END) as total_collected
       FROM fees f
       JOIN classes c ON f.class_id = c.id
       WHERE c.institute_id = $1 AND f.month = $2 AND f.year = $3`,
      [institute_id, currentMonth, currentYear]
    );

    const today = new Date().toISOString().split('T')[0];
    const todaySessionsResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM attendance_sessions s
       JOIN classes c ON s.class_id = c.id
       WHERE c.institute_id = $1 AND s.date = $2`,
      [institute_id, today]
    );

    res.json({
      success: true,
      report: 'Dashboard Summary',
      month: currentMonth,
      year: currentYear,
      data: {
        total_students: studentsResult.rows[0].total,
        total_classes: classesResult.rows[0].total,
        todays_sessions: todaySessionsResult.rows[0].total,
        fee_summary: feeResult.rows[0]
      }
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};