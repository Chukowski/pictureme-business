import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "@/services/eventsApi";

interface CreatorOnlyProps {
  children: ReactNode;
}

export function CreatorOnly({ children }: CreatorOnlyProps) {
  const user = getCurrentUser();
  // If user is business, redirect to business dashboard
  const isBusiness = user?.role?.startsWith("business") && user.role !== "business_pending";

  if (isBusiness) {
    return <Navigate to="/admin/home" replace />;
  }

  return <>{children}</>;
}

