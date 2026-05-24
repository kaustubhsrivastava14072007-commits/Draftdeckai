'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteDialog } from '@/components/delete-dialog';
import { Loader2, CreditCard, Calendar, AlertCircle, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  subscription_plans: {
    name: string;
    price: number;
    billing_period: string;
  };
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const supabase = createClient();
        // Use getSession() for rate limit avoidance
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
          router.push('/auth/signin');
          return;
        }

        const { data, error } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans (
              name,
              price,
              billing_period
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          setSubscription(data as any);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchSubscription();
  }, [router]);

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error('Failed to open billing portal');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCanceling(true);

      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setSubscription((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          cancel_at_period_end: true,
          current_period_end: data.subscription?.current_period_end || current.current_period_end,
          status: data.subscription?.status || current.status,
        };
      });
      setIsCancelDialogOpen(false);

      toast.success('Your subscription will stay active until the end of the current billing period.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel subscription';
      toast.error(message);
      throw error;
    } finally {
      setIsCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>
              You don't have an active subscription yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/pricing')} className="w-full">
              View Pricing Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColor = {
    active: 'bg-green-500',
    past_due: 'bg-yellow-500',
    canceled: 'bg-red-500',
    trialing: 'bg-blue-500',
  }[subscription.status] || 'bg-gray-500';
  const canCancelSubscription =
    !subscription.cancel_at_period_end &&
    ['active', 'trialing'].includes(subscription.status);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage your DraftDeckAI subscription and billing
          </p>
        </div>

        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-blue-600" />
                <CardTitle>Current Plan</CardTitle>
              </div>
              <Badge className={statusColor}>
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-2xl font-bold">
                {subscription.subscription_plans.name}
              </p>
              <p className="text-muted-foreground">
                ${subscription.subscription_plans.price}/{subscription.subscription_plans.billing_period}
              </p>
            </div>

            {subscription.cancel_at_period_end && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                    Subscription Ending
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Your subscription will end on{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Current Period</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(subscription.current_period_start).toLocaleDateString()} -{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Next Billing Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>
              Update your payment method, change plans, or cancel your subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleManageBilling} className="w-full" variant="default">
              <CreditCard className="w-4 h-4 mr-2" />
              Manage Billing & Payment
            </Button>
            <Button onClick={() => router.push('/pricing')} className="w-full" variant="outline">
              Change Plan
            </Button>
            {canCancelSubscription && (
              <Button
                onClick={() => setIsCancelDialogOpen(true)}
                className="w-full"
                variant="destructive"
              >
                Cancel Subscription
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Features Card */}
        <Card>
          <CardHeader>
            <CardTitle>Included Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                ✅ Unlimited presentations
              </li>
              <li className="flex items-center gap-2">
                ✅ Unlimited resumes & CVs
              </li>
              <li className="flex items-center gap-2">
                ✅ AI-powered generation
              </li>
              <li className="flex items-center gap-2">
                ✅ Premium templates
              </li>
              <li className="flex items-center gap-2">
                ✅ Export to PDF/PPTX/DOCX
              </li>
              <li className="flex items-center gap-2">
                ✅ Priority support
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <DeleteDialog
        open={isCancelDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCancelDialogOpen(false);
          }
        }}
        onConfirm={handleCancelSubscription}
        isDeleting={isCanceling}
        title="Cancel Subscription"
        description={`Are you sure you want to cancel your ${subscription.subscription_plans.name} plan? You'll keep access until ${new Date(subscription.current_period_end).toLocaleDateString()}, then premium features will end.`}
        confirmLabel="Cancel subscription"
        confirmingLabel="Canceling..."
      />
    </div>
  );
}
