const express = require('express');
const sql = require('mssql');
const path = require('path');
const app = express();
const cors = require('cors');
const port = 8080;
const http = require('http');
const ip = require('ip');

app.use(cors({
  origin: '*',
  credentials: false,
}));

app.use(express.json());

const server = http.createServer(app);

// SQL Server Database Connection
const config = {
  user: 'sa',
  password: 'zankojt@2024',
  server: 'DESKTOP-EIR2A8B\SQLEXPRESS2014',
  database: 'jo',
  options: {
    enableArithAbort: true,
    encrypt: false,
  },
};
const config2 = {
  user: 'sa',
  password: 'zankojt@2024',
  server: 'DESKTOP-6S6CLHO\\SQLEXPRESS2014',//server: 'DESKTOP-6S6CLHO\\SQLEXPRESS2014',
  database: 'jo',
  options: {
    enableArithAbort: true,
    encrypt: false,
  },
};

// Middleware to handle SQL Server connection
sql.connect(config)
  .then(() => {
    console.log('Connected to SQL Server 1');
  })
  .catch((err) => {
    console.error('Error connecting to SQL Server:\nTrying to connect with config/server 2');
    sql.connect(config2)
    .then(() => {
      console.log('Connected to SQL Server');
    })
    .catch((err) => {
      console.error('Error connecting to SQL Server:', err);
    });
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
    const query = 'SELECT * FROM users WHERE username = @username';
    const request = new sql.Request();
    request.input('username', sql.NVarChar, username);

    const result = await request.query(query);

    if (result.recordset.length > 0) {
      const storedPassword = result.recordset[0].password;

      // Compare the inputted password with the stored password (plain text)
      if (password === storedPassword) {
        // Successful login
        // Send a success response
        return res.status(200).json({ status: 'success' });
      }
    }
//Justin

// Handle the POST request at /api/submitOrder
app.post('/api/submitOrder', async (req, res) => {
  try {
    // Retrieve the JobOrderID from the request body
    const jobOrderID = req.body.JobOrderID;

    // Retrieve data based on JobOrderID
    const query = 'SELECT * FROM dbo.joborders WHERE joborder_id = @jobOrderID';
    const request = new sql.Request();
    request.input('jobOrderID', sql.NVarChar, jobOrderID);

    const result = await request.query(query);

    // Send the retrieved data as a response
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error retrieving data based on JobOrderID:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
  }
});


    // Invalid username or password
    res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
  } catch (err) {
    console.error('Error checking login:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
  }
});
app.get('/jobOrderList', async (req, res) => {
  try {
    const query = `
      SELECT 
        joborders.*, 
        customer_erp.customer_name,
        customer_erp.address as customer_address
      FROM dbo.joborders
      INNER JOIN dbo.customer_erp ON joborders.customer_id = customer_erp.id`;
    
    const request = new sql.Request();
    const result = await request.query(query);
    
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching job orders:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
  }
});





// Start the server
server.listen(port, () => {
  const ipAddress = ip.address(); 
  console.log(`Server is running at http://${ipAddress}:${port}`);
});
