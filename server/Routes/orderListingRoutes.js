const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { LocalStorage } = require('node-localstorage');
const config = require('../server.js');


router.get('/jobOrderList', async (req, res) => {
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
  
  router.get('/jobOrderDetails/:jobOrderId', async (req, res) => {
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
  
  router.get('/jobOrderDetails2/:jobOrderId', async (req, res) => {
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
  
  
  router.get('/getJobIdFromOrderId/:jobOrderId', async (req, res) => {
    const jobOrderId = req.params.jobOrderId;
  
    try {
      const queryText = `SELECT id FROM joborders WHERE joborder_id = ${jobOrderId}`;
      console.log('Executing query:', queryText);
  
      const result = await sql.query(queryText);
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
  
  
  
  router.get('/get/technical', async (req, res) => {
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
  


  
module.exports = router;