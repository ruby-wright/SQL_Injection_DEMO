import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, 
  },
});

// Test route
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Server connected to Supabase",
      time: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// In-band SQL Injection Demo
// Vulnerable Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const query = `
    SELECT * FROM users
    WHERE username = '${username}'
    AND password = '${password}'
  `;

  console.log("Executing query:", query);

  try {
    const result = await pool.query(query);

    if (result.rows.length > 0) {
      res.json({ message: "Login successful", data: result.rows });
    } else {
      res.json({ message: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Secure Login (Parameterized Query)
app.post("/login-secure", async (req, res) => {
    const { username, password } = req.body;

    const query = `
    SELECT * FROM users
    WHERE username = $1
    AND password = $2
  `;

    try {
        const result = await pool.query(query, [username, password]);

        if (result.rows.length > 0) {
            res.json({ message: "Secure login successful", data: result.rows });
        } else {
            res.json({ message: "Invalid credentials (secure)" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Boolean-based blind SQL Injection Demo
app.get("/blind-user-exists", async (req, res) => {
    const { username } = req.query;

    // VULNERABLE: username allows SQL injection due to string interpolation
    // SECURE: parametrized query using $1 would prevent injection
    const query = `
    SELECT 1
    FROM users
    WHERE username = '${username}' 
    LIMIT 1
  `;

    try {
        const result = await pool.query(query);

        // Only reveal TRUE/FALSE, not actual user data
        const exists = result.rows.length > 0;
        res.json({ userExists: exists });
    } catch (err) {
        console.error("Blind SQL error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});
