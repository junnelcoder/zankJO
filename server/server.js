const express = require('express');
const http = require('http');
const ip = require('ip');
const path = require('path');
const bodyParser = require('body-parser');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { LocalStorage } = require('node-localstorage');
const bcrypt = require('bcrypt');

// Import routes
const auth = require('./Routes/authenticationRoutes');
const crud = require('./Routes/orderCrudRoutes');
const list = require('./Routes/orderListingRoutes');

const app = express();
const server = http.createServer(app);
const port = 8080;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/login.html'));
});
// SQL Server configuration
const config = {
  user: 'sa',
  password: 'zankojt@2024',
  server: 'DESKTOP-Q3V7PHJ\\SQLEXPRESS2014',
  database: 'jo',
  options: {
    enableArithAbort: true,
    encrypt: false,
  },
};

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
    console.error('Error connecting to SQL Server:', err);
  });



// Mount routes
app.use( auth);
app.use( crud);
app.use( list);



module.exports = {
  app,
  server,
  config,
};
