import { Link } from "wouter";
import { useGetCredits, getGetCreditsQueryKey } from "@workspace/api-client-react";
import { Coins } from "lucide-react";

/** Shows the credit balance (only while credits are being charged). Links to the plans page. */
export function CreditBadge({ className = "" }: { className?: string }) {
  const { data } = useGetCredits({ query: { queryKey: getGetCreditsQueryKey(), staleTime: 15_000, refetchOnWindowFocus: true } });
  if (!data?.billingActive) return null;
  const low = data.balance < 15;
  return (
    <Link href="/pricing">
      <div
        className={`flex items-center justify-between gap-2 rounded border px-3 py-2 text-xs transition-colors hover:bg-muted/50 ${
          low ? "border-orange-400/40 text-orange-300" : "border-border text-muted-foreground"
        } ${className}`}
        title="Your credits. Click to add more."
      >
        <span className="flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" />
          Credits
        </span>
        <span className="font-semibold text-foreground">{data.balance}</span>
      </div>
    </Link>
  );
}
