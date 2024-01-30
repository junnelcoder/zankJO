const express = require('express');
const sql = require('mssql');
const path = require('path');
const app = express();
const cors = require('cors');
const port = 8080;

app.use(cors());

// SQL Server Database Connection
const config = {
  user: 'sa',
  password: 'zankojt@2024',
  server: 'DESKTOP-EIR2A8B\\SQLEXPRESS2014',
  database: 'JobOrder',
  options: {
    enableArithAbort: true,
    encrypt: false,
  },
};

// Middleware to handle SQL Server connection
app.use(async (req, res, next) => {
  try {
    await sql.connect(config);
    console.log('Connected to SQL Server');
    next(); // Continue with the request processing
  } catch (err) {
    console.error('Error connecting to SQL Server:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
  }
});

// Express Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/login.html'));
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Username and password are required.' });
  }

  try {
    // Retrieve the user from the database
    const query = 'SELECT * FROM AdminLogin WHERE username = @username';
    const request = new sql.Request();
    request.input('username', sql.NVarChar, username);

    const result = await request.query(query);

    if (result.recordset.length > 0) {
      const storedPassword = result.recordset[0].password;

      // Compare the inputted password with the stored password (plain text)
      if (password === storedPassword) {
        // Successful login
        return res.redirect('/pages/content/index.html');
      }
    }

    // Invalid username or password
    res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
  } catch (err) {
    console.error('Error checking login:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
  }
});
app.get('/jobOrderList', async (req, res) => {
  try {
    const query = 'SELECT * FROM dbo.JobOrderListing'; // Corrected table name
    const request = new sql.Request();
    const result = await request.query(query);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching job orders:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://192.168.30.106:${port}`);
});
