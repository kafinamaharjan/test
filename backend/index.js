const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize database table and sample items
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        description TEXT,
        image_url TEXT
      );
    `);

    const res = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(res.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO products (name, price, description, image_url) VALUES
        ('Vintage Leather Jacket', 129.99, 'Classic 90s style distressed leather jacket.', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'),
        ('Minimalist Gold Ring', 75.00, 'Elegant 14k gold band perfect for neutral tones.', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500'),
        ('Crimson Cotton Chiffon Saree', 89.50, 'Traditional lightweight crimson red drape with black borders.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500');
      `);
      console.log('Database seeded with dynamic catalog.');
    }
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
}

// Routes
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const DEFAULT_PORT = 7319;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const hasExplicitPort = Boolean(process.env.PORT);

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    initDB();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && !hasExplicitPort) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Trying port ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error(`Failed to start server on port ${port}:`, err.message);
    process.exit(1);
  });
}

startServer(PORT);
