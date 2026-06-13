import { app, server as httpServer } from './app';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { AppDataSource, ensureDatabaseExists } from './config/database';
import { setRealtimeServer } from './services/realtime';

dotenv.config();

const port = process.env.PORT || 8001;

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
async function bootstrap() {
  try {
    // Step 1: Ensure the database exists (auto-create if missing)
    await ensureDatabaseExists();

    // Step 2: Initialize TypeORM DataSource (creates tables via synchronize)
    await AppDataSource.initialize();
    console.log('✅ PostgreSQL Database connected and synchronized successfully');

    httpServer.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📡 API available at http://localhost:${port}/api/v1`);
      console.log(`🔗 Health check at http://localhost:${port}/health`);
    });
  } catch (error: any) {
    console.error('⚠️  Database connection failed:', error.message);
    console.log('🔄 Starting server without database connection (using in-memory/file storage)...');

    // Continue without database - start server anyway
    httpServer.listen(port, () => {
      console.log(`🚀 Server running on port ${port} (without database connection)`);
      console.log(`📡 API available at http://localhost:${port}/api/v1`);
      console.log(`🔗 Health check at http://localhost:${port}/health`);
    });
  }
}

bootstrap();
