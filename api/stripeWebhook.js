import Stripe from 'stripe';
import supabase from './supabaseClient.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { 
  apiVersion: '2023-10-16' 
});

export default async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Construct the event from the raw body and signature
    event = stripe.webhooks.constructEvent(
      req.rawBody || req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received Stripe webhook event:', event.type);

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { customer, client_reference_id, subscription } = session;
        
        console.log('Processing checkout.session.completed for user:', client_reference_id);
        
        // Update user subscription status
        const { error } = await supabase
          .from('user_subscriptions')
          .upsert({
            uid: client_reference_id,
            stripe_customer_id: customer,
            plan: 'pro',
            status: 'active',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          });

        if (error) {
          console.error('Error updating user subscription:', error);
        } else {
          console.log('Successfully updated user subscription for:', client_reference_id);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Find user by stripe customer ID and update subscription
        const { data: subscription, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('uid')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!fetchError && subscription) {
          const { error } = await supabase
            .from('user_subscriptions')
            .update({
              status: 'active',
              current_period_end: new Date(invoice.period_end * 1000)
            })
            .eq('uid', subscription.uid);

          if (error) {
            console.error('Error updating subscription after payment:', error);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Find user by stripe customer ID and update subscription status
        const { data: subscription, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('uid')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!fetchError && subscription) {
          const { error } = await supabase
            .from('user_subscriptions')
            .update({ status: 'past_due' })
            .eq('uid', subscription.uid);

          if (error) {
            console.error('Error updating subscription after failed payment:', error);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user by stripe customer ID and update subscription status
        const { data: userSub, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('uid')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!fetchError && userSub) {
          const { error } = await supabase
            .from('user_subscriptions')
            .update({ 
              status: 'canceled',
              plan: 'free'
            })
            .eq('uid', userSub.uid);

          if (error) {
            console.error('Error updating subscription after cancellation:', error);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log the payment event
    const { error: logError } = await supabase
      .from('payment_events')
      .insert({
        uid: event.data.object.client_reference_id || null,
        stripe_event_id: event.id,
        type: event.type,
        payload: event
      });

    if (logError) {
      console.error('Error logging payment event:', logError);
    }

    res.status(200).send('ok');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};
