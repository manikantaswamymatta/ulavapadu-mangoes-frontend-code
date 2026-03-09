# Backend API for Ulavapadu Mangoes

## Features
- FastAPI backend
- PostgreSQL database
- Razorpay payment integration
- REST API for pricing, orders, and payments

## Setup
1. Copy `.env.example` to `.env` and fill in your credentials.
3. Or run locally:
   ```bash
   pip install -r requirements.txt
   uvicorn app:app --reload
   ```

## Endpoints
- `/prices` (GET, POST, PUT)
- `/orders` (POST, GET)
- `/payments` (POST)

## Deployment
- Use Render, Railway, or Fly.io for backend hosting.
- Frontend remains on Vercel.

## Notes
- Update frontend API URLs to point to backend.
- Backend supports CORS for frontend communication.

## Local Setup

1. For development, use:
   ```
   uvicorn main:app --reload
   ```
