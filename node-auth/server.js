require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 4242;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

app.use(cors());

// Webhook endpoint needs raw body
app.use('/api/webhook', express.raw({type: 'application/json'}));
app.use(express.json());

// Logging utility
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Create a Payout Endpoint
app.post('/api/payout', async (req, res) => {
  try {
    const { amount, currency = 'usd', destination } = req.body;
    
    // Validate required fields
    if (!amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Amount is required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Amount must be greater than 0' 
      });
    }

    const payoutData = {
      amount: amount,
      currency: currency,
      method: 'instant'
    };

    // Add destination if provided
    if (destination) {
      payoutData.destination = destination;
    }

    log('Creating payout', payoutData);
    
    const payout = await stripe.payouts.create(payoutData);

    log('Payout created successfully', { payoutId: payout.id });

    res.json({ success: true, payout });
  } catch (error) {
    log('Error creating payout', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Retrieve a Payout Endpoint
app.get('/api/payout/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payout ID is required' 
      });
    }

    log('Retrieving payout', { payoutId: id });
    
    const payout = await stripe.payouts.retrieve(id);

    res.json({ success: true, payout });
  } catch (error) {
    log('Error retrieving payout', { payoutId: req.params.id, error: error.message });
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(404).json({ success: false, error: 'Payout not found' });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// List All Payouts Endpoint
app.get('/api/payouts', async (req, res) => {
  try {
    const { created, limit = 10, starting_after, ending_before } = req.query;
    
    const params = {
      limit: Math.min(parseInt(limit), 100) // Limit to 100 max
    };

    // Add created date filter if provided
    if (created) {
      try {
        // Support both timestamp and date range formats
        if (created.includes('..')) {
          const [start, end] = created.split('..');
          params.created = {
            gte: parseInt(start),
            lte: parseInt(end)
          };
        } else {
          params.created = parseInt(created);
        }
      } catch (err) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid created date format. Use timestamp or range like "1234567890..1234567899"' 
        });
      }
    }

    // Add pagination parameters
    if (starting_after) {
      params.starting_after = starting_after;
    }
    if (ending_before) {
      params.ending_before = ending_before;
    }

    log('Listing payouts', params);
    
    const payouts = await stripe.payouts.list(params);

    res.json({ success: true, payouts: payouts.data, has_more: payouts.has_more });
  } catch (error) {
    log('Error listing payouts', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook Handling Endpoint
app.post('/api/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (!WEBHOOK_SECRET) {
      log('Warning: STRIPE_WEBHOOK_SECRET not configured');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
    log('Webhook event received', { type: event.type, id: event.id });
  } catch (err) {
    log('Webhook signature verification failed', { error: err.message });
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Handle the event
  switch (event.type) {
    case 'payout.created':
      const payoutCreated = event.data.object;
      log('Payout created webhook', { 
        payoutId: payoutCreated.id, 
        amount: payoutCreated.amount, 
        currency: payoutCreated.currency,
        status: payoutCreated.status 
      });
      // Add your business logic here
      break;
      
    case 'payout.failed':
      const payoutFailed = event.data.object;
      log('Payout failed webhook', { 
        payoutId: payoutFailed.id, 
        amount: payoutFailed.amount, 
        currency: payoutFailed.currency,
        status: payoutFailed.status,
        failure_code: payoutFailed.failure_code,
        failure_message: payoutFailed.failure_message
      });
      // Add your business logic here (e.g., notify user, update database)
      break;
      
    case 'payout.paid':
      const payoutPaid = event.data.object;
      log('Payout paid webhook', { 
        payoutId: payoutPaid.id, 
        amount: payoutPaid.amount, 
        currency: payoutPaid.currency,
        status: payoutPaid.status 
      });
      // Add your business logic here
      break;
      
    default:
      log('Unhandled webhook event type', { type: event.type });
  }

  res.json({ received: true });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  log(`Server running on port ${PORT}`);
  log('Environment check', {
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
  });
});
