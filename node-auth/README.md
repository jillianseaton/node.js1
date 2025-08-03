# Stripe Payout Server

A Node.js Express server that provides comprehensive Stripe payout functionality including creating payouts, retrieving payout details, listing payouts, and handling webhook events.

## Setup

### Environment Variables

Set the following environment variables:

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
PORT=4242  # Optional, defaults to 4242
```

### Installation

```bash
npm install
npm start
```

## API Endpoints

### 1. Create Payout

Creates a new payout to a connected account.

**Endpoint:** `POST /api/payout`

**Request Body:**
```json
{
  "amount": 1000,           // Required: Amount in cents
  "currency": "usd",        // Optional: Currency code (defaults to "usd")
  "destination": "ba_123"   // Optional: Bank account or card ID
}
```

**Response:**
```json
{
  "success": true,
  "payout": {
    "id": "po_123",
    "amount": 1000,
    "currency": "usd",
    "status": "pending",
    // ... other Stripe payout object properties
  }
}
```

### 2. Retrieve Payout

Retrieves details of a specific payout using its ID.

**Endpoint:** `GET /api/payout/:id`

**Parameters:**
- `id` (path): The payout ID

**Response:**
```json
{
  "success": true,
  "payout": {
    "id": "po_123",
    "amount": 1000,
    "currency": "usd",
    "status": "paid",
    // ... other Stripe payout object properties
  }
}
```

### 3. List Payouts

Fetches a list of all payouts with optional filtering.

**Endpoint:** `GET /api/payouts`

**Query Parameters:**
- `limit` (optional): Number of payouts to return (max 100, default 10)
- `created` (optional): Filter by creation date
  - Single timestamp: `?created=1234567890`
  - Date range: `?created=1234567890..1234567999`
- `starting_after` (optional): Pagination cursor
- `ending_before` (optional): Pagination cursor

**Examples:**
```
GET /api/payouts
GET /api/payouts?limit=20
GET /api/payouts?created=1672531200..1672617600
GET /api/payouts?limit=10&starting_after=po_123
```

**Response:**
```json
{
  "success": true,
  "payouts": [
    {
      "id": "po_123",
      "amount": 1000,
      "currency": "usd",
      "status": "paid",
      // ... other payout properties
    }
    // ... more payouts
  ],
  "has_more": true
}
```

### 4. Webhook Handler

Handles Stripe webhook events related to payouts.

**Endpoint:** `POST /api/webhook`

**Supported Events:**
- `payout.created`: When a payout is created
- `payout.failed`: When a payout fails
- `payout.paid`: When a payout is successfully paid

**Headers Required:**
- `stripe-signature`: Stripe webhook signature for verification

### 5. Health Check

Simple health check endpoint.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

All endpoints return proper HTTP status codes and error messages:

- `400 Bad Request`: Invalid input parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server or Stripe API errors

**Error Response Format:**
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Logging

The server includes comprehensive logging for:
- All API requests and responses
- Stripe API calls and errors
- Webhook events processing
- Environment configuration checks

Logs include timestamps and structured data for easy debugging.

## Security

- Webhook signature verification using Stripe's signing secret
- Input validation for all endpoints
- Proper error handling to prevent information leakage
- CORS enabled for cross-origin requests

## Development

To test the endpoints with a tool like curl:

```bash
# Create payout
curl -X POST http://localhost:4242/api/payout \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "currency": "usd", "destination": "ba_test_123"}'

# Retrieve payout
curl -X GET http://localhost:4242/api/payout/po_123

# List payouts
curl -X GET http://localhost:4242/api/payouts?limit=5

# Health check
curl -X GET http://localhost:4242/health
```

Note: You'll need valid Stripe API keys and existing payout/account IDs for successful responses.