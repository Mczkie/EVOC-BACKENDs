const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const Database = require("better-sqlite3");

const mobileDb = new Database("./mobile_users.db");
const app = express();

// CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "https://your-react.onrender.com"],
    credentials: true,
  })
);

app.use(express.json());

// POSTGRES CONNECTION (Render)
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});


// LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email & Password required" });

  try {
    const result = await db.query(
      "SELECT * FROM admin WHERE email=$1 AND password=$2",
      [email, password]
    );

    if (result.rows.length > 0)
      return res.json({ message: "Login successful" });

    res.status(401).json({ message: "Invalid credentials" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ADD ADMIN
app.post("/api/admin", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ message: "All fields required" });

  try {
    const result = await db.query(
      "INSERT INTO admin(name,email,password,role) VALUES($1,$2,$3,$4) RETURNING id",
      [name, email, password, role]
    );

    res.json({ id: result.rows[0].id, name, email, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// FETCH USERS
app.get("/api/users", async (req, res) => {
  try {
    const result = await db.query("SELECT id,email,name,role FROM admin");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE USER
app.delete("/api/users/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM admin WHERE id=$1",
      [req.params.id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// REPORTS
app.get("/api/reports", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM reports");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reports", async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description)
    return res.status(400).json({ message: "Required" });

  try {
    const result = await db.query(
      "INSERT INTO reports(title,description) VALUES($1,$2) RETURNING id",
      [title, description]
    );
    res.json({ id: result.rows[0].id, title, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// COLLECTION UPDATE
app.put("/api/collection/:id", async (req, res) => {
  const { location, street, date } = req.body;
  if (!location || !street || !date)
    return res.status(400).json({ message: "All fields required" });

  try {
    const result = await db.query(
      "UPDATE collection SET location=$1, street=$2, date=$3 WHERE id=$4",
      [location, street, date, req.params.id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Not found" });

    res.json({ id: req.params.id, location, street, date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// SQLITE MOBILE USERS
app.get("/api/mobileuser", (req, res) => {
  try {
    const rows = mobileDb.prepare("SELECT id,name,email FROM users").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/mobileuser", (req, res) => {
  const { name, email, password } = req.body;
  try {
    const stmt = mobileDb.prepare(
      "INSERT INTO users(name,email,password) VALUES(?,?,?)"
    );
    const info = stmt.run(name, email, password);
    res.json({ id: info.lastInsertRowid, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
