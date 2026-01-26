import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, Sparkles } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-card p-6 overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-indigo-600/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-600/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 text-center space-y-8 max-w-lg mx-auto">
        {/* Animated 404 */}
        <div className="relative">
          <div className="text-[150px] font-black leading-none bg-gradient-to-b from-white via-zinc-400 to-zinc-600 bg-clip-text text-transparent select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-12 w-12 text-indigo-500 animate-pulse" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">
            Página no encontrada
          </h1>
          <p className="text-zinc-400 max-w-md mx-auto">
            Lo sentimos, la página que buscas no existe o ha sido movida.
            Verifica la URL o regresa al inicio.
          </p>
        </div>

        {/* Path info */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-zinc-800 text-zinc-500 text-sm">
          <Search className="h-4 w-4" />
          <code className="font-mono">{location.pathname}</code>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
          >
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Ir al inicio
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Link to="/business/home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Panel de admin
            </Link>
          </Button>
        </div>

        {/* Brand */}
        <div className="pt-8 flex items-center justify-center gap-2 text-zinc-600">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="font-semibold">PictureMe.Now</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
