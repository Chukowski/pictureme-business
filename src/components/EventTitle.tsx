interface EventTitleProps {
  eventName?: string;
  description?: string;
  brandName?: string;
}

export function EventTitle({ eventName, description, brandName }: EventTitleProps) {
  // Use event name if provided, otherwise fall back to brand name
  const displayTitle = eventName || brandName || "AI Photo Booth";
  const displayDescription = description;

  if (!displayTitle) return null;

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none px-4 max-w-4xl">
      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
        {displayTitle}
      </h1>
      {displayDescription && (
        <p className="mt-2 text-sm md:text-base text-muted-foreground">
          {displayDescription}
        </p>
      )}
      <div className="mt-3 h-1.5 w-16 md:w-20 mx-auto rounded-full gradient-primary opacity-80" />
    </div>
  );
}
