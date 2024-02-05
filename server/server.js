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
  server: 'DESKTOP-EIR2A8B\\SQLEXPRESS2014',
  database: 'jo',
  options: {
    enableArithAbort: true,
    encrypt: false,
  },
};
//server: 'DESKTOP-6S6CLHO\\SQLEXPRESS2014',
//server: 'DESKTOP-EIR2A8B\\SQLEXPRESS2014',

// Middleware to handle SQL Server connection
sql.connect(config)
  .then(() => {
    console.log('Connected to SQL Server');
  })
    .catch((err) => {
      console.error('Error connecting to SQL Server:', err);
    });


const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

pool.connect().then(() => {
  // Your query execution logic goes here
}).catch(err => {
  console.error('Database connection error:', err);
});
poolConnect.then(() => {
  console.log('Connected to SQL Server');
}).catch((err) => {
  console.error('Error connecting to SQL Server:', err);
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
    const query = "SELECT * FROM users WHERE username = @username";
    const request = new sql.Request();
    request.input('username', sql.NVarChar, username);

    const result = await request.query(query);

    if (result.recordset.length > 0) {
      const storedPassword = result.recordset[0].password;
      const userid = result.recordset[0].id;
      // Compare the inputted password with the stored password (plain text)
      if (password === storedPassword) {
        // Successful login
        // Send a success response
        console.log('User ID:', userid);
        return res.status(200).json({ status: 'success', id: userid });
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
    const query = `
    SELECT 
    joborders.*, 
    customer_erp.customer_name,
    customer_erp.address as customer_address,
    employee_listing.full_name as technical,
    MONTH(joborders.date) as Month,
    DATEPART(WEEK, joborders.date) as WeekNo
    FROM dbo.joborders
    INNER JOIN dbo.customer_erp ON joborders.customer_id = customer_erp.id
    INNER JOIN dbo.employee_listing ON joborders.employee_id = employee_listing.id`;

    const request = new sql.Request();
    const result = await request.query(query);
    
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching job orders:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
  }
});

app.get('/get/technical', async (req, res) => {
  try {
    // Connect to the database
    await sql.connect(config);

    // Query the database to get id and full_name values
    const result = await sql.query('SELECT [id], [full_name] FROM [dbo].[employee_listing]');

    // Send the result as a JSON response
    res.json(result.recordset);
  } catch (err) {
    console.error('Error retrieving data from the database:', err.message);
    res.status(500).send('Internal Server Error');
  } 
});

app.get('/get/users', async (req, res) => {
  try {
    // Connect to the database
    await sql.connect(config);

    // Query the database to get id and full_name values
    const result = await sql.query('SELECT [username] FROM [dbo].[users]');

    // Send the result as a JSON response
    res.json(result.recordset);
  } catch (err) {
    console.error('Error retrieving data from the database:', err.message);
    res.status(500).send('Internal Server Error');
  } 
});

app.post('/submit-form', async (req, res) => {
  try {
    // Wait for the pool to connect
    await poolConnect;

    // Extract data from the request body
    const {
      date,
      contactPerson,
      technical,
      cname,
      add,
      telephone,
      cemail,
      customerType,
      terms,
      status,
      transpo,
      permitIssued,
      remarks,
      deliveryRemarks,
      workActivities=[0],
      userId,
    } = req.body;
    console.log('Received workActivities:', workActivities);
    console.log('Received request with body:', req.body);
    
    // Start a new transaction
    const transaction = new sql.Transaction(pool);

    // Begin the transaction
    await transaction.begin();

    try {
      // Insert data into the customer_erp table
      const customerResult = await transaction.request()
        .input('customerName', sql.NVarChar(255), cname)
        .input('address', sql.NVarChar(255), add)
        .input('telephone', sql.NVarChar(255), telephone)
        .input('email', sql.NVarChar(255), cemail)
        .input('type', sql.NVarChar(255), customerType)
        .input('terms', sql.NVarChar(255), terms)
        .execute('InsertCustomer');

      // Get the customer ID from the result
      const customerId = customerResult.recordset[0].customerId;

      // Insert data into the joborders table
      const jobOrderResult = await transaction.request()
        .input('date', sql.DateTimeOffset, date)
        .input('contactPerson', sql.NVarChar(255), contactPerson)
        .input('transpo', sql.Decimal(10, 2), transpo)
        .input('remarks', sql.NVarChar(255), remarks)
        .input('deliveryRemarks', sql.NVarChar(255), deliveryRemarks)
        .input('status', sql.NVarChar(255), status)
        .input('permitIssued', sql.Bit, permitIssued)
        .input('customerId', sql.Int, customerId)
        .input('technical', sql.NVarChar(255), technical)
        .input('userId', sql.Int, userId)  // Replace 1 with the actual user ID
        .execute('InsertJobOrder');
        
      // Get the job order ID from the result
      const jobOrderId = jobOrderResult.recordset[0].jobOrderId;
      console.log('workActivities:', workActivities);
     // Check if workActivities is not an array
     for (const workActivity of workActivities) {
      if (!workActivity || typeof workActivity !== 'object') {
        console.error('Invalid workActivity format:', workActivity);
        continue; // Skip this iteration
      }
    
      const { description, remarks2 } = workActivity;
    
      if (!description || !remarks2) {
        console.error('Invalid workActivity properties:', workActivity);
        continue; // Skip this iteration
      }
    
      await transaction.request()
        .input('description', sql.NVarChar(255), description)
        .input('remarks2', sql.NVarChar(255), remarks2)
        .input('jobOrderId', sql.Int, jobOrderId)
        .execute('InsertWorkActivity');
    }

      // Commit the transaction
      await transaction.commit();
      
      // Respond with success
      res.status(200).send({ success: true, message: 'Form submitted successfully' });
      console.log('Received:', jobOrderResult);
    } catch (err) {
      // If an error occurs, rollback the transaction
      await transaction.rollback();

      // Respond with an error
      res.status(500).send({ success: false, message: 'Error submitting form', error: err.message });
    }
  } catch (err) {
    // If a connection error occurs, respond with an error
    res.status(500).send({ success: false, message: 'Error connecting to the database', error: err.message });
  }
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running at http://192.168.2.102:${port}`);
});
