import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import instituteRoutes from './routes/institute.routes';
import classRoutes from './routes/class.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// institute and class routes
app.use('/api/institutes', instituteRoutes);
app.use('/api/classes', classRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Morai Institute OS API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});