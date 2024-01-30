const express = require('express');
const sql = require('mssql');

const app = express();
const port = 8080;

// SQL Server Database Connection
const config = {
  user: 'sa',
  password: 'zankojt@2024', // Replace with your SQL Server password
  server: '192.168.30.106\\SQLEXPRESS2014', // Replace with the actual IP address and instance name
  database: 'mydatabase',
  options: {
    enableArithAbort: true,
    encrypt: false, // Set encrypt option to false
  },
};

sql.connect(config, (err) => {
  if (err) {
    console.error('Error connecting to SQL Server:', err);
  } else {
    console.log('Connected to SQL Server');
  }
});

// Express Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/store', (req, res) => {
  const userInput = parseInt(req.body.userInput);

  if (!isNaN(userInput)) {
    const query = 'INSERT INTO input_data (user_input) VALUES (@userInput)';
    const request = new sql.Request();
    request.input('userInput', sql.Int, userInput);

    request.query(query, (err, result) => {
      if (err) {
        console.error('Error storing data:', err);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(200).send('Data stored successfully!');
      }
    });
  } else {
    res.status(400).send('Invalid input. Please enter a valid number.');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://192.168.30.106:${port}`);
});
