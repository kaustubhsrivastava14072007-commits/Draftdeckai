import { NextResponse } from 'next/server';
import { cancelSubscription } from '@/lib/stripe';
import { createRoute } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createRoute();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, cancel_at_period_end, current_period_end, status')
      .eq('user_id', user.id)
      .single();

    if (subscriptionError || !subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    if (subscription.cancel_at_period_end) {
      return NextResponse.json({
        success: true,
        subscription: {
          cancel_at_period_end: true,
          current_period_end: subscription.current_period_end,
          status: subscription.status,
        },
      });
    }

    const stripeSubscription = await cancelSubscription(subscription.stripe_subscription_id);

    const updatedSubscription = {
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      current_period_end: stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
        : subscription.current_period_end,
      canceled_at: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
      status: stripeSubscription.status,
    };

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update(updatedSubscription)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel subscription' }, { status: 500 });
  }
}
