import { Request, Response } from 'express';
import pool from '../config/db';

// Get Teacher's Assigned Classes
export const getMyClasses = async (req: Request, res: Response): Promise<void> => {
  const teacher_id = (req as any).user.id;

  try {
    const result = await pool.query(
      `SELECT
         c.*,
         i.name as institute_name,
         i.address as institute_address,
         COUNT(e.id) as total_students
       FROM classes c
       LEFT JOIN institutes i ON c.institute_id = i.id
       LEFT JOIN enrollments e ON e.class_id = c.id
       WHERE c.teacher_id = $1
       GROUP BY c.id, i.name, i.address
       ORDER BY c.created_at DESC`,
      [teacher_id]
    );

    if (result.rows.length === 0) {
      res.json({
        success: true,
        message: 'No classes assigned yet',
        data: []
      });
      return;
    }

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Single Class Detail (only if assigned to this teacher)
export const getMyClassById = async (req: Request, res: Response): Promise<void> => {
  const teacher_id = (req as any).user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         c.*,
         i.name as institute_name,
         i.address as institute_address
       FROM classes c
       LEFT JOIN institutes i ON c.institute_id = i.id
       WHERE c.id = $1 AND c.teacher_id = $2`,
      [id, teacher_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Class not found or not assigned to you'
      });
      return;
    }

    // Get enrolled students for this class
    const studentsResult = await pool.query(
      `SELECT s.id, s.name, s.grade, s.parent_contact
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.class_id = $1
       ORDER BY s.name ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        students: studentsResult.rows,
        total_students: studentsResult.rows.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Attendance Summary for Teacher's Class
export const getMyClassAttendance = async (req: Request, res: Response): Promise<void> => {
  const teacher_id = (req as any).user.id;
  const { id } = req.params;

  try {
    // Verify class belongs to this teacher
    const classCheck = await pool.query(
      'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
      [id, teacher_id]
    );

    if (classCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Class not found or not assigned to you'
      });
      return;
    }

    // Get total sessions for this class
    const sessionsResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM attendance_sessions
       WHERE class_id = $1`,
      [id]
    );

    const totalSessions = parseInt(sessionsResult.rows[0].total);

    if (totalSessions === 0) {
      res.json({
        success: true,
        message: 'No attendance sessions found for this class',
        total_sessions: 0,
        data: []
      });
      return;
    }

    // Get per student attendance summary
    const result = await pool.query(
      `SELECT
         s.id,
         s.name as student_name,
         s.grade,
         COUNT(a.id) as attended,
         $1::int as total_sessions,
         ROUND((COUNT(a.id)::decimal / $1::int) * 100, 2) as percentage
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       LEFT JOIN attendance a
         ON a.student_id = s.id
         AND a.session_id IN (
           SELECT id FROM attendance_sessions WHERE class_id = $2
         )
       WHERE e.class_id = $2
       GROUP BY s.id, s.name, s.grade
       ORDER BY percentage DESC`,
      [totalSessions, id]
    );

    res.json({
      success: true,
      total_sessions: totalSessions,
      data: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Recent Attendance Sessions for Teacher's Class
export const getMyClassSessions = async (req: Request, res: Response): Promise<void> => {
  const teacher_id = (req as any).user.id;
  const { id } = req.params;

  try {
    // Verify class belongs to this teacher
    const classCheck = await pool.query(
      'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
      [id, teacher_id]
    );

    if (classCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Class not found or not assigned to you'
      });
      return;
    }

    const result = await pool.query(
      `SELECT
         s.id,
         s.date,
         s.created_at,
         COUNT(a.id) as present_count
       FROM attendance_sessions s
       LEFT JOIN attendance a ON a.session_id = s.id
       WHERE s.class_id = $1
       GROUP BY s.id, s.date, s.created_at
       ORDER BY s.date DESC
       LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Teacher Dashboard Summary
export const getTeacherDashboard = async (req: Request, res: Response): Promise<void> => {
  const teacher_id = (req as any).user.id;

  try {
    // Total assigned classes
    const classesResult = await pool.query(
      'SELECT COUNT(*) as total FROM classes WHERE teacher_id = $1',
      [teacher_id]
    );

    // Total students across all classes
    const studentsResult = await pool.query(
      `SELECT COUNT(DISTINCT e.student_id) as total
       FROM enrollments e
       JOIN classes c ON e.class_id = c.id
       WHERE c.teacher_id = $1`,
      [teacher_id]
    );

    // Today's classes
    const today = new Date().toISOString().split('T')[0];
    const todayResult = await pool.query(
      `SELECT
         c.id,
         c.name,
         c.subject,
         c.schedule,
         s.id as session_id,
         s.date as session_date
       FROM classes c
       LEFT JOIN attendance_sessions s
         ON s.class_id = c.id AND s.date = $1
       WHERE c.teacher_id = $2`,
      [today, teacher_id]
    );

    // Recent announcements posted by this teacher
    const announcementsResult = await pool.query(
      `SELECT a.id, a.title, a.created_at, c.name as class_name
       FROM announcements a
       JOIN classes c ON a.class_id = c.id
       WHERE a.posted_by = $1
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [teacher_id]
    );

    res.json({
      success: true,
      data: {
        total_classes: classesResult.rows[0].total,
        total_students: studentsResult.rows[0].total,
        todays_classes: todayResult.rows,
        recent_announcements: announcementsResult.rows
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};