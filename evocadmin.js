import { createClient } from "@supabase/supabase-js";
import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import { Pool } from "pg";

import fs from "fs";
import multer from "multer";

const app = express();

app.use("/uploads", express.static("uploads"));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase env variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://evocadmins.vercel.app",
];

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/x-m4v",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed"));
    }
  },
});

// Body parser
app.use(express.json());

// MySQL connection
process.env.NODE_OPTIONS = "--dns-result-order=ipv4first";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool
  .query("SELECT NOW()")
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch((err) => console.error("❌ PostgreSQL Error:", err));

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
app.post("/api/announcement", upload.single("image"), async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      message: "Title and description required",
    });
  }

  try {
    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      `
  INSERT INTO announcement
  (
    title,
    description,
    media,
    time_stamp
  )
  VALUES
  ($1, $2, $3, NOW())
  RETURNING *
  `,
      [title, description, mediaUrl],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
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

    const result = await pool.query(query, [title, description, id]);

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

//// Add a mobile user
// Add mobile user
app.post("/api/mobile-users", async (req, res) => {
  console.log("Incoming mobile user:", req.body);

  const { name, role, location } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO mobile_users (name, role, location)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [name, role, location],
    );

    console.log("Inserted:", result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Fetch users
app.get("/api/mobile-users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM mobile_users ORDER BY id DESC",
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// barangay profiles
app.post("/api/barangay", async (req, res) => {
  const {
    name,
    captain,
    population,
    households,
    area,
    address,
    collectors,
    vehicles,
    phone,
    email,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO barangay
       (name, captain, population, households, area, address, collectors, vehicles, phone, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        name,
        captain,
        population,
        households,
        area,
        address,
        collectors,
        vehicles,
        phone,
        email,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

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
    const result = await pool.query("SELECT * FROM barangay WHERE id = $1", [
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/barangay/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = req.body;

  const safeInt = (val) => {
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
  };

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
      safeInt(body.population),
      safeInt(body.households),
      body.area,
      body.address,
      safeInt(body.collectors),
      safeInt(body.vehicles),
      body.phone,
      body.email,
      id,
    ],
  );

  return res.json(result.rows[0]);
});

app.delete("/api/barangay/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM barangay WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Barangay not found" });
    }

    res.json({ message: "Deleted successfully", deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres error:", err);
});
