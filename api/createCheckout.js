import Stripe from 'stripe';
import supabase from './supabaseClient.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { 
  apiVersion: '2023-10-16' 
});

export default async (req, res) => {
  try {
    // Get user from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: priceId, successUrl, cancelUrl' 
      });
    }

    // Check if user already has a Stripe customer ID
    let customerId;
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('uid', user.id)
      .single();

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_uid: user.id
        }
      });
      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from('user_subscriptions')
        .upsert({
          uid: user.id,
          stripe_customer_id: customerId,
          plan: 'free',
          status: 'inactive'
        });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id, // This will be used in webhook
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        user_id: user.id
      }
    });

    res.status(200).json({
      ok: true,
      data: {
        url: session.url,
        sessionId: session.id
      }
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
