const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const mobileDb = new Database("./api/mobile_users.db");
const { Pool } = require("pg");
const { json } = require("body-parser");

const app = express();

// CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://evocadmins.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow server-to-server or Postman
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(
          new Error("CORS policy does not allow this origin"),
          false,
        );
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // allow these methods
    allowedHeaders: ["Content-Type", "Authorization"], // allow these headers
  }),
);

// Handle OPTIONS requests
app.options("*", cors());

// Body parser
app.use(express.json());

// MySQL connection
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://evocadmin_database_user:7FFoHJCX0RHHpyiSlwcB3ah7BL7Y4Roc@dpg-d81jrb8g4nts738567tg-a.oregon-postgres.render.com/evocadmin_database", // e.g., evocapp-postgres.onrender.com
  user: process.env.PGUSER || "evocadmin_database_user",
  password: process.env.PGPASSWORD || "7FFoHJCX0RHHpyiSlwcB3ah7BL7Y4Roc",
  database: process.env.PGDATABASE || "evocadmin_database",
  port: process.env.PGPORT || 5432, // PostgreSQL default port
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error("Postgres connection error", err.stack);
  }
  console.log("Postgres connected successfully!");
  release();
});

// LOGIN route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT id, name, email, role FROM admin WHERE email = $1 AND password = $2",
      [email, password],
    );

    if (result.rows.length > 0) {
      return res.status(200).json({
        message: "Login successful!",
        user: result.rows[0], // 🔥 MUST EXIST
      });
    }

    return res.status(401).json({ message: "Invalid credentials" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
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
      [email, password],
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
    return res
      .status(500)
      .json({ message: "Database query failed", error: err.message });
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
      [name, email, password, role],
    );

    res.status(201).json(result.rows[0]); // Return the newly inserted user
  } catch (err) {
    console.error("Postgres insert error:", err);
    res
      .status(500)
      .json({ message: "Failed to add new admin", error: err.message });
  }
});

// Fetch all users
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, email, name, role FROM admin");
    res.status(200).json(result.rows); // PostgreSQL returns rows
  } catch (err) {
    console.error("Error fetching users:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: err.message });
  }
});

// Delete a user
app.delete("/api/users", async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM admin WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User deleted successfully",
      deletedId: result.rows[0].id,
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    res
      .status(500)
      .json({ message: "Failed to delete user", error: err.message });
  }
});

// Fetch all reports
app.get("/api/reports", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM reports");
    res.status(200).json(result.rows); // PostgreSQL returns rows
  } catch (err) {
    console.error("Error fetching reports:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch reports", error: err.message });
  }
});

// Add a new report
app.post("/api/reports", async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .json({ message: "Title and description are required!" });
  }

  try {
    const query =
      "INSERT INTO reports (title, description) VALUES ($1, $2) RETURNING id, title, description";
    const result = await pool.query(query, [title, description]);

    res.status(201).json(result.rows[0]); // Return the inserted report
  } catch (err) {
    console.error("Error adding report:", err);
    res
      .status(500)
      .json({ message: "Failed to submit report", error: err.message });
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
    res
      .status(500)
      .json({ message: "Failed to delete report", error: err.message });
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
    res
      .status(500)
      .json({ message: "Failed to fetch announcements", error: err.message });
  }
});

// Add announcement route
app.post("/api/announcement", async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .send({ message: "Title and description are required" });
  }

  // 🔥 AUTO GENERATE TIME HERE
  const time_stamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  try {
    const query = `
      INSERT INTO announcement (title, description, time_stamp)
      VALUES ($1, $2, $3)
      RETURNING id, title, description, time_stamp
    `;

    const result = await pool.query(query, [
      title,
      description,
      time_stamp,
    ]);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to submit announcement:", err);
    res.status(500).send({
      message: "Failed to submit announcement",
      error: err.message,
    });
  }
});

app.put("/api/announcement/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  try {
    const query = `
      UPDATE announcement
      SET title=$1, description=$2
      WHERE id=$3
      RETURNING *
    `;

    const result = await pool.query(query, [
      title,
      description,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res
      .status(500)
      .json({ message: "Failed to delete announcement", error: err.message });
  }
});

// Get collection route
app.get("/api/collection", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM collection");
    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch collection:", err);
    res
      .status(500)
      .send({ message: "Failed to fetch collection", error: err.message });
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
    res
      .status(500)
      .send({ message: "Failed to submit collection", error: err.message });
  }
});

app.get("/api/fixedschedule", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM fixed_schedule ORDER BY date ASC, time ASC",
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching fixed schedules:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/fixedschedule", async (req, res) => {
  const { barangay, collectionType, date, time, title } = req.body;

  if (!barangay || !collectionType || !date || !time) {
    return res.status(400).json({
      message: "Barangay, collection type, date, and time are required",
    });
  }

  try {
    const query = `
      INSERT INTO fixed_schedule (barangay, collection_type, date, time, title)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [
      barangay,
      collectionType,
      date,
      time,
      title || null,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding fixed schedule:", err);
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/fixedschedule/:id", async (req, res) => {
  const { id } = req.params;
  const { barangay, collectionType, date, time, title } = req.body;

  try {
    const query = `
      UPDATE fixed_schedule
      SET barangay=$1,
          collection_type=$2,
          date=$3,
          time=$4,
          title=$5
      WHERE id=$6
      RETURNING *
    `;

    const result = await pool.query(query, [
      barangay,
      collectionType,
      date,
      time,
      title,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/fixedschedule/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM fixed_schedule WHERE id=$1", [id]);

    res.json({ message: "Schedule deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: err.message });
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

// sqlite connection
app.get("/api/mobileuser", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email FROM mobile_users");

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching mobile users:", err);
    res.status(500).json({ message: err.message });
  }
});

// Add a mobile user
app.post("/api/mobileuser", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, Email, Password required" });
  }

  try {
    const query = `
      INSERT INTO mobile_users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email
    `;

    const result = await pool.query(query, [name, email, password]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error inserting mobile user:", err);
    res.status(500).json({ message: err.message });
  }
});

// barangay profiles
app.get("/api/barangay", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM barangay ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/barangay/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM barangay WHERE id = $1",
      [id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/barangay/:id", async (req, res) => {
  // 1. Force the ID to be a Base-10 Integer
  const id = parseInt(req.params.id, 10); 
  const body = req.body;

  console.log("UPDATE PAYLOAD RECEIVED:", body);

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid Barangay ID format" });
  }

  try {
    // 2. Sanitize and convert numeric values so Postgres doesn't reject them
    const population = body.population ? parseInt(body.population, 10) : 0;
    const households = body.households ? parseInt(body.households, 10) : 0;
    const collectors = body.collectors ? parseInt(body.collectors, 10) : 0;
    const vehicles = body.vehicles ? parseInt(body.vehicles, 10) : 0;

    const result = await pool.query(
      `UPDATE barangay
       SET name=$1,
           captain=$2,
           population=$3,
           households=$4,
           area=$5,
           address=$6,
           collectors=$7,
           vehicles=$8,
           phone=$9,
           email=$10
       WHERE id=$11
       RETURNING *`,
      [
        body.name,
        body.captain,
        population,
        households,
        body.area,
        body.address,
        collectors,
        vehicles,
        body.phone,
        body.email,
        id, // Passed as a verified integer
      ]
    );

    // 3. Check if any row was actually found and altered
    if (result.rows.length === 0) {
      console.log(`⚠️ Warning: No barangay found with ID ${id}`);
      return res.status(404).json({ message: `No barangay found with ID ${id}. Zero rows updated.` });
    }

    console.log("Database updated successfully:", result.rows[0]);
    res.json(result.rows[0]);
    
  } catch (err) {
    console.error("Postgres Error details:", err.message);
    res.status(500).json({ message: "Database save failed", error: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
