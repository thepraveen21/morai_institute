import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';


import authRoutes from './routes/auth.routes';
import instituteRoutes from './routes/institute.routes';
import classRoutes from './routes/class.routes';
import studentRoutes from './routes/student.routes';
import feeRoutes from './routes/fee.routes';
import attendanceRoutes from './routes/attendance.routes';
import announcementRoutes from './routes/announcement.routes';
import reportRoutes from './routes/report.routes';
import teacherRoutes from './routes/teacher.routes';
import portalRoutes from './routes/portal.routes';
import errorMiddleware from './middleware/error.middleware';
import { generalLimiter } from './middleware/security.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security ──────────────────────────────
app.use(helmet());
app.use(generalLimiter);
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());



// ── Health Check ──────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Morai Institute OS API is running' });
});

// ── Routes ────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/portal', portalRoutes);

// ── 404 Handler ───────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ── Global Error Handler ──────────────────
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});