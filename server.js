const express = require("express");
const mysql = require("mysql");
const app = express();
const port = 5000;
const bodyParser = require('body-parser');
const cors = require('cors');

// CORS configuration
const corsOptions = {
    // origin: 'http://localhost:3000', // Allow requests from this origin
    methods: ['GET', 'POST', 'OPTIONS'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type'], // Allowed headers
    credentials: true, // Allow credentials if needed
};


app.use(cors({
  // origin: 'http://localhost:5000', // Change to your Flutter app's URL
}));

app.use(cors(corsOptions)); // Enable CORS with options
app.use(bodyParser.json());

// Handle OPTIONS method for preflight
app.options('*', cors(corsOptions)); // Preflight response for all routes


// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
//     res.header('Access-Control-Allow-Methods', 'GET, POST'); // Allowed methods
//     res.header('Access-Control-Allow-Headers', 'Content-Type'); // Allowed headers
//     next();
// });

// app.use(
//     cors({
//       // origin: 'http://localhost:3000',
//       // methods: ['GET', 'POST']
//       origin: true,
//       credentials: true,
//     })
//   );
// app.use(cors({
//     origin: 'http://example.com', // Replace with your client's origin
//     methods: ['GET', 'POST'], // Allowed HTTP methods
//     allowedHeaders: ['Content-Type'], // Allowed headers
// }));

// MySQL connection
const connection = mysql.createConnection({
host: "localhost",
user: "root",
password: "",
database: "evocapp_admin",
multipleStatements: true
});

connection.connect((err) => {
if (err) throw err;
console.log("Connected to MySQL database!");
});

app.use(express.json());

// Define a route
app.get("/api/data", (req, res) => {
    connection.query("SELECT * FROM admin", (err, results) => {
    if (err) throw err;
        res.json(results);
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    // const user = users.find(u => u.username === username && u.password === password);
    connection.query(
        "SELECT * FROM admin WHERE email = ? AND password = ?",
        [email, password],
        (err, results) => {
          if (err) {
            console.error("Database query error", err);
            return res
              .status(500)
              .send({ message: "Database query  failed", error: err });
          }
          if (results.length > 0) {
            res.status(200).send({ message: "Login successful!" });
          } else {
            res.status(401).send({ message: "Check Credentials" });
          }
        }
      );
});

// 

app.get("/api/announcements", (req, res) => {
    connection.query("SELECT `id`, `title`, `description`, DATE_FORMAT(time_stamp,'%M %d,%Y %r') as `time_stamp`, `status` FROM `announcements` order by time_stamp desc", (err, results) => {
    if (err) throw err;
        res.json(results);
    });
});

app.post("/api/allannouncements", (req, res) => {
  connection.query("SELECT `id`, `title`, `description`, DATE_FORMAT(time_stamp,'%M %d,%Y %r') as `time_stamp`, `status` FROM `announcements` order by time_stamp desc", (err, results) => {
  if (err) throw err;
      res.json(results);
  });
});

app.post('/api/newannouncements', (req, res) => {
  const { title, description } = req.body;
  const insertQuery = "INSERT INTO `announcements`(`title`, `description`,`status`) VALUES (?,?,'Active')";

  connection.query(insertQuery, [title, description ], (insertError, insertResults) => {
      if (insertError) {
          console.error("Database query error", insertError);
          return insertResults
            .status(500)
            .send({ message: "Database query  failed", error: insertError });
      }

    // Fetch the inserted row
    const fetchQuery = "SELECT `id`, `title`, `description`, DATE_FORMAT(time_stamp,'%M %d,%Y %r') as `time_stamp`, `status` FROM `announcements` WHERE id = ?";
    connection.query(fetchQuery, [insertResults.insertId], (fetchError, fetchResults) => {
      if (fetchError) {
        return res.status(500).json({ message: fetchError.message });
      }
      res.status(200).json(fetchResults[0]); // Return the inserted record
    });
  });
});

app.post('/api/updateannouncements', (req, res) => {
  const { title, description, status, oldTitle, oldDesc } = req.body;
  console.log(req.body)
  const updateQuery = "Update `announcements` SET `title` = ? ,`description` = ? ,`status` = ? where title = ? and description = ?";
  
  connection.query(updateQuery, [title, description, status, oldTitle, oldDesc], (updateError, updateResults) => {
    console.log(updateResults)
      if (updateError) {
          console.error("Database query error", updateError);
          return insertResults
            .status(500)
            .send({ message: "Database query  failed", error: updateError});
      }

    // Fetch the update row
    const fetchQuery = "SELECT `id`, `title`, `description`, DATE_FORMAT(time_stamp,'%M %d,%Y %r') as `time_stamp`, `status` FROM `announcements` WHERE title = ? and description = ? and status = 'Active'";
    connection.query(fetchQuery, [title, description], (fetchError, fetchResults) => {
      if (fetchError) {
        return res.status(500).json({ message: fetchError.message });
      }
      res.status(200).json(fetchResults[0]); // Return the update record
    });
  });
});



app.get("/api/reports", (req, res) => {
  connection.query("SELECT * FROM reports", (err, results) => {
  if (err) throw err;
      res.json(results);
  });
});

app.post("/api/allreports", (req, res) => {
  connection.query("SELECT `id`, `title`, `description` as note, DATE_FORMAT(time_stamp,'%b %d,%Y') as eventDate, `status` FROM `reports` where status='Active'", (err, results) => {
  if (err) throw err;
      res.json(results);
  });
});

app.post('/api/newreports', (req, res) => {
  const { title, description } = req.body;
  const insertQuery = "INSERT INTO `reports`(`title`, `description`,`status`) VALUES (?,?,'Active')";

  connection.query(insertQuery, [title, description ], (insertError, insertResults) => {
      if (insertError) {
          console.error("Database query error", insertError);
          return insertResults
            .status(500)
            .send({ message: "Database query  failed", error: insertError });
      }

    // Fetch the inserted row
    const fetchQuery = "SELECT `id`, `title`, `description`, DATE_FORMAT(time_stamp,'%M %d,%Y %r') as `time_stamp`, `status` FROM `reports` WHERE id = ?";
    connection.query(fetchQuery, [insertResults.insertId], (fetchError, fetchResults) => {
      if (fetchError) {
        return res.status(500).json({ message: fetchError.message });
      }
      res.status(200).json(fetchResults[0]); // Return the inserted record
    });
  });
});

app.post('/api/updatereports', (req, res) => {
  const { title, description, status, oldTitle, oldDesc } = req.body;
  console.log(req.body)
  const updateQuery = "Update `reports` SET `title` = ? ,`description` = ? ,`status` = ? where title = ? and description = ?";
  
  connection.query(updateQuery, [title, description, status, oldTitle, oldDesc], (updateError, updateResults) => {
    console.log(updateResults)
      if (updateError) {
          console.error("Database query error", updateError);
          return insertResults
            .status(500)
            .send({ message: "Database query  failed", error: updateError});
      }

    // Fetch the update row
    const fetchQuery = "SELECT `id`, `title`, `description`, DATE_FORMAT(time_stamp,'%M %d,%Y %r') as `time_stamp`, `status` FROM `reports` WHERE title = ? and description = ? and status = 'Active'";
    connection.query(fetchQuery, [title, description], (fetchError, fetchResults) => {
      if (fetchError) {
        return res.status(500).json({ message: fetchError.message });
      }
      res.status(200).json(fetchResults[0]); // Return the update record
    });
  });
});




app.get("/api/collectionschedule", (req, res) => {
  connection.query("SELECT * FROM collection_sched", (err, results) => {
  if (err) throw err;
      res.json(results);
  });
});

app.post("/api/allcollectionschedule", (req, res) => {
  connection.query("SELECT * FROM collection_sched where status = 'Active'", (err, results) => {
  if (err) throw err;
      res.json(results);
  });
});


app.post('/api/newcollectionschedule', (req, res) => {
  const { location, collection_date } = req.body;
  const insertQuery = "INSERT INTO `collection_sched`(`location`, `collection_date`,`status`) VALUES (?,?,'Active')";

  connection.query(insertQuery, [ location, collection_date ], (insertError, insertResults) => {
      if (insertError) {
          console.error("Database query error", insertError);
          return insertResults
            .status(500)
            .send({ message: "Database query  failed", error: insertError });
      }

    // Fetch the inserted row
    const fetchQuery = "SELECT * FROM collection_sched WHERE id = ?";
    connection.query(fetchQuery, [insertResults.insertId], (fetchError, fetchResults) => {
      if (fetchError) {
        return res.status(500).json({ message: fetchError.message });
      }
      res.status(200).json(fetchResults[0]); // Return the inserted record
    });
  });
});

  app.post('/api/updateStatus', (req, res) => {
    const { email, isLoggedIn } = req.body;
    console.log(req.body)
    const insertQuery = "UPDATE `users` SET `isLoggedIn`=? where email = ?";

    connection.query(insertQuery, [ isLoggedIn,email ], (insertError, insertResults) => {
        if (insertError) {
            console.error("Database query error", insertError);
            return insertResults
              .status(500)
              .send({ message: "Database query  failed", error: insertError });
        }
          
      // Fetch the inserted row
      const fetchQuery = "SELECT `id`, `email`, `password`, `isLoggedIn`, `role`, `time_stamp`, `status` FROM `users` WHERE email = ?";
      connection.query(fetchQuery, [email], (fetchError, fetchResults) => {
        if (fetchError) {
          return res.status(500).json({ message: fetchError.message });
        }
        res.status(200).json(fetchResults[0]); // Return the inserted record
      });
    });
  });


app.get("/api/users", (req, res) => {
    connection.query("SELECT `id`, `email`, `password`, `isLoggedIn`, `role`,DATE_FORMAT(time_stamp,'%M %d,%Y %r') as `time_stamp`, `status` FROM `users` ", (err, results) => {
    if (err) throw err;
        res.json(results);
    });
});

app.post("/api/userInfo", (req, res) => {
  const { email, password } = req.body;
  const fetchQuery = "SELECT `id`, `email`, `password`, `isLoggedIn`, `role`,DATE_FORMAT(time_stamp,'%M %d,%Y %r') as `time_stamp`, `status` FROM `users` WHERE email = '" + email +"'";
    //  console.log(fetchQuery)
  connection.query(fetchQuery,[email], (fetchError, fetchResults) => {
        if (fetchError) {
          return res.status(500).json({ message: fetchError.message });
        }
        res.status(200).json(fetchResults); 
      });
});

app.post('/api/userlogin', (req, res) => {
  const { email, password } = req.body;
  // const user = users.find(u => u.username === username && u.password === password);
  connection.query(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password],
      (err, results) => {
        if (err) {
          console.error("Database query error", err);
          return res
            .status(500)
            .send({ message: "Database query  failed", error: err });
        }
        if (results.length > 0) {
          res.status(200).send({ message: "Login successful!" });
        } else {
          res.status(401).send({ message: "Check Credentials" });
        }
      }
    );
});

// insertUser
app.post("/api/insertUser", (req, res) => {
    const { email, password } = req.body;

    const insertQuery = "INSERT INTO `users`(`email`, `password`, `role`, `status`) VALUES (?,?,'user','Active')";
    connection.query(insertQuery, [email, password], (insertError, insertResults) => {
        if (insertError) {
            console.error("Database query error", insertError);
            return insertResults
              .status(500)
              .send({ message: "Database query  failed", error: insertError });
        }
  
      // Fetch the inserted row
      const fetchQuery = "SELECT `id`, `email`, `role`,DATE_FORMAT(time_stamp,'%b %d,%Y %r') as `time_stamp`, `status` FROM `users` WHERE id = ? and status='Active'";
      connection.query(fetchQuery, [insertResults.insertId], (fetchError, fetchResults) => {
        if (fetchError) {
          return res.status(500).json({ message: fetchError.message });
        }
        res.status(200).json(fetchResults[0]); // Return the inserted record
      });
    });
});

app.post("/api/updateUser", (req, res) => {
  const { email, password, status } = req.body;

  const updateQuery = "UPDATE `users` SET `password`=?, `status`=? WHERE email = ?";
  connection.query(updateQuery, [ password, status, email], (updateError, updateResults) => {
      if (updateError) {
          console.error("Database query error", updateError);
          return updateResults
            .status(500)
            .send({ message: "Database query  failed", error: updateError });
      }

    // Fetch the inserted row
    const fetchQuery = "SELECT `id`, `email`, `role`,DATE_FORMAT(time_stamp,'%b %d,%Y %r') as `time_stamp`, `status` FROM `users` WHERE email = ? ";
    connection.query(fetchQuery, [email], (fetchError, fetchResults) => {
      if (fetchError) {
        return res.status(500).json({ message: fetchError.message });
      }
      res.status(200).json(fetchResults[0]); // Return the inserted record
    });
  });
});


app.post("/api/uniqueDateReports", (req, res) => {
  connection.query("SELECT DISTINCT(DATE_FORMAT(time_stamp,'%b %d,%Y')) as eventDate FROM announcements where status='Active';", (err, results) => {
  if (err) throw err;
      res.json(results);
  });
});


app.listen(port, () => {
console.log(`Server running at http://localhost:${port}`);
});