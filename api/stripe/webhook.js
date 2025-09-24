import Stripe from 'stripe';
import { query } from '../_lib/pg.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Disable body parsing for webhooks - this is critical for Vercel
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('=== STRIPE WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Has signature:', !!req.headers['stripe-signature']);
  console.log('Environment check - Secret key exists:', !!process.env.STRIPE_SECRET_KEY);
  console.log('Environment check - Webhook secret exists:', !!process.env.STRIPE_WEBHOOK_SECRET);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;
  let rawBody;

  try {
    // Read raw body using different approach for Vercel
    rawBody = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => {
        chunks.push(chunk);
      });
      req.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      req.on('error', reject);
      
      // Fallback if no data event is fired
      setTimeout(() => {
        if (chunks.length === 0) {
          console.log('No data received, trying alternative method...');
          // Try to get body from req.body if it exists
          if (req.body !== undefined) {
            if (typeof req.body === 'string') {
              resolve(Buffer.from(req.body, 'utf8'));
            } else if (Buffer.isBuffer(req.body)) {
              resolve(req.body);
            } else {
              resolve(Buffer.from(JSON.stringify(req.body), 'utf8'));
            }
          } else {
            resolve(Buffer.alloc(0));
          }
        }
      }, 100);
    });
    
    console.log('Raw body length:', rawBody.length);
    console.log('Raw body preview:', rawBody.toString().substring(0, 100) + '...');
    console.log('Signature:', sig?.substring(0, 20) + '...');
    
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log('✅ Webhook event verified:', event.type, event.id);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    console.error('Full error:', err);
    return res.status(400).json({ error: 'Webhook signature verification failed', detail: err.message });
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;

      case 'customer.subscription.created':
        const subscription = event.data.object;
        await handleSubscriptionCreated(subscription);
        break;

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        await handleSubscriptionUpdated(updatedSubscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionDeleted(deletedSubscription);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        await handlePaymentFailed(failedInvoice);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutCompleted(session) {
  const userId = session.client_reference_id || session.metadata?.userId;
  if (!userId) {
    console.log('No userId found in checkout session:', session.id);
    return;
  }

  console.log(`Checkout completed for user ${userId}, customer: ${session.customer}`);
  
  try {
    // Update user subscription status
    const result = await query(
      `UPDATE users SET 
       stripe_customer_id = $1, 
       subscription_status = 'active'
       WHERE id = $2`,
      [session.customer, userId]
    );
    console.log(`Updated ${result.rowCount} rows for checkout completion`);
  } catch (error) {
    console.error('Error updating user after checkout:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.log('No userId found in subscription metadata:', subscription.id);
    // Try to find user by customer ID
    try {
      const customerResult = await query(
        'SELECT id FROM users WHERE stripe_customer_id = $1',
        [subscription.customer]
      );
      if (customerResult.rows.length > 0) {
        const foundUserId = customerResult.rows[0].id;
        console.log(`Found user ${foundUserId} by customer ID ${subscription.customer}`);
        await updateSubscriptionForUser(foundUserId, subscription);
      } else {
        console.log('No user found for customer:', subscription.customer);
      }
    } catch (error) {
      console.error('Error finding user by customer ID:', error);
    }
    return;
  }

  console.log(`Subscription created for user ${userId}`);
  await updateSubscriptionForUser(userId, subscription);
}

async function updateSubscriptionForUser(userId, subscription) {
  try {
    // Detect plan type based on price ID
    const planType = detectPlanType(subscription);
    
    const result = await query(
      `UPDATE users SET 
       stripe_subscription_id = $1,
       subscription_status = $2,
       subscription_current_period_start = to_timestamp($3),
       subscription_current_period_end = to_timestamp($4),
       subscription_plan = $6
       WHERE id = $5`,
      [
        subscription.id,
        subscription.status,
        subscription.current_period_start,
        subscription.current_period_end,
        userId,
        planType
      ]
    );
    console.log(`Updated ${result.rowCount} rows for subscription creation (Plan: ${planType})`);
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

// Helper function to detect plan type from subscription
function detectPlanType(subscription) {
  const monthlyPriceId = process.env.STRIPE_PRICE_ID || 'price_1SAUF6JNEBy2XO81lOaEdanC';
  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID || 'price_1SAniEJNEBy2XO81aLxBAb3Z';
  
  // Check the subscription items for price ID
  if (subscription.items && subscription.items.data && subscription.items.data.length > 0) {
    const priceId = subscription.items.data[0].price.id;
    console.log(`Detected price ID: ${priceId}`);
    
    if (priceId === yearlyPriceId) {
      return 'yearly';
    } else if (priceId === monthlyPriceId) {
      return 'monthly';
    }
  }
  
  // Fallback: check interval from subscription
  if (subscription.items && subscription.items.data && subscription.items.data.length > 0) {
    const interval = subscription.items.data[0].price.recurring?.interval;
    if (interval === 'year') {
      return 'yearly';
    } else if (interval === 'month') {
      return 'monthly';
    }
  }
  
  // Default fallback
  console.log('Could not detect plan type, defaulting to monthly');
  return 'monthly';
}

async function handleSubscriptionUpdated(subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  console.log(`Subscription updated for user ${userId}`);
  
  // Detect plan type for updates too
  const planType = detectPlanType(subscription);
  
  await query(
    `UPDATE users SET 
     subscription_status = $1,
     subscription_current_period_start = to_timestamp($2),
     subscription_current_period_end = to_timestamp($3),
     subscription_plan = $5
     WHERE stripe_subscription_id = $4`,
    [
      subscription.status,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.id,
      planType
    ]
  );
  
  console.log(`✅ Updated subscription with plan: ${planType}`);
}

async function handleSubscriptionDeleted(subscription) {
  console.log(`Subscription deleted: ${subscription.id}`);
  
  await query(
    `UPDATE users SET 
     subscription_status = 'cancelled'
     WHERE stripe_subscription_id = $1`,
    [subscription.id]
  );
}

async function handlePaymentSucceeded(invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  console.log(`Payment succeeded for subscription ${subscriptionId}`);
  
  await query(
    `UPDATE users SET 
     subscription_status = 'active'
     WHERE stripe_subscription_id = $1`,
    [subscriptionId]
  );
}

async function handlePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  console.log(`Payment failed for subscription ${subscriptionId}`);
  
  await query(
    `UPDATE users SET 
     subscription_status = 'past_due'
     WHERE stripe_subscription_id = $1`,
    [subscriptionId]
  );
}
