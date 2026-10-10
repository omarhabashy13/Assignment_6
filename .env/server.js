import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import bookRoutes from './routes/bookRoutes.js';

dotenv.config();
connectDB();

const app = express();

app.use(express.json());

// ربط الـ Routes الأساسية
app.use('/', bookRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});