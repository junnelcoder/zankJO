const express = require('express');
const sql = require('mssql');
const path = require('path');
const http = require('http');
const ip = require('ip');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const port = 8080;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');

// SQL Server Database Connection
// const config = {
//   user: 'sa',
//   password: 'zankojt@2024',
//   server: 'DESKTOP-6S6CLHO\\SQLEXPRESS2014',//server: 'DESKTOP-6S6CLHO\\SQLEXPRESS2014',
//   database: 'jo',
//   options: {
//     enableArithAbort: true,
//     encrypt: false,
//   },
// };
const config = {
  user: 'sa',
  password: 'zankojt@2024',
  server: 'DESKTOP-6S6CLHO\\SQLEXPRESS2014',//server: 'DESKTOP-6S6CLHO\\SQLEXPRESS2014',
  database: 'jo',
  options: {
    enableArithAbort: true,
    encrypt: false,
  },
};
//server: 'DESKTOP-6S6CLHO\\SQLEXPRESS2014', Justin
//server: 'DESKTOP-EIR2A8B\\SQLEXPRESS2014', Junnel
//server: 'DESKTOP-U6G6LH1\\SQLEXPRESS2014', Axl    192.168.2.100

// Middleware to handle SQL Server connection
sql.connect(config)
  .then(() => {
    console.log('Connected to SQL Server');
    server.listen(port, () => {
      const ipAddress = ip.address(); 
      console.log(`Server is running at http://${ipAddress}:${port}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to SQL Server:');
  });

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

pool.connect().then(() => {
  // Your query execution logic goes here
}).catch(err => {
  console.error('Pool database connection error:');
});
poolConnect.then(() => {
  console.log('Pool connected to SQL Server');
}).catch((err) => {
  console.error('Pool error connecting to SQL Server:');
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
      const token = jwt.sign({ role: "admin" }, "jwt-secret-key", { expiresIn: '1d' });
      // Compare the inputted password with the stored password (plain text)
      if (password === storedPassword) {
      res.cookie('token', token);
        console.log('User ID:', userid);
        console.log(' ID:', token);
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
    const { technical, start_date, end_date } = req.query;
    console.log('Request Parameters - Technical:', technical, 'Start Date:', start_date, 'End Date:', end_date); // Logging request parameters

    let query = `
      SELECT 
      joborders.*, 
      customer_erp.customer_name,
      customer_erp.address as customer_address,
      employee_listing.full_name as technical,
      MONTH(joborders.date) as Month,
      DATEPART(WEEK, joborders.date) as WeekNo
      FROM dbo.joborders
      INNER JOIN dbo.customer_erp ON joborders.customer_id = customer_erp.id
      INNER JOIN dbo.employee_listing ON joborders.employee_id = employee_listing.id
    `;

    if (technical && technical !== 'ALL') {
      query += ` WHERE joborders.employee_id = '${technical}'`;
    }

    if (start_date && end_date) {
      if (query.includes('WHERE')) {
        query += ` AND joborders.date >= '${start_date}' AND joborders.date <= '${end_date}'`;
      } else {
        query += ` WHERE joborders.date >= '${start_date}' AND joborders.date <= '${end_date}'`;
      }
    }

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

// Handle form submission to add new technician
app.post('/addNewTechForm', async (req, res) => {
  try {
    // Retrieve form data from request body
    const { username } = req.body;
    console.log('Username from request body:', username);
    
    if (!username) {
      throw new Error('No username found in request body.');
    }

    console.log('Retrieved username from request body:', username);

    // Connect to the SQL Server database
    await poolConnect;
    console.log('Database connection established successfully.');

    // Insert the new username into the employee_listing table
    const request = pool.request();
    request.input('username', sql.NVarChar, username);
    const result = await request.query(`
      INSERT INTO employee_listing (full_name)
      VALUES (@username)
    `);
    console.log('Username added successfully:', username); // Log successful insertion

    // Respond with success message
    res.status(200).send('New technical added successfully.');
  } catch (error) {
    // If an error occurs, respond with an error message
    console.error('Error adding username:', error.message);
    res.status(500).send('An error occurred while adding the username.');
  }
});


app.post('/addNewUserForm', async (req, res) => {
  try {
    // Retrieve form data from request body
    const { username, password, role } = req.body;
    console.log('Username from request body:', username);
    console.log('Password from request body:', password);
    console.log('Role from request body:', role);

    if (!username || !password || !role) {
      throw new Error('Username, password, or role is missing in request body.');
    }

    console.log('Retrieved username from request body:', username);
    console.log('Retrieved password from request body:', password);
    console.log('Retrieved role from request body:', role);

    // Connect to the SQL Server database
    await poolConnect;
    console.log('Database connection established successfully.');

    // Get today's date
    const today = new Date().toISOString().slice(0, 10);

    // Insert the new user into the users table
    const request = pool.request();
    request.input('username', sql.NVarChar, username);
    request.input('password', sql.NVarChar, password);
    request.input('role', sql.NVarChar, role);
    request.input('createdAt', sql.Date, Date());
    request.input('updatedAt', sql.Date, Date());
    const result = await request.query(`
      INSERT INTO users (username, password, role, createdAt, updatedAt)
      VALUES (@username, @password, @role, @createdAt, @updatedAt)
    `);
    console.log('User added successfully:', username); // Log successful insertion

    // Respond with success message
    res.status(200).send('User added successfully.');
    

    const now = new Date(); // Create a new Date object representing the current date and time

// Get the date and time in ISO 8601 format
let isoString = now.toISOString();

// Extract milliseconds and UTC offset
let milliseconds = String(now.getMilliseconds()).padStart(7, '0');
let utcOffset = now.toTimeString().split(' ')[1];

// Combine all parts
let reult = isoString.slice(0, -1) + ' ' + milliseconds + ' ' + utcOffset;

console.log(reult);

  } catch (error) {
    // If an error occurs, respond with an error message
    console.error('Error adding user:', error.message);
    res.status(500).send('An error occurred while adding the user.');
  }
});

app.get('/logout', (req, res) => {
  // Redirect the user to a different URL, such as the login page
  res.redirect('/');
});