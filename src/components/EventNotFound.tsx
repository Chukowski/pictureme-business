import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, Home, ArrowLeft, AlertCircle, Sparkles } from "lucide-react";

interface EventNotFoundProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  eventSlug?: string;
}

export function EventNotFound({ 
  title = "Evento no encontrado",
  message = "Este evento no existe o ya no está activo.",
  showHomeButton = true,
  eventSlug
}: EventNotFoundProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="relative mx-auto w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-zinc-900 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">
            {title}
          </h1>
          <p className="text-zinc-400 text-lg">
            {message}
          </p>
        </div>

        {/* Event slug if provided */}
        {eventSlug && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-sm">
            <Camera className="h-4 w-4" />
            <code className="font-mono">{eventSlug}</code>
          </div>
        )}

        {/* Actions */}
        {showHomeButton && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
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
              onClick={() => window.history.back()}
            >
              <span>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </span>
            </Button>
          </div>
        )}

        {/* Brand */}
        <div className="pt-6 flex items-center justify-center gap-2 text-zinc-600">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="font-semibold">PictureMe.Now</span>
        </div>
      </div>
    </div>
  );
}

export function FeedNotAvailable() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="relative mx-auto w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
          <div className="absolute inset-2 rounded-full bg-zinc-900 flex items-center justify-center">
            <Camera className="w-12 h-12 text-indigo-400" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">
            Feed no disponible
          </h1>
          <p className="text-zinc-400 text-lg">
            El feed de fotos en vivo no está habilitado para este evento.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button 
            variant="outline" 
            size="lg"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>

        {/* Brand */}
        <div className="pt-6 flex items-center justify-center gap-2 text-zinc-600">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="font-semibold">PictureMe.Now</span>
        </div>
      </div>
    </div>
  );
}

export function PhotoNotFound({ 
  shareCode 
}: { 
  shareCode?: string 
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="relative mx-auto w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-zinc-900 flex items-center justify-center">
            <Camera className="w-12 h-12 text-amber-400" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">
            Foto no encontrada
          </h1>
          <p className="text-zinc-400 text-lg">
            Esta foto puede haber sido eliminada o el enlace es incorrecto.
          </p>
        </div>

        {/* Share code if provided */}
        {shareCode && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-6 py-4">
            <p className="text-sm text-zinc-500 mb-1">Código de compartir:</p>
            <p className="font-mono font-bold text-white text-xl">{shareCode}</p>
          </div>
        )}

        {/* Brand */}
        <div className="pt-6 space-y-2">
          <div className="flex items-center justify-center gap-2 text-zinc-500">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold">PictureMe.Now</span>
          </div>
          <p className="text-xs text-zinc-600">
            Experiencias de marca impulsadas por inteligencia artificial.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EventNotFound;

