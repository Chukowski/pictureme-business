import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "@/services/eventsApi";

interface BusinessOnlyProps {
  children: ReactNode;
}

/**
 * Route guard for business-only routes.
 * - Superadmin → redirected to /super-admin
 * - Non-business users → redirected to /auth (no creator routes in this app)
 */
export function BusinessOnly({ children }: BusinessOnlyProps) {
  const user = getCurrentUser();
  const isBusiness = user?.role?.startsWith("business") && user.role !== "business_pending";

  // js-early-exit: handle special cases first
  if (user?.role === 'superadmin') {
    return <Navigate to="/super-admin" replace />;
  }

  if (!isBusiness) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
