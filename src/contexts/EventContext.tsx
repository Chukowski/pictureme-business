import React, { createContext, useContext, ReactNode } from 'react';
import { EventConfig } from '@/services/eventsApi';

interface EventContextType {
  config: EventConfig | null;
  userSlug: string;
  eventSlug: string;
  loading: boolean;
  error: string | null;
}

const EventContext = createContext<EventContextType | null>(null);

interface EventProviderProps {
  children: ReactNode;
  config: EventConfig | null;
  userSlug: string;
  eventSlug: string;
  loading?: boolean;
  error?: string | null;
}

export const EventProvider: React.FC<EventProviderProps> = ({ 
  children, 
  config, 
  userSlug, 
  eventSlug,
  loading = false,
  error = null
}) => {
  return (
    <EventContext.Provider value={{ config, userSlug, eventSlug, loading, error }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEventContext = () => {
  const context = useContext(EventContext);
  return context;
};

export default EventContext;

