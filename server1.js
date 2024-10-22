const express = require("express");
const mysql = require("mysql");
const cors = require("cors");

const app = express();
app.use(
  cors({
    // origin: 'http://localhost:3000',
    // methods: ['GET', 'POST']
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "evocapp_admin",
  port: 8080,
});

db.connect((err) => {
  if (err) {
    console.log("Connection to database is error!", err);
  } else {
    console.log("Connection to database Success!");
  }
});

app.get("/data", (req, res) => {
  db.query("SELECT * FROM admin", (err, results) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Connecting to Database Failed", error: err });
    }
    res.json(results);
  });
});
// app.get("/api/users", (req, res) => {
//   const query = "SELECT * FROM admin";
//   db.query(query, (err, results) => {
//     if (err) {
//       res.status(500).send(err);
//     } else {
//       res.json(results);
//     }
//   });
// });

// app.post("", (req, res) => {
//   const { email, password } = req.body;
//   console.log("Login attempt:", email, password);

//   if (!email || !password) {
//     return res
//       .status(400)
//       .send({ message: "Email and Password are required!" });
//   }

//   db.query(
//     "SELECT * FROM admin WHERE email = ? AND password = ?",
//     [email, password],
//     (err, results) => {
//       if (err) {
//         console.error("Database query error", err);
//         return res
//           .status(500)
//           .send({ message: "Database query  failed", error: err });
//       }
//       if (results.length > 0) {
//         res.status(200).send({ message: "Login successful!" });
//       } else {
//         res.status(401).send({ message: "Check Credentials" });
//       }
//     }
//   );
// });

// app.get("/Dashboard", (req, res) => {
//   db.query(
//     "SELECT * FROM admin WHERE email = ? AND password = ?",
//     [email, password],
//     (err, results) => {
//       if (err) {
//         return res
//           .status(500)
//           .send({ message: "Database query failed", error: err });
//       }
//       if (results.length > 0) {
//         res.redirect("/Dashboard");
//       } else {
//         res.status(401).send({ message: "Check Credentials" });
//       }
//     }
//   );
// });

// app.post("/signup", (req, res) => {
//   const { name, email, password } = req.body;

//   if (!name || !email || !password) {
//     return res
//       .status(400)
//       .send({ message: "Name, Email, and Password are required!" });
//   }

//   db.query(
//     "INSERT INTO admin (name, email, password) VALUES (?, ?, ?)",
//     [name, email, password],
//     (err, results) => {
//       if (err) {
//         return res
//           .status(500)
//           .send({ message: "Database query failed", error: err });
//       }
//       return res.status(200).send({ message: "Signup successful!" });
//     }
//   );
// });

// app.post("/logout", (req, res) => {
//   req.session.destroy((err) => {
//     if (err) {
//       console.error("Error destroying session", err);
//       return res.status(500).send({ message: "Error logging out" });
//     }
//     res.status(200).send({ message: "Logging out successfully" });
//   });
// });

// app.delete("/api/users", async (req, res) => {
//   const { id } = req.body;
//   console.log(req.body);

//   try {
//     db.query("DELETE FROM admin WHERE id = ?", [id], (err, results) => {
//       if (!err) {
//         return res.status(200).json({ message: "User deleted" });
//       }
//       return res.status(400).json({ message: "Something went wrong" });
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error deleting user", error });
//   }
// });

// // Add these endpoints in your Node.js backend

// app.get("/api/reports", (req, res) => {
//   db.query("SELECT * FROM reports", (err, results) => {
//     if (err) {
//       return res
//         .status(500)
//         .send({ message: "Failed to fetch reports", error: err });
//     }
//     res.json(results);
//   });
// });

// app.post("/api/reports", (req, res) => {
//   const { title, description } = req.body;

//   if (!title || !description) {
//     return res
//       .status(400)
//       .send({ message: "Title and description are required" });
//   }

//   db.query(
//     "INSERT INTO reports (title, description) VALUES (?, ?)",
//     [title, description],
//     (err, result) => {
//       if (err) {
//         return res
//           .status(500)
//           .send({ message: "Failed to submit report", error: err });
//       }
//       res.status(200).send({ message: "Report submitted successfully!" });
//     }
//   );
// });

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
