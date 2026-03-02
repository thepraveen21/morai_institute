import { Request, Response, NextFunction } from 'express'; // CHANGED: Added NextFunction
import pool from '../config/db';
import AppError from '../utils/AppError'; // CHANGED: Added AppError import

export const createStudent = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { institute_id, name, date_of_birth, grade, parent_name, parent_contact, parent_email, address } = req.body;

  try {
    if (!institute_id || !name) {
      throw new AppError('institute_id and name are required', 400); // CHANGED: throw AppError
    }

    const institute = await pool.query('SELECT id FROM institutes WHERE id = $1', [institute_id]);
    if (institute.rows.length === 0) {
      throw new AppError('Institute not found', 404); // CHANGED: throw AppError
    }

    const result = await pool.query(
      `INSERT INTO students
        (institute_id, name, date_of_birth, grade, parent_name, parent_contact, parent_email, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [institute_id, name, date_of_birth || null, grade, parent_name, parent_contact, parent_email, address]
    );

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const getStudents = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { institute_id } = req.query;

  try {
    let query = `
      SELECT s.*, i.name as institute_name
      FROM students s
      LEFT JOIN institutes i ON s.institute_id = i.id
    `;
    const params: any[] = [];

    if (institute_id) {
      query += ' WHERE s.institute_id = $1';
      params.push(institute_id);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const getStudentById = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { id } = req.params;

  try {
    const studentResult = await pool.query(
      `SELECT s.*, i.name as institute_name
       FROM students s
       LEFT JOIN institutes i ON s.institute_id = i.id
       WHERE s.id = $1`,
      [id]
    );

    if (studentResult.rows.length === 0) {
      throw new AppError('Student not found', 404); // CHANGED: throw AppError
    }

    const classesResult = await pool.query(
      `SELECT c.id, c.name, c.subject, c.fee_amount, c.schedule, e.enrolled_at
       FROM enrollments e
       JOIN classes c ON e.class_id = c.id
       WHERE e.student_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...studentResult.rows[0],
        enrolled_classes: classesResult.rows
      }
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const updateStudent = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { id } = req.params;
  const { name, date_of_birth, grade, parent_name, parent_contact, parent_email, address } = req.body;

  try {
    const result = await pool.query(
      `UPDATE students
       SET name           = COALESCE($1, name),
           date_of_birth  = COALESCE($2, date_of_birth),
           grade          = COALESCE($3, grade),
           parent_name    = COALESCE($4, parent_name),
           parent_contact = COALESCE($5, parent_contact),
           parent_email   = COALESCE($6, parent_email),
           address        = COALESCE($7, address)
       WHERE id = $8
       RETURNING *`,
      [name, date_of_birth, grade, parent_name, parent_contact, parent_email, address, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Student not found', 404); // CHANGED: throw AppError
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const deleteStudent = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM students WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Student not found', 404); // CHANGED: throw AppError
    }

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const enrollStudent = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { student_id, class_id } = req.body;

  try {
    if (!student_id || !class_id) {
      throw new AppError('student_id and class_id are required', 400); // CHANGED: throw AppError
    }

    const student = await pool.query('SELECT id FROM students WHERE id = $1', [student_id]);
    if (student.rows.length === 0) {
      throw new AppError('Student not found', 404); // CHANGED: throw AppError
    }

    const classCheck = await pool.query('SELECT id FROM classes WHERE id = $1', [class_id]);
    if (classCheck.rows.length === 0) {
      throw new AppError('Class not found', 404); // CHANGED: throw AppError
    }

    const result = await pool.query(
      'INSERT INTO enrollments (student_id, class_id) VALUES ($1, $2) RETURNING *',
      [student_id, class_id]
    );

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};

export const unenrollStudent = async (
  req: Request,
  res: Response,
  next: NextFunction // CHANGED: Added next parameter
): Promise<void> => {
  const { student_id, class_id } = req.body;

  try {
    const result = await pool.query(
      'DELETE FROM enrollments WHERE student_id = $1 AND class_id = $2 RETURNING id',
      [student_id, class_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Enrollment not found', 404); // CHANGED: throw AppError
    }

    res.json({ success: true, message: 'Student unenrolled successfully' });
  } catch (error) {
    next(error); // CHANGED: pass error to global handler
  }
};