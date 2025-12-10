
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USERNAME || 'dbadmin',
  password: process.env.DB_PASSWORD || 'dbadmin',
  database: process.env.DB_NAME || 'mailskrap_db',
};

let connection: mysql.Connection | null = null;

export const connectDB = async () => {
  try {
    if (!connection) {
      connection = await mysql.createConnection(dbConfig);
      console.log('Database connected successfully');
    }
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

export const executeQuery = async (query: string, params: any[] = []) => {
  try {
    const conn = await connectDB();
    const [results] = await conn.execute(query, params);
    return results;
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  }
};
