import app from './app';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import { setRealtimeServer } from './services/realtime';

dotenv.config();

const port = process.env.PORT || 8001;
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setRealtimeServer(io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize DB and start server
AppDataSource.initialize()
  .then(() => {
    console.log('PostgreSQL Database connected successfully');
    httpServer.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to the database', error);
    // Continue without database - start server anyway
    httpServer.listen(port, () => {
      console.log(`Server running on port ${port} (without database connection)`);
    });
  });
