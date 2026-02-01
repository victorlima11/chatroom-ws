import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { uploadsDir } from './config/uploads';
import userRoutes from './routes/userRoutes';

dotenv.config();

export const app = express();

app.use(morgan('dev'));

app.use(express.json());
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use("/api", userRoutes)
app.use('/uploads', express.static(uploadsDir));

app.get('/', (req, res) => {
  res.send('Default route;');
});
