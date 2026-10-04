import { Link } from "wouter";
import { useGetReferral } from "@workspace/api-client-react";
import { Gift, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareInvite } from "@/lib/referralLink";

/**
 * "Share with a friend, get a discount" prompt. Shown where credits matter (plans page, out of
 * credits, after an analysis). Renders nothing until the invite code has loaded.
 */
export function InviteCta({ className = "" }: { className?: string }) {
  const { data } = useGetReferral();
  if (!data) return null;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 ${className}`}>
      <div className="flex items-start gap-2.5 text-sm">
        <Gift className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <span className="text-foreground">
          Invite a friend: when they make their first payment you get <strong>{data.rewardPct}% off</strong> your next purchase.{" "}
          <Link href="/invite" className="text-primary underline underline-offset-2">
            Details
          </Link>
        </span>
      </div>
      <Button size="sm" onClick={() => void shareInvite(data.code)} className="gap-2 bg-primary text-primary-foreground hover:opacity-90">
        <Share2 className="w-3.5 h-3.5" />
        Share with a friend
      </Button>
    </div>
  );
}
