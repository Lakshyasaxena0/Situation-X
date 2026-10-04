import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetReferral,
  useRedeemReferralCode,
  getGetReferralQueryKey,
} from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Share2, Gift, Users, BadgePercent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { inviteLink, normalizeReferralCode, shareInvite } from "@/lib/referralLink";

function rupees(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function Invite() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useGetReferral();
  const redeem = useRedeemReferralCode();
  const [entered, setEntered] = useState("");

  const link = data ? inviteLink(data.code) : "";
  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${what} copied` });
    } catch {
      toast({ title: "Could not copy", description: "Select the text and copy it by hand.", variant: "destructive" });
    }
  }

  async function apply() {
    const code = normalizeReferralCode(entered);
    if (code.length !== 8) {
      toast({ title: "Enter the 8-character code", variant: "destructive" });
      return;
    }
    try {
      await redeem.mutateAsync({ data: { code } });
      setEntered("");
      await qc.invalidateQueries({ queryKey: getGetReferralQueryKey() });
      toast({ title: "Invite applied", description: "Your friend gets a discount when you make your first payment." });
    } catch (err) {
      const e = err as { data?: { message?: string } } | null;
      toast({ title: "Code not applied", description: e?.data?.message ?? "Please try again.", variant: "destructive" });
    }
  }

  return (
    <Shell>
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />
          Invite a friend
        </h1>
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && <p className="mt-6 text-sm text-red-400">Could not load your invite code. Please refresh the page.</p>}

        {data && (
          <>
            <p className="text-sm text-muted-foreground mt-1">
              Share your link. When a friend you invited makes their first payment of {rupees(data.minPaymentPaise)} or more,
              you get <strong className="text-foreground">{data.rewardPct}% off</strong> your next purchase. One discount per friend.
            </p>

            {data.nextDiscountPct > 0 && (
              <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
                <BadgePercent className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-foreground">
                  You have {data.discountsAvailable} {data.discountsAvailable === 1 ? "discount" : "discounts"} waiting. {data.nextDiscountPct}% off is applied
                  automatically at your next checkout (one discount per purchase).
                </span>
              </div>
            )}

            <div className="mt-5 rounded-lg border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">Your invite code</p>
              <p className="text-3xl font-bold tracking-[0.25em] text-foreground mt-1 select-all">{data.code}</p>
              <p className="text-xs text-muted-foreground mt-3 break-all select-all">{link}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => void copy(link, "Link")} variant="outline" className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy link
                </Button>
                <Button onClick={() => void copy(data.code, "Code")} variant="outline" className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy code
                </Button>
                <Button onClick={() => void shareInvite(data.code)} className="gap-2 bg-primary text-primary-foreground hover:opacity-90">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Friends joined", value: data.invited },
                { label: "Friends who paid", value: data.converted },
                { label: "Discounts waiting", value: data.discountsAvailable },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            {!data.referredBy && (
              <div className="mt-8 rounded-lg border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">Did a friend invite you?</h2>
                <p className="text-xs text-muted-foreground mt-1">Enter their code before your first payment so they get their discount.</p>
                <div className="mt-3 flex gap-2">
                  <Input
                    value={entered}
                    onChange={(e) => setEntered(e.target.value)}
                    placeholder="Friend's invite code"
                    maxLength={20}
                    className="uppercase tracking-widest"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void apply();
                    }}
                  />
                  <Button onClick={() => void apply()} disabled={redeem.isPending || entered.trim().length === 0}>
                    {redeem.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
