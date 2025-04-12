import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import compilerRoutes from './routes/compilerRoutes';
import userRoutes from './routes/userRoutes';
import codeRoutes from './routes/codeRoutes';
import { initializeCompilerService } from './controllers/compilerController';
import { specs, swaggerUi } from './config/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'cdnjs.cloudflare.com', 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:']
    }
  }
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

app.use('/api/auth', authRoutes);
app.use('/api/compiler', compilerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/codes', codeRoutes);

app.use('/api', errorHandler);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initializeCompilerService().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
