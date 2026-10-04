import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBillingPlans,
  useGetSubscriptionStatus,
  useGetCredits,
  useGetReferral,
  useCreateBillingOrder,
  useVerifyBillingPayment,
  getGetSubscriptionStatusQueryKey,
  getGetCreditsQueryKey,
  getGetReferralQueryKey,
  type BillingQuote,
  type CreditPackQuote,
  type CreateOrderRequest,
} from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Loader2, Check, CalendarCheck, Coins } from "lucide-react";
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
  inviteDiscountPct = 0,
  onBuy,
}: {
  quote: BillingQuote;
  best: boolean;
  busy: boolean;
  disabled: boolean;
  renew: boolean;
  inviteDiscountPct?: number;
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
          {quote.months === 1 ? "one month of access" : `${rupees(quote.effectivePerMonthPaise)} / month`}
        </p>
        <p className="text-sm text-primary mt-2 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" />
          {quote.credits.toLocaleString("en-IN")} credits included
        </p>
        <p className="text-xs text-muted-foreground">about {rupees(Math.round(quote.totalPaise / quote.credits))} per credit</p>
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
        {inviteDiscountPct > 0 && (
          <div className="flex justify-between text-emerald-400">
            <dt>{inviteDiscountPct}% invite discount</dt>
            <dd>− {rupees(Math.round((quote.totalPaise * inviteDiscountPct) / 100))}</dd>
          </div>
        )}
        <div className="flex justify-between font-medium text-foreground border-t border-border pt-1.5">
          <dt>Total</dt>
          <dd>{rupees(quote.totalPaise - Math.round((quote.totalPaise * inviteDiscountPct) / 100))}</dd>
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

const MONEY_NOTE = "Payments are processed securely by Razorpay (UPI, cards, netbanking, wallets). Prices in INR.";

export default function Pricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const { data: plansData, isLoading: plansLoading, isError: plansError } = useGetBillingPlans();
  const { data: status } = useGetSubscriptionStatus();
  const { data: wallet } = useGetCredits();
  const { data: referral } = useGetReferral();
  const inviteDiscountPct = referral?.nextDiscountPct ?? 0;
  const createOrder = useCreateBillingOrder();
  const verify = useVerifyBillingPayment();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [singleCredits, setSingleCredits] = useState(20);

  useEffect(() => {
    void loadCheckout(); // warm the script so the payment window opens instantly
  }, []);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetSubscriptionStatusQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetCreditsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetReferralQueryKey() }),
    ]);

  /** One checkout flow for plans, top-up packs and single-query credits. The server decides the price. */
  async function checkout(key: string, request: CreateOrderRequest) {
    setBusyKey(key);
    try {
      if (!(await loadCheckout()) || !window.Razorpay) {
        toast({ title: "Payment window could not load", description: "Check your connection and try again.", variant: "destructive" });
        setBusyKey(null);
        return;
      }
      const order = await createOrder.mutateAsync({ data: request });

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.orderId,
        name: "Situation X",
        description: order.description,
        prefill: { name: user?.fullName ?? undefined, email: user?.primaryEmailAddress?.emailAddress },
        theme: { color: "#f97316" },
        modal: { ondismiss: () => setBusyKey(null) },
        handler: async (response) => {
          try {
            await verify.mutateAsync({ data: response });
            await refresh();
            toast({ title: "Payment successful", description: `${order.credits} credits were added to your account.` });
          } catch {
            // The payment went through; the server also learns about it from Razorpay's webhook.
            toast({
              title: "Payment received",
              description: "We are confirming it with the bank. Your credits will show up here within a minute.",
            });
            setTimeout(() => void refresh(), 15_000);
          } finally {
            setBusyKey(null);
          }
        },
      });
      rzp.on("payment.failed", (r) => {
        toast({ title: "Payment failed", description: r.error?.description ?? "No money was charged. Please try again.", variant: "destructive" });
        setBusyKey(null);
      });
      rzp.open();
    } catch (err) {
      const e = err as { status?: number; data?: { message?: string } } | null;
      toast({
        title: e?.status === 503 ? "Payments are not available yet" : "Could not start the payment",
        description: e?.status === 503 ? "Please try again later." : e?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
      setBusyKey(null);
    }
  }

  const plans = plansData?.plans ?? [];
  const packs = plansData?.packs ?? [];
  const single = plansData?.single;
  const subscribed = Boolean(status?.active);
  const bestId = plans.reduce<BillingQuote | null>((best, p) => (!best || p.discountPct > best.discountPct ? p : best), null)?.planId;
  const singleOk = single ? Number.isInteger(singleCredits) && singleCredits >= single.minCredits && singleCredits <= single.maxCredits : false;
  const reasonLabel: Record<string, string> = {
    welcome: "Welcome credits",
    plan: "Plan credits",
    topup: "Top-up",
    single: "Single-query credits",
    analysis: "Analysis",
    refund: "Refund",
  };

  return (
    <Shell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Plans &amp; credits</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Each analysis uses credits, based on the modules involved and how deeply the AI reasons. A plan gives you credits and a lower price; when they run out, top up. No auto-renewal.
        </p>

        {plansData && !plansData.paywallEnabled && (
          <p className="mt-4 text-sm rounded-lg border border-border bg-card px-4 py-3 text-muted-foreground">
            Credits are not being charged yet, so analyses are free for now.
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Credit balance</p>
            <p className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              {wallet ? wallet.balance.toLocaleString("en-IN") : "-"}
            </p>
          </div>
          {status?.active && status.currentPeriodEnd ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
              <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="text-foreground">
                Subscribed until <strong>{formatDate(status.currentPeriodEnd)}</strong> ({status.daysLeft} {status.daysLeft === 1 ? "day" : "days"} left). Buying another plan adds time and credits.
              </span>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              {status?.currentPeriodEnd ? `Your subscription ended on ${formatDate(status.currentPeriodEnd)}. ` : "No active subscription. "}
              Subscribers get cheaper credits and top-up packs.
            </div>
          )}
        </div>

        {inviteDiscountPct > 0 && (
          <p className="mt-4 text-sm rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-foreground">
            You earned a {inviteDiscountPct}% discount by inviting a friend. It is applied automatically at checkout (on one purchase).
          </p>
        )}

        {plansLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {plansError && <p className="mt-8 text-sm text-red-400">Could not load the plans. Please refresh the page.</p>}

        {plans.length > 0 && (
          <>
            <h2 className="mt-8 text-sm font-semibold text-foreground">Subscription plans</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((q) => (
                <PlanCard
                  key={q.planId}
                  quote={q}
                  best={q.planId === bestId && q.discountPct > 0}
                  busy={busyKey === q.planId}
                  disabled={busyKey !== null}
                  renew={subscribed}
                  inviteDiscountPct={inviteDiscountPct}
                  onBuy={() => void checkout(q.planId, { plan: q.planId })}
                />
              ))}
            </div>
          </>
        )}

        {packs.length > 0 && (
          <>
            <h2 className="mt-10 text-sm font-semibold text-foreground">Top up credits</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {subscribed ? "Subscriber price. Bigger packs cost less per credit." : "Top-up packs are for subscribers. Pick a plan above first, or buy credits for a single query below."}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {packs.map((p: CreditPackQuote) => (
                <div key={p.packId ?? p.credits} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{p.credits.toLocaleString("en-IN")} credits</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{rupees(p.totalPaise)}</p>
                    <p className="text-xs text-muted-foreground">
                      {rupees(p.perCreditPaise)} per credit{p.discountPct > 0 ? ` · ${p.discountPct}% pack discount` : ""}
                    </p>
                  </div>
                  <Button
                    disabled={!subscribed || busyKey !== null || !p.packId}
                    onClick={() => p.packId && void checkout(p.packId, { pack: p.packId })}
                    className="w-full bg-primary text-primary-foreground hover:opacity-90 mt-auto"
                  >
                    {busyKey === p.packId ? "Opening payment..." : "Buy"}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {single && (
          <div className="mt-10 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Just one question? Buy credits for a single query</h2>
            <p className="text-xs text-muted-foreground mt-1">
              No subscription needed. This is the highest per-credit price ({rupees(single.perCreditPaise)} per credit); a plan or a top-up is much cheaper if you will ask more than once.
            </p>
            <div className="mt-3 flex items-end gap-3 flex-wrap">
              <label className="text-xs text-muted-foreground">
                Credits ({single.minCredits}-{single.maxCredits})
                <input
                  type="number"
                  min={single.minCredits}
                  max={single.maxCredits}
                  value={singleCredits}
                  onChange={(e) => setSingleCredits(Number(e.target.value))}
                  className="mt-1 block w-28 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
              </label>
              <p className="text-sm text-foreground pb-1.5">{singleOk ? rupees(singleCredits * single.perCreditPaise) : "-"}</p>
              <Button
                disabled={!singleOk || busyKey !== null}
                onClick={() => void checkout("single", { singleCredits })}
                className="bg-primary text-primary-foreground hover:opacity-90"
              >
                {busyKey === "single" ? "Opening payment..." : "Buy credits"}
              </Button>
            </div>
          </div>
        )}

        {plansData && (
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">What each module costs</h2>
              <p className="text-xs text-muted-foreground mt-1">Only the modules that take part in your question are charged. ASTRO is always part of it.</p>
              <ul className="mt-2 space-y-1.5">
                {plansData.costs.modules.map((r) => (
                  <li key={r.label} className="flex justify-between text-sm text-muted-foreground">
                    <span>{r.label}</span>
                    <span className="text-foreground">{r.credits}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">AI reasoning level</h2>
              <p className="text-xs text-muted-foreground mt-1">Deeper thinking costs more. Auto picks a level for you; you can choose before you run.</p>
              <ul className="mt-2 space-y-1.5">
                {plansData.costs.ai.map((r) => (
                  <li key={r.label} className="flex justify-between text-sm text-muted-foreground">
                    <span>{r.label}</span>
                    <span className="text-foreground">{r.credits}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">If the AI cannot answer, you get the engine + astrology answer and the AI credits are returned.</p>
            </div>
          </div>
        )}

        {wallet && wallet.ledger.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
              {wallet.ledger.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="text-foreground">
                    {reasonLabel[l.reason] ?? l.reason}
                    <span className="ml-2 text-xs text-muted-foreground">{formatDate(l.createdAt)}</span>
                  </span>
                  <span className={l.delta > 0 ? "text-emerald-400" : "text-muted-foreground"}>
                    {l.delta > 0 ? "+" : ""}
                    {l.delta}
                    <span className="ml-2 text-xs text-muted-foreground">balance {l.balanceAfter}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          {MONEY_NOTE}
        </p>
      </div>
    </Shell>
  );
}
