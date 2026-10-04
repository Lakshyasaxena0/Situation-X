import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBillingPlans,
  useGetSubscriptionStatus,
  useCreateBillingOrder,
  useVerifyBillingPayment,
  getGetSubscriptionStatusQueryKey,
  type BillingQuote,
} from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Loader2, Check, CalendarCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
};
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(true));
    script.addEventListener("error", () => resolve(false));
    if (!existing) {
      script.src = CHECKOUT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

function rupees(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function PlanCard({
  quote,
  best,
  busy,
  disabled,
  renew,
  onBuy,
}: {
  quote: BillingQuote;
  best: boolean;
  busy: boolean;
  disabled: boolean;
  renew: boolean;
  onBuy: () => void;
}) {
  return (
    <div className={`relative rounded-lg border p-5 flex flex-col gap-4 bg-card ${best ? "border-primary/60" : "border-border"}`}>
      {best && (
        <span className="absolute -top-2.5 left-4 text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded">
          Best value
        </span>
      )}
      <div>
        <h3 className="text-sm font-semibold text-foreground">{quote.label}</h3>
        <p className="text-3xl font-bold text-foreground mt-2">{rupees(quote.totalPaise)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {quote.months === 1 ? "billed every month you choose" : `${rupees(quote.effectivePerMonthPaise)} / month`}
        </p>
      </div>

      <dl className="text-xs text-muted-foreground space-y-1.5">
        <div className="flex justify-between">
          <dt>{quote.months} × {rupees(quote.monthlyPaise)}</dt>
          <dd>{rupees(quote.grossPaise)}</dd>
        </div>
        {quote.discountPaise > 0 && (
          <div className="flex justify-between text-emerald-400">
            <dt>{quote.discountPct}% plan discount</dt>
            <dd>− {rupees(quote.discountPaise)}</dd>
          </div>
        )}
        {quote.gstPaise > 0 && (
          <div className="flex justify-between">
            <dt>GST {quote.gstPct}%</dt>
            <dd>{rupees(quote.gstPaise)}</dd>
          </div>
        )}
        <div className="flex justify-between font-medium text-foreground border-t border-border pt-1.5">
          <dt>Total</dt>
          <dd>{rupees(quote.totalPaise)}</dd>
        </div>
      </dl>

      <Button onClick={onBuy} disabled={disabled} className="w-full bg-primary text-primary-foreground hover:opacity-90 mt-auto">
        {busy ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Opening payment...
          </span>
        ) : renew ? (
          "Extend with this plan"
        ) : (
          "Subscribe"
        )}
      </Button>
    </div>
  );
}

export default function Pricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const { data: plansData, isLoading: plansLoading, isError: plansError } = useGetBillingPlans();
  const { data: status } = useGetSubscriptionStatus();
  const createOrder = useCreateBillingOrder();
  const verify = useVerifyBillingPayment();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(() => {
    void loadCheckout(); // warm the script so the payment window opens instantly
  }, []);

  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: getGetSubscriptionStatusQueryKey() });

  async function buy(quote: BillingQuote) {
    setBusyPlan(quote.planId);
    try {
      if (!(await loadCheckout()) || !window.Razorpay) {
        toast({ title: "Payment window could not load", description: "Check your connection and try again.", variant: "destructive" });
        setBusyPlan(null);
        return;
      }
      const order = await createOrder.mutateAsync({ data: { plan: quote.planId } });

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.orderId,
        name: "Situation X",
        description: `${quote.label} subscription`,
        prefill: { name: user?.fullName ?? undefined, email: user?.primaryEmailAddress?.emailAddress },
        theme: { color: "#f97316" },
        modal: { ondismiss: () => setBusyPlan(null) },
        handler: async (response) => {
          try {
            await verify.mutateAsync({ data: response });
            await refreshStatus();
            toast({ title: "Subscription active", description: `Your ${quote.label} plan is now active.` });
          } catch {
            // The payment went through; the server also learns about it from Razorpay's webhook.
            toast({
              title: "Payment received",
              description: "We are confirming it with the bank. Your subscription will show up here within a minute.",
            });
            setTimeout(() => void refreshStatus(), 15_000);
          } finally {
            setBusyPlan(null);
          }
        },
      });
      checkout.on("payment.failed", (r) => {
        toast({ title: "Payment failed", description: r.error?.description ?? "No money was charged. Please try again.", variant: "destructive" });
        setBusyPlan(null);
      });
      checkout.open();
    } catch (err) {
      const e = err as { status?: number } | null;
      toast({
        title: e?.status === 503 ? "Payments are not available yet" : "Could not start the payment",
        description: e?.status === 503 ? "Please try again later." : "Please try again.",
        variant: "destructive",
      });
      setBusyPlan(null);
    }
  }

  const plans = plansData?.plans ?? [];
  const bestId = plans.reduce<BillingQuote | null>((best, p) => (!best || p.discountPct > best.discountPct ? p : best), null)?.planId;

  return (
    <Shell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prepaid access, no auto-renewal. Pay once for the duration you choose; longer plans cost less per month.
        </p>

        {status?.active && status.currentPeriodEnd && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
            <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
            <span className="text-foreground">
              Active until <strong>{formatDate(status.currentPeriodEnd)}</strong> ({status.daysLeft} {status.daysLeft === 1 ? "day" : "days"} left).
              Buying another plan adds time on top.
            </span>
          </div>
        )}
        {status && !status.active && status.currentPeriodEnd && (
          <p className="mt-5 text-sm text-red-400">Your subscription ended on {formatDate(status.currentPeriodEnd)}.</p>
        )}

        {plansLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {plansError && <p className="mt-8 text-sm text-red-400">Could not load the plans. Please refresh the page.</p>}

        {plans.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((q) => (
              <PlanCard
                key={q.planId}
                quote={q}
                best={q.planId === bestId && q.discountPct > 0}
                busy={busyPlan === q.planId}
                disabled={busyPlan !== null}
                renew={Boolean(status?.active)}
                onBuy={() => void buy(q)}
              />
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          Payments are processed securely by Razorpay (UPI, cards, netbanking, wallets). Prices in INR.
        </p>
      </div>
    </Shell>
  );
}
