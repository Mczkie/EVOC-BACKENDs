const express = require("express");
const cors = require("cors");
const Database = require('better-sqlite3');
const mobileDb = new Database('./api/mobile_users.db');
const { Pool } = require("pg");
const { json } = require("body-parser");

const app = express();

// CORS
const allowedOrigins = [
  "http://localhost:3000", // local dev
  "https://evocadmins-ht3awl35v-mc-peterson-mercaders-projects.vercel.app" // deployed React
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman or server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// MySQL connection
const pool = new Pool({
  host: process.env.PGHOST || "dpg-d6k3br9aae7s7388rro0-a", // e.g., evocapp-postgres.onrender.com
  user: process.env.PGUSER || "evocdatabase_postgres_user",
  password: process.env.PGPASSWORD || "sKI0CTPWsSxfDXLohMBIPkmyKIHg3caP",
  database: process.env.PGDATABASE || "evocdatabase_postgres",
  port: process.env.PGPORT || 5432, // PostgreSQL default port
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Postgres connection error', err.stack);
  }
  console.log('Postgres connected successfully!');
  release();
});

// LOGIN route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and Password required" });

  try {
    const result = await pool.query(
      "SELECT * FROM admin WHERE email = $1 AND password = $2",
      [email, password]
    );

    if (result.rows.length > 0) {
      return res.status(200).json({ message: "Login successful!" });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Postgres login error:", err);
    return res.status(500).json({ message: "Database error", error: err.message });
  }
});

// Dashboard route
app.get("/api/Dashboard", async (req, res) => {
  // You need email and password from query parameters or headers
  const { email, password } = req.query; // for GET requests, usually passed as query params

  if (!email || !password) {
    return res.status(400).json({ message: "Email and Password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM admin WHERE email = $1 AND password = $2",
      [email, password]
    );

    if (result.rows.length > 0) {
      // You can't really redirect to React routes from backend.
      // Usually you just return data and let React handle routing
      return res.status(200).json({ message: "Dashboard access granted" });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Postgres dashboard error:", err);
    return res.status(500).json({ message: "Database query failed", error: err.message });
  }
});

// logout route
app.post("/api/logout", (req, res) => {
  // Only works if you have express-session initialized
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session", err);
        return res.status(500).json({ message: "Error logging out" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  } else {
    res.status(200).json({ message: "No active session" });
  }
});

// Add new admin user
app.post("/api/admin", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ message: "Name, Email, Password, and Role are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO admin (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
      [name, email, password, role]
    );

    res.status(201).json(result.rows[0]); // Return the newly inserted user
  } catch (err) {
    console.error("Postgres insert error:", err);
    res.status(500).json({ message: "Failed to add new admin", error: err.message });
  }
});

// Fetch all users
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, email, name, role FROM admin");
    res.status(200).json(result.rows); // PostgreSQL returns rows
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

// Delete a user
app.delete("/api/users", async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const result = await pool.query("DELETE FROM admin WHERE id = $1 RETURNING id", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully", deletedId: result.rows[0].id });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
});



// Fetch all reports
app.get("/api/reports", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM reports");
    res.status(200).json(result.rows); // PostgreSQL returns rows
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ message: "Failed to fetch reports", error: err.message });
  }
});

// Add a new report
app.post("/api/reports", async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: "Title and description are required!" });
  }

  try {
    const query = "INSERT INTO reports (title, description) VALUES ($1, $2) RETURNING id, title, description";
    const result = await pool.query(query, [title, description]);

    res.status(201).json(result.rows[0]); // Return the inserted report
  } catch (err) {
    console.error("Error adding report:", err);
    res.status(500).json({ message: "Failed to submit report", error: err.message });
  }
});



// Delete report route
app.delete("/api/reports", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "ID is required" });

  try {
    const query = "DELETE FROM reports WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.status(200).json({ message: "Report deleted successfully" });
  } catch (err) {
    console.error("Error deleting report:", err);
    res.status(500).json({ message: "Failed to delete report", error: err.message });
  }
});

// Fetch announcements route
app.get("/api/announcement", async (req, res) => {
  try {
    const query = "SELECT * FROM announcement ORDER BY time_stamp DESC";
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ message: "Failed to fetch announcements", error: err.message });
  }
});


// Add announcement route
app.post("/api/announcement", async (req, res) => {
  const { title, description, time_stamp } = req.body;

  if (!title || !description || !time_stamp) {
    return res
      .status(400)
      .send({ message: "Title, description, and timestamp are required" });
  }

  try {
    const query = `
      INSERT INTO announcement (title, description, time_stamp)
      VALUES ($1, $2, $3)
      RETURNING id, title, description, time_stamp
    `;
    const result = await pool.query(query, [title, description, time_stamp]);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to submit announcement:", err);
    res.status(500).send({ message: "Failed to submit announcement", error: err.message });
  }
});

// Delete announcement route
app.delete("/api/announcement", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "ID is required" });

  try {
    const query = "DELETE FROM announcement WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("Failed to delete announcement:", err);
    res.status(500).json({ message: "Failed to delete announcement", error: err.message });
  }
});


// Get collection route
app.get("/api/collection", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM collection");
    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch collection:", err);
    res.status(500).send({ message: "Failed to fetch collection", error: err.message });
  }
});

// Add collection route
app.post("/api/collection", async (req, res) => {
  const { location, street, date } = req.body;

  if (!location || !street || !date) {
    return res
      .status(400)
      .send({ message: "Location, Street, and Date are required" });
  }

  try {
    const query = `
      INSERT INTO collection (location, street, date)
      VALUES ($1, $2, $3)
      RETURNING id, location, street, date
    `;
    const result = await pool.query(query, [location, street, date]);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to submit collection:", err);
    res.status(500).send({ message: "Failed to submit collection", error: err.message });
  }
});

// Delete collection route
app.delete("/api/collection", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "ID is required" });

  try {
    const query = "DELETE FROM collection WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Collection not found" });
    }

    res.status(200).json({ message: "Collection deleted successfully" });
  } catch (err) {
    console.error("Failed to delete collection:", err);
    res.status(500).json({ message: "Failed to delete", error: err.message });
  }
});

// Update collection route
app.put("/api/collection/:id", async (req, res) => {
  const { id } = req.params;
  const { location, street, date } = req.body;

  if (!location || !street || !date) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const query = `
      UPDATE collection
      SET location = $1, street = $2, date = $3
      WHERE id = $4
      RETURNING id, location, street, date
    `;
    const result = await pool.query(query, [location, street, date, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Collection not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to update collection:", err);
    res.status(500).json({ message: "Failed to update", error: err.message });
  }
});


// Barangay East Bajac-Bajac Api connection
app.get('/api/barangay/east-bajac-bajac', (req, res) => {
    const barangayData = {
        name: "Barangay East Bajac-Bajac",
        city: "Olongapo City",
        region: "Central Luzon (Region III)",
        coordinates: {
            latitude: 14.8429,
            longitude: 120.2912
        },
        elevation_m: 15.3,
        postal_code: "2200"
    };
    res.json(barangayData);
});


// sqlite connection 
app.get("/api/mobileuser", (req, res) => {
  try {
    const rows = mobileDb.prepare("SELECT id, name, email FROM users").all();
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/barangay/east-bajac-bajac', (req, res) => {
    const barangayData = {
        name: "Barangay East Bajac-Bajac",
        city: "Olongapo City",
        region: "Central Luzon (Region III)",
        coordinates: { latitude: 14.8429, longitude: 120.2912 },
        elevation_m: 15.3,
        postal_code: "2200"
    };
    res.json(barangayData);
});

// Add a mobile user
app.post("/api/mobileuser", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, Email, Password required" });
  }

  try {
    const stmt = mobileDb.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    const info = stmt.run(name, email, password);
    res.status(201).json({ id: info.lastInsertRowid, name, email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
