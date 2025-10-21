export interface Template {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  prompt: string;
  active: boolean;
}

export interface EventConfig {
  id: string;
  name: string;
  slug: string;
  templates: Template[];
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  brandName: string;
  tagline?: string;
  watermark?: {
    imageUrl?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    text?: string;
  };
  aiModel: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const ADMIN_PASSWORD = 'photobooth2025';
const STORAGE_KEYS = {
  EVENTS: 'pb_events',
  CURRENT_EVENT: 'pb_current_event',
  ADMIN_AUTH: 'pb_admin_auth',
};

// Auth
export const adminLogin = (password: string): boolean => {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
    return true;
  }
  return false;
};

export const adminLogout = () => {
  localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
};

export const isAdminAuthenticated = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
};

// Events
export const getEvents = (): EventConfig[] => {
  const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
  if (!data) return [];
  
  const events = JSON.parse(data);
  // Migrate old events that don't have templates array
  return events.map((event: any) => ({
    ...event,
    templates: event.templates || [],
  }));
};

export const getEvent = (id: string): EventConfig | null => {
  const events = getEvents();
  return events.find(e => e.id === id) || null;
};

export const createEvent = (event: Omit<EventConfig, 'id' | 'createdAt' | 'updatedAt'>): EventConfig => {
  const newEvent: EventConfig = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const events = getEvents();
  events.push(newEvent);
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  return newEvent;
};

export const updateEvent = (id: string, updates: Partial<EventConfig>): EventConfig | null => {
  const events = getEvents();
  const index = events.findIndex(e => e.id === id);
  if (index === -1) return null;
  
  events[index] = {
    ...events[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  return events[index];
};

export const deleteEvent = (id: string): boolean => {
  const events = getEvents();
  const filtered = events.filter(e => e.id !== id);
  if (filtered.length === events.length) return false;
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(filtered));
  return true;
};

// Template Management for Events
const getDefaultTemplates = (): Template[] => [
  {
    id: crypto.randomUUID(),
    name: 'Particle Field',
    description: 'Immersive glowing particles',
    imageUrl: '/src/assets/backgrounds/glares.jpg',
    prompt: 'photorealistic portrait with glowing particle field background, cinematic lighting',
    active: true,
  },
  {
    id: crypto.randomUUID(),
    name: 'Ocean Waves',
    description: 'Serene ocean backdrop',
    imageUrl: '/src/assets/backgrounds/ocean.jpg',
    prompt: 'professional portrait with ocean waves background, natural lighting',
    active: true,
  },
  {
    id: crypto.randomUUID(),
    name: 'Jungle Vibes',
    description: 'Tropical rainforest',
    imageUrl: '/src/assets/backgrounds/jungle.jpg',
    prompt: 'vibrant portrait with tropical jungle background, natural atmosphere',
    active: true,
  },
  {
    id: crypto.randomUUID(),
    name: 'Rain Effect',
    description: 'Dramatic rain backdrop',
    imageUrl: '/src/assets/backgrounds/rain.jpg',
    prompt: 'cinematic portrait with rain and bokeh lights background',
    active: true,
  },
  {
    id: crypto.randomUUID(),
    name: 'Autumn Leaves',
    description: 'Warm fall colors',
    imageUrl: '/src/assets/backgrounds/leafs.jpg',
    prompt: 'warm portrait with autumn leaves background, golden hour lighting',
    active: true,
  },
];

export const addTemplateToEvent = (eventId: string, template: Omit<Template, 'id'>): EventConfig | null => {
  const events = getEvents();
  const index = events.findIndex(e => e.id === eventId);
  if (index === -1) return null;
  
  const newTemplate: Template = {
    ...template,
    id: crypto.randomUUID(),
  };
  
  events[index].templates.push(newTemplate);
  events[index].updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  return events[index];
};

export const updateEventTemplate = (eventId: string, templateId: string, updates: Partial<Template>): EventConfig | null => {
  const events = getEvents();
  const eventIndex = events.findIndex(e => e.id === eventId);
  if (eventIndex === -1) return null;
  
  const templateIndex = events[eventIndex].templates.findIndex(t => t.id === templateId);
  if (templateIndex === -1) return null;
  
  events[eventIndex].templates[templateIndex] = {
    ...events[eventIndex].templates[templateIndex],
    ...updates,
  };
  events[eventIndex].updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  return events[eventIndex];
};

export const deleteEventTemplate = (eventId: string, templateId: string): EventConfig | null => {
  const events = getEvents();
  const index = events.findIndex(e => e.id === eventId);
  if (index === -1) return null;
  
  events[index].templates = events[index].templates.filter(t => t.id !== templateId);
  events[index].updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  return events[index];
};

// Current Event
export const getCurrentEvent = (): EventConfig | null => {
  const id = localStorage.getItem(STORAGE_KEYS.CURRENT_EVENT);
  return id ? getEvent(id) : null;
};

export const setCurrentEvent = (eventId: string | null) => {
  if (eventId) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_EVENT, eventId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_EVENT);
  }
};
