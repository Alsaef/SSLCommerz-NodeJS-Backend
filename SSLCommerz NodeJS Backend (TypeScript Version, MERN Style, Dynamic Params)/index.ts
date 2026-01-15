// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import SSLCommerzPayment from 'sslcommerz-lts';
import { MongoClient, Collection } from 'mongodb';

const app = express();
const port = 3000;

// Store Credentials
const store_id = 'store-id';
const store_passwd = 'store-pass';
const is_live = false;

// MongoDB Setup
const client = new MongoClient('mongodb://127.0.0.1:27017');
let paymentsCollection: Collection;

async function connectDB() {
  await client.connect();
  const db = client.db('sslcommerzDB');
  paymentsCollection = db.collection('payments');
  console.log('MongoDB connected');
}
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Payment Initialization
app.post('/my-payment', async (req: Request, res: Response) => {
  try {
    const tran_id = `REF${Date.now()}`;
    const data = {
      total_amount: req.body.total_amount || 100,
      currency: 'BDT',
      tran_id,
      success_url: `http://localhost:3000/payment/success/${tran_id}`,
      fail_url: `http://localhost:3000/payment/fail/${tran_id}`,
      cancel_url: `http://localhost:3000/payment/cancel/${tran_id}`,
      ipn_url: `http://localhost:3000/payment/ipn`,
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

    await paymentsCollection.insertOne({ tran_id, status: 'PENDING', createdAt: new Date() });

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(data);

    res.json({ url: apiResponse.GatewayPageURL });
  } catch (error) {
    console.error('Payment init error:', error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// Success URL (Browser redirect / Frontend POST, optional SSL validation if val_id provided)
app.post('/payment/success/:tran_id', async (req: Request, res: Response) => {
  const { tran_id } = req.params;
  const { val_id } = req.body;
  try {
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const validation = await sslcz.validate({ val_id });
    if (validation.status === 'VALID') {
      await paymentsCollection.updateOne({ tran_id }, { $set: { status: 'SUCCESS', paidAt: new Date(), gatewayData: validation } });
      return res.redirect(`http://localhost:5173/payment-success?tran_id=${tran_id}`);
    }

    await paymentsCollection.updateOne({ tran_id }, { $set: { status: 'FAILED', updatedAt: new Date() } });
    res.redirect('http://localhost:5173/payment-failed');
  } catch (error) {
    console.error('Success URL error:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/payment/success/:tran_id', async (req: Request, res: Response) => {
  const { tran_id } = req.params;

  try {
    await paymentsCollection.updateOne(
      { tran_id },
      { $set: { status: 'SUCCESS', paidAt: new Date() } }
    );

    // Frontend redirect
    res.redirect(`http://localhost:5173/payment-success?tran_id=${tran_id}`);
  } catch (error) {
    console.error('Success URL error:', error);
    res.status(500).send('Internal server error');
  }
});

// Fail URL
app.post('/payment/fail/:tran_id', async (req: Request, res: Response) => {
  const { tran_id } = req.params;
  await paymentsCollection.updateOne({ tran_id }, { $set: { status: 'FAILED', updatedAt: new Date() } });
  res.redirect('http://localhost:5173/payment-failed');
});

// Cancel URL
app.post('/payment/cancel/:tran_id', async (req: Request, res: Response) => {
  const { tran_id } = req.params;
  await paymentsCollection.updateOne({ tran_id }, { $set: { status: 'CANCELED', updatedAt: new Date() } });
  res.redirect('http://localhost:5173/payment-canceled');
});

// IPN
app.post('/payment/ipn', async (req: Request, res: Response) => {
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
