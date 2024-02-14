const express = require('express');
const sql = require('mssql');
const path = require('path');
const http = require('http');
const ip = require('ip');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { LocalStorage } = require('node-localstorage');
const localStorage = new LocalStorage('./scratch');
const readline = require('readline');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const port = 8080;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');

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
//server: 'DESKTOP-6S6CLHO\\SQLEXPRESS2014', Justin
//server: 'DESKTOP-EIR2A8B\\SQLEXPRESS2014', Junnel
//server: 'DESKTOP-U6G6LH1\\SQLEXPRESS2014', Axl   

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
  const { username, password } = req.body;

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
          const storedPasswordHash = result.recordset[0].password;
          const userId = result.recordset[0].id;
          const user = result.recordset[0].username;

          // Compare the provided password with the stored hash
          const passwordMatch = await bcrypt.compare(password, storedPasswordHash);

          if (passwordMatch) {
              // Generate JWT token
              const token = jwt.sign({ userId, username: user }, "jwt-secret-key", { expiresIn: '1d' });

              // Set JWT token in a cookie
              res.cookie('token', token, { httpOnly: true });

              // Store userId and username in localStorage
              localStorage.setItem('userId', userId);
              localStorage.setItem('username', user);

              // After successful login
              return res.status(200).json({ status: 'success', id: userId, username: username });

          }
      }

      // Invalid username or password
      return res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
  } catch (err) {
      console.error('Error checking login:', err);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
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

app.get('/jobOrderDetails/:jobOrderId', async (req, res) => {
  try {
    const jobOrderId = req.params.jobOrderId;
    console.log('Requested Job Order ID:', jobOrderId); // Logging the requested job order ID

    // Construct the query to fetch details of the specific job order and related work activities
    const query = `
    SELECT 
        joborders.*, 
        work_activities_erp.description AS description,
        work_activities_erp.remarks AS remarks2
    FROM dbo.joborders
    INNER JOIN dbo.work_activities_erp ON joborders.id = work_activities_erp.jo_id
    WHERE 
        joborders.id = '${jobOrderId}'
    `;

    const request = new sql.Request();
    const result = await request.query(query);

    if (result.recordset.length > 0) {
      // Extract job order details
      const jobOrderDetails = result.recordset[0];
      // Extract work activities
      const workActivities = result.recordset.map(row => ({
        description: row.description,
        remarks: row.remarks2
      }));
      // Send job order details along with work activities as JSON response
      res.status(200).json({ jobOrderDetails, workActivities });
    } else {
      res.status(404).json({ status: 'error', message: 'Job order not found.' }); // If job order is not found
    }
  } catch (err) {
    console.error('Error fetching job order details:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
  }
});

app.get('/jobOrderDetails2/:jobOrderId', async (req, res) => {
  try {
    const jobOrderId = req.params.jobOrderId;
    console.log('Requested Job Order ID:', jobOrderId); // Logging the requested job order ID

    // Construct the query to fetch details of the specific job order and related work activities
    const query = `
    SELECT 
        joborders.*, 
        customer_erp.*,
        users.*,
        employee_listing.*,
        work_activities_erp.description AS description,
        work_activities_erp.remarks AS remarks2
    FROM dbo.joborders
    INNER JOIN dbo.work_activities_erp ON joborders.id = work_activities_erp.jo_id
    INNER JOIN dbo.customer_erp ON joborders.customer_id = customer_erp.id
    INNER JOIN dbo.users ON joborders.user_id = users.id
    INNER JOIN dbo.employee_listing ON joborders.employee_id = employee_listing.id
    WHERE 
        joborders.id = '${jobOrderId}'
    `;

    const request = new sql.Request();
    const result = await request.query(query);

    if (result.recordset.length > 0) {
      // Extract job order details
      const jobOrderDetails = result.recordset[0];
      // Extract work activities
      const workActivities = result.recordset.map(row => ({
        description: row.description,
        remarks: row.remarks2
      }));
      // Send job order details along with work activities as JSON response
      res.status(200).json({ jobOrderDetails, workActivities });
    } else {
      res.status(404).json({ status: 'error', message: 'Job order not found.' }); // If job order is not found
    }
  } catch (err) {
    console.error('Error fetching job order details:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
  }
});


app.get('/getJobIdFromOrderId/:jobOrderId', async (req, res) => {
  const jobOrderId = req.params.jobOrderId;

  try {
    const queryText = `SELECT id FROM joborders WHERE joborder_id = ${jobOrderId}`;
    console.log('Executing query:', queryText);

    const result = await pool.query(queryText);
    console.log('Query result:', result);

    if (!result || result.rowsAffected[0] === 0) {
      console.log('No job ID found');
      return res.status(404).json({ error: 'Job ID not found for the provided job order ID' });
    }

    console.log('Job ID found:', result.recordset[0].id);
    res.json({ jobId: result.recordset[0].id });
  } catch (error) {
    console.error('Error retrieving job ID:', error);
    res.status(500).json({ error: 'Internal server error' });
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


// Handle GET request to fetch data from the server
app.get('/getDataFromServer/:userId', (req, res) => {
  // Retrieve the user ID from the URL parameter
  const userId = req.params.userId;

  // Perform database query to retrieve password based on user ID
  // Replace this with your database query logic
  const query = `
    SELECT [password]
    FROM [jo].[dbo].[users]
    WHERE [id] = ${userId}
  `;
  
  // Execute the query and retrieve the password from the database
  // This is just a placeholder and should be replaced with your database query logic
  const password = 'dummyPassword'; // Replace with actual password retrieved from the database

  // Send the password as a JSON response
  res.json({ password });
});

// Handle form submission to add new tech
app.post('/addNewTechForm', async (req, res) => {
  try {
    // Connect to the database
    await sql.connect(config);
    const referer = req.header('referer');
    // Retrieve data
    const data = localStorage.getItem('userId');
    // Query the database to get id and full_name values
    const techresult = await sql.query(`
    SELECT [id], [password] 
    FROM [dbo].[users] 
    WHERE [id] = ${data}
    `);
const userData = techresult.recordset[0];
const DBpassword = userData.password;
    // Retrieve form data from request body
    const { username } = req.body;
    //console.log('Username from request body:', username);
    if (!username) {
      throw new Error('No username found in request body.');
    }
    const { password } = req.body;
    //console.log('password from request body:', password);
    if (!password) {
      throw new Error('No password found in request body.');
    }
    if(DBpassword==password){
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
      console.log('Technical added sssuccessfully:', username); // Log successful insertion
    // Respond with success message
    }else{
      console.log("doesn't match");
    }
    
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

    if (!username || !password || !role) {
      throw new Error('Username, password, or role is missing in request body.');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // Using 10 salt rounds

    // Connect to the SQL Server database
    await poolConnect;

    // Insert the new user into the users table
    const request = pool.request();
    request.input('username', sql.NVarChar, username);
    request.input('password', sql.NVarChar, hashedPassword); // Store the hashed password
    request.input('role', sql.NVarChar, role);
    request.input('createdAt', sql.Date, new Date());
    request.input('updatedAt', sql.Date, new Date());
    const result = await request.query(`
      INSERT INTO users (username, password, role, createdAt, updatedAt)
      VALUES (@username, @password, @role, @createdAt, @updatedAt)
    `);

    // Respond with success message
    res.status(200).send('User added successfully.');

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
