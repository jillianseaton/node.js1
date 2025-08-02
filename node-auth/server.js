const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 4242;

app.use(cors());
app.use(express.json());

app.post('/api/payout', async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    
    const payout = await stripe.payouts.create({
      amount: amount,
      currency: currency,
      method: 'instant'
    });

    res.json({ success: true, payout });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
