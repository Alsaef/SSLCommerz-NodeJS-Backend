# SSLCommerz NodeJS Backend (MERN Style, Dynamic Params)

This is a full backend setup for integrating **SSLCommerz payment gateway** with a MERN stack. It handles payment initialization, success, fail, cancel, and optional IPN (Instant Payment Notification). The backend is fully MongoDB compatible and uses dynamic params for secure transaction tracking.

---
```bash
npm install sslcommerz-lts
```
```bash
const express = require('express');
const cors = require('cors');
const SSLCommerzPayment = require('sslcommerz-lts');

const app = express();
const port = 3000;

const store_id = 'store=id';
const store_passwd = 'store-pass';
const is_live = false;

app.use(cors());
app.use(express.json());

// Payment endpoint
app.post('/my-payment', async (req, res) => {
  try {
   const data = {
        total_amount: 100,
        currency: 'BDT',
        tran_id: `REF${new Date().toString()}`, // use unique tran_id for each api call
        success_url: 'http://localhost:3000/success',
        fail_url: 'http://localhost:3000/fail',
        cancel_url: 'http://localhost:3000/cancel',
        ipn_url: 'http://localhost:3000/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: 'Customer Name',
        cus_email: 'customer@example.com',
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      const apiResponse = await sslcz.init(data);

      // Instead of sending JSON, just send the Gateway URL to the frontend
      res.json({ url: apiResponse.GatewayPageURL });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

```

## Features

* Payment initialization with SSLCommerz.
* Dynamic `tran_id` handling via URL params.
* Database integration using MongoDB.
* Handles `success`, `fail`, and `cancel` URLs.
* Optional IPN for final payment confirmation.
* Redirects user to frontend with transaction details.

---

## Environment Setup

Edit the store credentials and MongoDB URI in the code:

```javascript
const store_id = 'your-store-id';
const store_passwd = 'your-store-password';
const is_live = false; // true for production

const client = new MongoClient('mongodb://127.0.0.1:27017');
```

---

## Backend Code Example

```javascript
const express = require('express');
const cors = require('cors');
const SSLCommerzPayment = require('sslcommerz-lts');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;

const store_id = 'store-id';
const store_passwd = 'store-pass';
const is_live = false;

const client = new MongoClient('mongodb://127.0.0.1:27017');
let paymentsCollection;

async function connectDB() {
  await client.connect();
  const db = client.db('sslcommerzDB');
  paymentsCollection = db.collection('payments');
}
connectDB();

app.use(cors());
app.use(express.json());

app.post('/my-payment', async (req, res) => {
  const tran_id = `REF${Date.now()}`;
  const data = { /* payment data */ };
  await paymentsCollection.insertOne({ tran_id, status: 'PENDING', createdAt: new Date() });
  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
  const apiResponse = await sslcz.init(data);
  res.json({ url: apiResponse.GatewayPageURL });
});

// Success URL (Browser redirect / Frontend POST, optional SSL validation if val_id provided)
app.post('/payment/success/:tran_id', async (req, res) => {
  const { tran_id } = req.params;
  const { val_id } = req.body;
  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
  const validation = await sslcz.validate({ val_id });
  if (validation.status === 'VALID') {
    await paymentsCollection.updateOne({ tran_id }, { $set: { status: 'SUCCESS', paidAt: new Date(), gatewayData: validation } });
    return res.redirect(`http://localhost:5173/payment-success?tran_id=${tran_id}`);
  }
  await paymentsCollection.updateOne({ tran_id }, { $set: { status: 'FAILED', updatedAt: new Date() } });
  res.redirect('http://localhost:5173/payment-failed');
});


app.post('/payment/success/:tran_id', async (req, res) => {
  const { tran_id } = req.params;
    await paymentsCollection.updateOne(
      { tran_id },
      { $set: { status: 'SUCCESS', paidAt: new Date() } }
    );

    // Frontend redirect
    res.redirect(`http://localhost:5173/payment-success?tran_id=${tran_id}`);
});


app.post('/payment/fail/:tran_id', async (req, res) => {
  const { tran_id } = req.params;
  await paymentsCollection.updateOne({ tran_id }, { $set: { status: 'FAILED', updatedAt: new Date() } });
  res.redirect('http://localhost:5173/payment-failed');
});

app.post('/payment/cancel/:tran_id', async (req, res) => {
  const { tran_id } = req.params;
  await paymentsCollection.updateOne({ tran_id }, { $set: { status: 'CANCELED', updatedAt: new Date() } });
  res.redirect('http://localhost:5173/payment-canceled');
});

app.post('/payment/ipn', async (req, res) => {
  const { tran_id, status, val_id } = req.body;
  if (status !== 'VALID') return res.status(400).json({ message: 'Invalid payment status' });
  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
  const validation = await sslcz.validate({ val_id });
  if (validation.status === 'VALID') {
    await paymentsCollection.updateOne({ tran_id }, { $set: { status: 'SUCCESS', paidAt: new Date(), gatewayData: validation } });
    return res.status(200).json({ message: 'Payment confirmed' });
  }
  res.status(400).json({ message: 'Payment validation failed' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

---

## Frontend Integration

* Success page: `/payment-success?tran_id=<tran_id>`
* Fail page: `/payment-failed`
* Cancel page: `/payment-canceled`

Frontend can use `tran_id` to fetch payment status from MongoDB.

---

## License

MIT


