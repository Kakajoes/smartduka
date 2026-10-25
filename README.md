# Smart Duka

Smart Duka is a commercial POS + commerce system built for a retail store, with:
- POS checkout with barcode scanning
- inventory and stock adjustments
- product intelligence for ordering focus
- admin login
- remote admin snapshot access
- online shop cart for customers
- Daraja STK payment support via environment variables
- offline-friendly local data persistence using a JSON database file

## Features

- Admin login with password hashing
- Products management and stock adjustments
- Barcode-based sales entry
- M-Pesa STK push integration with callback validation
- Product velocity intelligence: frequent products and reorder recommendations
- Remote admin snapshot using shop slug + PIN
- Customer-facing `/shop.html?shop=<slug>` catalog and cart
- Local file-backed storage for quick deployment and demo use

## Run locally

1. Install dependencies:
   npm install
2. Copy the environment file:
   cp .env.example .env
3. Start the app:
   npm start
4. Open:
   - POS: http://localhost:3000/
   - Admin: http://localhost:3000/admin.html
   - Shop: http://localhost:3000/shop.html?shop=smartduka

## Environment variables

See `.env.example` for the configuration.

## Production notes

This project is a strong commercial POS foundation and is designed to be extended with PostgreSQL, Redis, multi-user auth, and a fully managed deployment pipeline.

The current data layer uses a JSON file for simplicity and quick setup. For a supermarket-scale production deployment, replace the file store with PostgreSQL and add Redis for atomic stock reservations.

## Default credentials

- admin / Admin123!
- cashier / Cashier123!

## Daraja setup

Set these in `.env` before enabling online M-Pesa payment prompts:

- MPESA_CONSUMER_KEY
- MPESA_CONSUMER_SECRET
- MPESA_SHORTCODE
- MPESA_PASSKEY
- MPESA_ENV=sandbox or production
- MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
- MPESA_CALLBACK_TOKEN=your-long-random-secret
- APP_BASE_URL=http://localhost:3000

## Remote admin access

- Shop slug: `smartduka`
- Remote PIN: `1234`

Use:
- http://localhost:3000/admin.html
- then login with the same admin credentials, or use remote admin snapshot logic in the backend API.

## Product intelligence

The analytics endpoint calculates product velocity based on the past 30 days of sales and highlights:
- frequent products
- slow-moving products
- low-stock items

This helps the owner know which products to prioritize for stock orders.
