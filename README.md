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
