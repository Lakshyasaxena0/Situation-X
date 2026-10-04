import { useEffect, useRef } from "react";
import { useRedeemReferralCode, getGetReferralQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { clearPendingReferral, getPendingReferral } from "@/lib/referralLink";

/**
 * Applies an invite code the new user arrived with (?ref=...), once, right after sign-in.
 * Renders nothing. A network error keeps the code for the next visit; any answer from the
 * server (applied, already used, invalid ...) ends the attempt.
 */
export function ReferralRedeemer() {
  const redeem = useRedeemReferralCode();
  const qc = useQueryClient();
  const { toast } = useToast();
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    const code = getPendingReferral();
    if (!code) return;
    tried.current = true;
    redeem
      .mutateAsync({ data: { code } })
      .then(() => {
        clearPendingReferral();
        void qc.invalidateQueries({ queryKey: getGetReferralQueryKey() });
        toast({ title: "Invite applied", description: "Your friend gets a discount when you make your first payment." });
      })
      .catch((err: { status?: number } | null) => {
        if (typeof err?.status === "number") clearPendingReferral(); // the server answered: do not retry
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
