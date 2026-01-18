interface EventTitleProps {
  eventName?: string;
  description?: string;
  brandName?: string;
  logoUrl?: string;
}

export function EventTitle({ eventName, description, brandName, logoUrl }: EventTitleProps) {
  // Use event name if provided, otherwise fall back to brand name
  const displayTitle = eventName || brandName || "AI Photo Booth";
  const displayDescription = description;

  if (!displayTitle && !logoUrl) return null;

  return (
    <div className="relative pt-4 pb-2 text-center pointer-events-none px-4 max-w-4xl mx-auto z-20">
      {logoUrl ? (
        // Show logo if available
        <img
          src={logoUrl}
          alt={displayTitle}
          className="h-10 sm:h-16 md:h-18 max-w-[180px] sm:max-w-[300px] mx-auto object-contain drop-shadow-lg"
        />
      ) : (
        // Fallback to text title
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
          {displayTitle}
        </h1>
      )}
      {displayDescription && (
        <p className="mt-2 text-xs sm:text-sm md:text-base text-muted-foreground max-w-[280px] sm:max-w-none mx-auto">
          {displayDescription}
        </p>
      )}
      <div className="mt-3 h-1 w-12 sm:w-16 md:w-20 mx-auto rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] opacity-90" />
    </div>
  );
}
