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

// ===============================
// Success URL (Frontend redirect only)
// ===============================

``` bash
app.post('/payment/success', async (req, res) => {
const { tran_id } = req.body;
res.redirect(`http://localhost:5173/payment-success?tran_id=${tran_id}`);
});
```
 // ✅ Only now mark SUCCESS
```bash
app.post('/payment/success', async (req, res) => {
  const { tran_id, val_id } = req.body;

  try {
    // 1️⃣ Optional: SSLCommerz validate call
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const validation = await sslcz.validate({ val_id });

    if (validation.status === 'VALID') {
      // ✅ Only now mark SUCCESS
      await paymentsCollection.updateOne(
        { tran_id },
        {
          $set: {
            status: 'SUCCESS',
            paidAt: new Date(),
            gatewayData: validation,
          },
        }
      );

      return res.redirect(
        `http://localhost:5173/payment-success?tran_id=${tran_id}`
      );
    }

    // validation failed
    await paymentsCollection.updateOne(
      { tran_id },
      { $set: { status: 'FAILED', updatedAt: new Date() } }
    );

    res.redirect('http://localhost:5173/payment-failed');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

```

// ===============================
// Fail URL
// ===============================
```bash
app.post('/payment/fail', async (req, res) => {
const { tran_id } = req.body;


await paymentsCollection.updateOne(
{ tran_id },
{ $set: { status: 'FAILED', updatedAt: new Date() } }
);


res.redirect('http://localhost:5173/payment-failed');
});
```


// ===============================
// Cancel URL
// ===============================

```bash
app.post('/payment/cancel', async (req, res) => {
const { tran_id } = req.body;


await paymentsCollection.updateOne(
{ tran_id },
{ $set: { status: 'CANCELED', updatedAt: new Date() } }
);


res.redirect('http://localhost:5173/payment-canceled');
});
```

```bash
User pays real money
      ↓
SSLCommerz server validates
      ↓
IPN → https://api.myapp.com/payment/ipn
      ↓
DB status = SUCCESS
```


// ===============================
// IPN (FINAL PAYMENT CONFIRMATION)
// ===============================
```bash
app.post('/payment/ipn', async (req, res) => {
try {
const { tran_id, status, val_id } = req.body;


if (status !== 'VALID') {
return res.status(400).json({ message: 'Invalid payment status' });
}


const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
const validation = await sslcz.validate({ val_id });


if (validation.status === 'VALID') {
await paymentsCollection.updateOne(
{ tran_id },
{
$set: {
status: 'SUCCESS',
paidAt: new Date(),
gatewayData: validation,
},
}
);


return res.status(200).json({ message: 'Payment confirmed' });
}


res.status(400).json({ message: 'Payment validation failed' });
} catch (error) {
console.error(error);
res.status(500).json({ error: 'IPN handling error' });
}
});
```

