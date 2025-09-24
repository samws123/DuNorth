import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }

    let userId;
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
      userId = decoded.userId;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get plan type from request body (monthly or yearly)
    const { plan = 'monthly' } = req.body || {};
    
    // Define price IDs for different plans
    const priceIds = {
      monthly: process.env.STRIPE_PRICE_ID, // Current monthly price
      yearly: process.env.STRIPE_YEARLY_PRICE_ID || 'price_1SAniEJNEBy2XO81aLxBAb3Z' // New yearly price
    };

    const selectedPriceId = priceIds[plan];
    if (!selectedPriceId) {
      return res.status(400).json({ error: 'Invalid plan type. Use "monthly" or "yearly"' });
    }

    console.log(`Creating checkout for ${plan} plan with price ID: ${selectedPriceId}`);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin || 'http://localhost:3000'}/chat/chat.html?upgrade=success`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}/chat/chat.html?upgrade=cancelled`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    });

    return res.status(200).json({
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      detail: error.message,
    });
  }
}
