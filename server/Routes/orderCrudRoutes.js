const express = require('express');
const router = express.Router();
const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { LocalStorage } = require('node-localstorage');
const localStorage = new LocalStorage('./scratch');
const config = require('../server.js');
// Route for handling CRUD operations on orders


router.post('/submit-form', async (req, res) => {
    try {
      
  
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
      const transaction = new sql.Transaction();
  
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


  router.post('/del', async (req, res) => {
    try {
      const joID = req.body.joID;
  
      // Retrieve the id from the joborders table based on the joID
      const pool = await sql.connect(/* your database connection configuration */);
      const result = await pool.request()
        .input('joID', sql.Int, joID)
        .query('SELECT id FROM joborders WHERE id = @joID');
  
      if (result.recordset.length > 0) {
        const id = result.recordset[0].id;
  
        // Begin a new transaction
        const transaction = new sql.Transaction();
        await transaction.begin();
  
        try {
          
          // Truncate rows from work_activities_erp table where jo_id matches the provided id
          const truncateQuery = `
          DELETE FROM work_activities_erp WHERE jo_id = @id
          `;
          const request = new sql.Request(transaction);
          request.input('id', sql.Int, id);
          await request.query(truncateQuery);
          
          // Optionally, truncate row from joborders table based on the id
          const truncateJobOrderQuery = `
            DELETE FROM joborders WHERE id = @id
          `;
          const jobOrderRequest = new sql.Request(transaction);
          jobOrderRequest.input('id', sql.Int, id);
          await jobOrderRequest.query(truncateJobOrderQuery);
  
          // Commit the transaction
          await transaction.commit();
  
          res.status(200).json({ success: true, message: 'Data related to joID truncated successfully.' });
        } catch (error) {
          // If an error occurs, rollback the transaction
          await transaction.rollback();
          throw error;
        }
      } else {
        res.status(404).json({ success: false, message: 'No record found for the provided joID.' });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error processing the request.', error: error.message });
    }
  });
  

module.exports = router;
