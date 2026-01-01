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
    <div className="relative pt-6 pb-2 text-center pointer-events-none px-4 max-w-4xl mx-auto z-20">
      {logoUrl ? (
        // Show logo if available
        <img
          src={logoUrl}
          alt={displayTitle}
          className="h-16 md:h-24 max-w-[300px] md:max-w-[400px] mx-auto object-contain drop-shadow-lg"
        />
      ) : (
        // Fallback to text title
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
          {displayTitle}
        </h1>
      )}
      {displayDescription && (
        <p className="mt-2 text-sm md:text-base text-muted-foreground">
          {displayDescription}
        </p>
      )}
      <div className="mt-3 h-1.5 w-16 md:w-20 mx-auto rounded-full gradient-primary opacity-80" />
    </div>
  );
}
