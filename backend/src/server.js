require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connection on start
    await prisma.$connect();
    console.log('Connected to Neon PostgreSQL database successfully.');

    app.listen(PORT, () => {
      console.log(`CEMS Backend Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

