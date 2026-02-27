import express from 'express';
import cors from 'cors';
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


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
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


// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Morai Institute OS API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});