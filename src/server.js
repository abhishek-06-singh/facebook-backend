const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDatabase = require('./config/database');
const setupSocket = require('./socket/socket');
const { setSocket } = require('./socket/socket.instance');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const startServer = async () => {
  try {
    await connectDatabase();
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      },
    });

    setupSocket(io);
    setSocket(io);

    server.listen(PORT, () => {
      console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
