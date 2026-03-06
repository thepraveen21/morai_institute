import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';
import AppError from '../utils/AppError'; 
import { sendSMS } from '../services/sms.service';

export const createAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { class_id, title, body } = req.body;
  const posted_by = (req as any).user.id;

  try {
    if (!class_id || !title || !body) {
      throw new AppError('class_id, title and body are required', 400); 
    }

    const classCheck = await pool.query('SELECT id FROM classes WHERE id = $1', [class_id]);
    if (classCheck.rows.length === 0) {
      throw new AppError('Class not found', 404); 
    }

    const result = await pool.query(
      'INSERT INTO announcements (class_id, posted_by, title, body) VALUES ($1, $2, $3, $4) RETURNING *',
      [class_id, posted_by, title, body]
    );

    res.status(201).json({
      success: true,
      message: 'Announcement posted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error); 
  }
};

export const getAnnouncements = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { class_id } = req.query;

  try {
    let query = `
      SELECT a.*, u.name as posted_by_name, c.name as class_name
      FROM announcements a
      LEFT JOIN users u ON a.posted_by = u.id
      LEFT JOIN classes c ON a.class_id = c.id
    `;
    const params: any[] = [];

    if (class_id) {
      query += ' WHERE a.class_id = $1';
      params.push(class_id);
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error); 
  }
};

export const getAnnouncementById = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT a.*, u.name as posted_by_name, c.name as class_name
       FROM announcements a
       LEFT JOIN users u ON a.posted_by = u.id
       LEFT JOIN classes c ON a.class_id = c.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Announcement not found', 404); 
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error); 
  }
};

export const updateAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { id } = req.params;
  const { title, body } = req.body;

  try {
    const result = await pool.query(
      `UPDATE announcements
       SET title = COALESCE($1, title),
           body  = COALESCE($2, body)
       WHERE id = $3
       RETURNING *`,
      [title, body, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Announcement not found', 404); 
    }

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error); 
  }
};

export const deleteAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM announcements WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Announcement not found', 404); 
    }

    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    next(error); 
  }
};

export const sendFeeReminders = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { class_id, month, year } = req.body;

  try {
    if (!class_id || !month || !year) {
      throw new AppError('class_id, month and year are required', 400); 
    }

    const unpaidResult = await pool.query(
      `SELECT f.amount, s.name as student_name, s.parent_contact, s.parent_name, c.name as class_name
       FROM fees f
       JOIN students s ON f.student_id = s.id
       JOIN classes c ON f.class_id = c.id
       WHERE f.class_id = $1 AND f.month = $2 AND f.year = $3
         AND f.status != 'paid' AND s.parent_contact IS NOT NULL`,
      [class_id, month, year]
    );

    if (unpaidResult.rows.length === 0) {
      res.json({ success: true, message: 'No unpaid fees found to send reminders' });
      return;
    }

    const results = await Promise.all(
      unpaidResult.rows.map(async (row) => {
        const message =
          `Dear ${row.parent_name || 'Parent'}, this is a reminder that ` +
          `${row.student_name}'s fee of Rs. ${row.amount} for ${row.class_name} ` +
          `(${month} ${year}) is unpaid. Please settle at your earliest. - Morai Institute`;
        const sent = await sendSMS(row.parent_contact, message);
        return { student: row.student_name, contact: row.parent_contact, sent };
      })
    );

    const successCount = results.filter((r) => r.sent).length;
    res.json({
      success: true,
      message: `Reminders sent to ${successCount} of ${results.length} parents`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

export const sendCustomSMS = async (
  req: Request,
  res: Response,
  next: NextFunction 
): Promise<void> => {
  const { class_id, message } = req.body;

  try {
    if (!class_id || !message) {
      throw new AppError('class_id and message are required', 400); 
    }

    const contacts = await pool.query(
      `SELECT s.name as student_name, s.parent_contact, s.parent_name
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.class_id = $1 AND s.parent_contact IS NOT NULL`,
      [class_id]
    );

    if (contacts.rows.length === 0) {
      res.json({ success: true, message: 'No contacts found for this class' });
      return;
    }

    const results = await Promise.all(
      contacts.rows.map(async (row) => {
        const sent = await sendSMS(row.parent_contact, message);
        return { student: row.student_name, contact: row.parent_contact, sent };
      })
    );

    const successCount = results.filter((r) => r.sent).length;
    res.json({
      success: true,
      message: `SMS sent to ${successCount} of ${results.length} parents`,
      data: results
    });
  } catch (error) {
    next(error); 
  }
};