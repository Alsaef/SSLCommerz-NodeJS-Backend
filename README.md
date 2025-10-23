# SSLCommerz-NodeJS-Backend
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
      tran_id: `REF${Date.now()}`, // unique tran_id
      success_url: 'http://localhost:5173/success',
      fail_url: 'http://localhost:5173/fail',
      cancel_url: 'http://localhost:5173/cancel',
      ipn_url: 'http://localhost:3000/ipn',
      shipping_method: 'Courier',
      product_name: 'Computer',
      product_category: 'Electronic',
      product_profile: 'general',
      cus_name: 'Customer Name',
      cus_email: 'customer@example.com',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01711111111',
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(data);

    // Send Gateway URL to frontend
    res.json({ GatewayPageURL: apiResponse.GatewayPageURL });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

```
