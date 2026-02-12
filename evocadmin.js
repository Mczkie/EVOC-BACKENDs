const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const Database = require('better-sqlite3');
const mobileDb = new Database('./mobile_users.db');
const { json } = require("body-parser");

const app = express();




// CORS
app.use(
  cors({
    origin: "http://localhost:3000", // React app
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST, // or "my-wpdb" if backend is in Docker
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT
});

db.connect((err) => {
  if (err) {
    console.log("Database connection error:", err);
  } else {
    console.log("Database connected successfully!");
  }
});

// LOGIN route
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "Email and Password are required!" });
  }

  db.query(
    "SELECT * FROM admin WHERE email = ? AND password = ?",
    [email, password],
    (err, results) => {
      if (err) {
        console.error("DB query error:", err);
        return res.status(500).send({ message: "Database query failed", error: err });
      }

      if (results.length > 0) {
        return res.status(200).send({ message: "Login successful!" });
      } else {
        return res.status(401).send({ message: "Invalid credentials" });
      }
    }
  );
});

// Dashboard route
app.get("/Dashboard", (req, res) => {
  db.query(
    "SELECT * FROM admin WHERE email = ? AND password = ?",
    [email, password],
    (err, results) => {
      if (err) {
        return res
          .status(500)
          .send({ message: "Database query failed", error: err });
      }
      if (results.length > 0) {
        res.redirect("/Dashboard");
      } else {
        res.status(401).send({ message: "Check Credentials" });
      }
    }
  );
});

// logout route
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session", err);
      return res.status(500).send({ message: "Error logging out" });
    }
    res.status(200).send({ message: "Logging out successfully" });
  });
});

// add new users
app.post("/api/admin", (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password, !role) {
    return res
      .status(400)
      .send({ message: "Name, Email, Password, and Role are required" });
  }

  const query = "INSERT INTO admin (name, email, password, role) VALUES (?, ?, ?, ?)";
  db.query(query, [name, email, password, role], (err, result) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Failed to add new admin", error: err });
    }

    // Return the inserted announcement as JSON
    const newAnnouncement = {
      id: result.insertId,
      name,
      email,
      password,
      role
    };

    res.status(200).json(newAnnouncement);
  });
});

// fetch users route
app.get("/api/users", (req, res) => {
  const query = "SELECT id, email, name, role FROM admin";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results); // Send JSON
  });
});


// delete user route
app.delete("/api/users", async (req, res) => {
  const { id } = req.body;
  try {
    db.query("DELETE FROM admin WHERE id = ?", [id], (err, results) => {
      if (!err) {
        return res.status(200).json({ message: "User deleted" });
      }
      return res.status(400).json({ message: "Something went wrong" });
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
});



// reports route
app.get("/api/reports", (req, res) => {
  db.query("SELECT * FROM reports", (err, results) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Failed to fetch reports", error: err });
    }
    res.json(results);
  });
});


// add report route
app.post("/api/reports", (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .send({ message: "Title and description are required!" });
  }

  const query = "INSERT INTO reports (title, description) VALUES (?, ?)";
  db.query(query, [title, description], (err, result) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Failed to submit report", error: err });
    }

    const newReport = {
      id: result.insertId,
      title,
      description,
    };

    res.status(200).json(newReport);
  });
});



// delete report route
app.delete("/api/reports", (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "ID is required" });

  const query = "DELETE FROM reports WHERE id = ?";
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to delete", error: err });

    res.status(200).json({ message: "Report deleted successfully" });
  });
});

// announcements route
app.get("/api/announcement", (req, res) => {
  const query = "SELECT * FROM announcement ORDER BY time_stamp DESC";
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send({ message: "Failed to fetch announcements", error: err });
    }
    res.status(200).json(results);
  });
});


// add announcement route
app.post("/api/announcement", (req, res) => {
  const { title, description, time_stamp } = req.body;

  if (!title || !description || !time_stamp) {
    return res
      .status(400)
      .send({ message: "Title, description, and timestamp are required" });
  }

  const query = "INSERT INTO announcement (title, description, time_stamp) VALUES (?, ?, ?)";
  db.query(query, [title, description, time_stamp], (err, result) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Failed to submit announcement", error: err });
    }

    // Return the inserted announcement as JSON
    const newAnnouncement = {
      id: result.insertId,
      title,
      description,
      time_stamp,
    };

    res.status(200).json(newAnnouncement);
  });
});

// delete announcement route
app.delete("/api/announcement", (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "ID is required" });

  const query = "DELETE FROM announcement WHERE id = ?";
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to delete", error: err });

    res.status(200).json({ message: "Announcement deleted successfully" });
  });
});


// collection route
app.get("/api/collection", (req, res) => {
  db.query("SELECT * FROM collection", (err, results) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Failed to fetch collection", error: err });
    }
    res.json(results);
  });
});

// add collection route
app.post("/api/collection", (req, res) => {
  const { location, street ,date } = req.body;

  if (!location || !street || !date) {
    return res
      .status(400)
      .send({ message: "Location, Street and Date are required" });
  }

  const query = "INSERT INTO collection (location, street, date) VALUES (?, ?, ?)";
  db.query(query, [location, street ,date], (err, result) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Failed to submit collection", error: err });
    }

    const newCollection = {
      id: result.insertId,
      location,
      street,
      date,
    };

    res.status(200).json(newCollection);
  });
});

// delete collection route
app.delete("/api/collection", (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "ID is required" });

  const query = "DELETE FROM collection WHERE id = ?";
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to delete", error: err });

    res.status(200).json({ message: "Collection deleted successfully" });
  });
});

// update collection
app.put("/api/collection/:id", (req, res) => {
  const { id } = req.params;
  const { location, street, date } = req.body;

  if (!location || !street || !date) {
    return res.status(400).json({ message: "All fields required" });
  }

  const query = "UPDATE collection SET location = ?, street = ?, date = ? WHERE id = ?";
  db.query(query, [location, street, date, id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Record not found" });

    res.json({ id: Number(id), location, street, date });
  });
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

// Add a user
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
// Start server
app.listen(PORT, () => {
  console.log("Server running on port 5001");
});
