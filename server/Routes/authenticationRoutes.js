const express = require('express');
const router = express.Router();
const sql = require('mssql');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { LocalStorage } = require('node-localstorage');
const localStorage = new LocalStorage('./scratch');
const config = require('../server.js');
const secretKey = "ZankPointOfSalesEnterpriseJO2024";
const algorithm = 'aes-256-cbc';

function encrypt(text) {
  const iv = "ZankPOSNterprise";
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = "ZankPOSNterprise";
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Error decrypting text:', error);
    throw new Error('Failed to decrypt text');
  }
}


// Login route
router.post('/login', async (req, res) => {
  try {
    // Extract username and password from request body
    const { username, password } = req.body;

    // Check if username and password are provided
    if (!username || !password) {
      return res.status(400).json({ status: 'error', message: 'Username and password are required.' });
    }
    // Connect to the SQL Server database
    await sql.connect(config);

    // Query the database to retrieve the user based on username
    const request = new sql.Request();
    request.input('username', sql.NVarChar, username);
    const result = await request.query('SELECT * FROM users WHERE username = @username');

    // Check if user exists
    if (result.recordset.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
    }

    // Verify the password
    const user = result.recordset[0];
    // const passwordMatch = await bcrypt.compare(password, user.password);
    // const passwordMatch = (password === user.password);  
    const decrypted = decrypt(user.password);
    const passwordMatch = (decrypted === password);

    if (!passwordMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
    }
    if (user.status === 'online') {
      return res.status(400).json({ status: 'error2', message: 'User is already logged in. Please try logging in with another user.' });
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, "jwt-secret-key", { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true });
    localStorage.setItem('userId', user.id);
    localStorage.setItem('username', user.username);
    res.status(200).json({ status: 'success', id: user.id, username: user.username });
  } catch (err) {
    console.error('Error checking login:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
  }
});

// Get users data route
router.get('/get/users', async (req, res) => {
  try {
    // Connect to the database
    await sql.connect(config);

    // Query the database to get id and full_name values
    const result = await sql.query('SELECT [username] FROM [dbo].[users]');

    // Send the result as a JSON response
    res.json(result.recordset);
  } catch (err) {
    console.error('Error retrieving users data from the database:', err.message);
    res.status(500).send('Internal Server Error');
  } 
});

router.get('/getDataFromServer/:userId', async (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT [password]
    FROM [jo].[dbo].[users]
    WHERE [id] = ${userId}
  `;

  try {
      // Connect to the database
      await sql.connect(config);

      // Query the database to get the password
      const result = await sql.query(query);

      // Check if a record was found
      if (result.recordset.length > 0) {
          const password = decrypt(result.recordset[0].password);
          res.json({ password });
      } else {
          res.status(404).json({ message: 'Password not found.' });
      }
  } catch (err) {
      console.error('Error retrieving password from the database:', err.message);
      res.status(500).send('Internal Server Error');
  }
});


router.post('/addNewTechForm', async (req, res) => {
  try {
      await sql.connect(config);
      const { username } = req.body;
      if (!username) {
          throw new Error('No username found in request body.');
      }
      console.log('Database connection established successfully.');
      const request = new sql.Request();
      request.input('username', sql.NVarChar, username);
      const result = await request.query(`
          INSERT INTO employee_listing (full_name)
          VALUES (@username)
      `);
      console.log('Technical added successfully:', username);
      res.status(200).send('User added successfully.');
  } catch (error) {
      console.error('Error adding username:', error.message);
      res.status(500).send('An error occurred while adding the username.');
  }
});

  
  router.post('/addNewUserForm', async (req, res) => {
    try {
      // Retrieve form data from request body
      const { username, password, role } = req.body;
  
      if (!username || !password || !role) {
        throw new Error('Username, password, or role is missing in request body.');
      }
  
      // Hash the password
      // const hashedPassword = await bcrypt.hash(password, 10); // Using 10 salt rounds
        // Encrypt the password
        
      const encryptedPassword = encrypt(password);
  
      // Insert the new user into the users table
      const request = new sql.Request();
      request.input('username', sql.NVarChar, username);
      request.input('password', sql.NVarChar, encryptedPassword);
      // request.input('password', sql.NVarChar, password);
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
  
  router.get('/logout', (req, res) => {
    // Redirect the user to a different URL, such as the login page
    res.redirect('/');
  });
  

module.exports = router;
