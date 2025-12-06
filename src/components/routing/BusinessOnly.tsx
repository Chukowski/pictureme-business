import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "@/services/eventsApi";

interface BusinessOnlyProps {
  children: ReactNode;
}

export function BusinessOnly({ children }: BusinessOnlyProps) {
  const user = getCurrentUser();
  const isBusiness = user?.role?.startsWith("business") && user.role !== "business_pending";

  if (!isBusiness) {
    return <Navigate to="/creator/dashboard" replace />;
  }

  return <>{children}</>;
}
