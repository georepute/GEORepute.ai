"use client";

import { Lock, CreditCard, Package, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AccessRequirement } from "@/lib/billing/route-access";

interface LockedOverlayProps {
  requirement: AccessRequirement;
}

export default function LockedOverlay({ requirement }: LockedOverlayProps) {
  if (requirement.type === "none") return null;

  let icon = CreditCard;
  let title = "Subscription Required";
  let description = "You need an active plan to access this feature. Choose a plan to get started.";
  let cta = "Choose a Plan";
  let href = "/dashboard/select-plan";
  let bgClass = "bg-blue-100";
  let iconClass = "text-blue-600";
  let btnClass = "bg-blue-600 hover:bg-blue-700";

  if (requirement.type === "module") {
    icon = Package;
    title = "Module Required";
    description = `This feature requires the "${requirement.label}" module. Subscribe to unlock it.`;
    cta = "Browse Modules";
    href = "/dashboard/modules";
    bgClass = "bg-purple-100";
    iconClass = "text-purple-600";
    btnClass = "bg-purple-600 hover:bg-purple-700";
  } else if (requirement.type === "report") {
    icon = FileText;
    title = "Report Purchase Required";
    description = `This page requires the "${requirement.label}". Purchase it to unlock full access.`;
    cta = "Purchase Reports";
    href = "/dashboard/billing";
  }

  const Icon = icon;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className={`w-20 h-20 mx-auto rounded-2xl ${bgClass} flex items-center justify-center`}>
          <Lock className={`w-10 h-10 ${iconClass}`} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>

        <Link
          href={href}
          className={`inline-flex items-center gap-2 px-6 py-3 ${btnClass} text-white rounded-xl font-semibold transition-colors`}
        >
          <Icon className="w-5 h-5" />
          {cta}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
