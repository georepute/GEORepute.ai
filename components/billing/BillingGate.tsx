"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useBillingContext } from "@/lib/billing/billing-context";
import { getRouteAccessRequirement } from "@/lib/billing/route-access";
import LockedOverlay from "./LockedOverlay";

interface BillingGateProps {
  children: React.ReactNode;
}

/**
 * Wraps dashboard children. Checks the current route against the user's
 * billing state and renders either the page or a locked overlay.
 */
export default function BillingGate({ children }: BillingGateProps) {
  const pathname = usePathname();
  const { hasPlan, activeModules, purchasedReportSlugs, isLoading } = useBillingContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const requirement = getRouteAccessRequirement(pathname);

  switch (requirement.type) {
    case "none":
      return <>{children}</>;

    case "plan":
      if (!hasPlan) return <LockedOverlay requirement={requirement} />;
      return <>{children}</>;

    case "module":
      if (!hasPlan) return <LockedOverlay requirement={{ type: "plan" }} />;
      if (!activeModules.includes(requirement.module)) return <LockedOverlay requirement={requirement} />;
      return <>{children}</>;

    case "report":
      if (!hasPlan) return <LockedOverlay requirement={{ type: "plan" }} />;
      if (!purchasedReportSlugs.includes(requirement.reportSlug)) return <LockedOverlay requirement={requirement} />;
      return <>{children}</>;

    default:
      return <>{children}</>;
  }
}
