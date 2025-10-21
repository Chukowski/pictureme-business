import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-dark p-6">
      <div className="text-center space-y-6">
        <div className="text-6xl">🧭</div>
        <h1 className="text-4xl font-bold">404 - Not Found</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Button asChild size="lg">
          <Link to="/">Go back home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
