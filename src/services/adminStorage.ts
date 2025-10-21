export interface EventConfig {
  id: string;
  name: string;
  slug: string;
  templateIds: string[];
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

export interface Template {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  prompt: string;
  active: boolean;
  createdAt: string;
}

const ADMIN_PASSWORD = 'photobooth2025'; // Simple password protection
const STORAGE_KEYS = {
  EVENTS: 'pb_events',
  TEMPLATES: 'pb_templates',
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
  return data ? JSON.parse(data) : [];
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

// Templates
export const getTemplates = (): Template[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
  if (data) return JSON.parse(data);
  
  // Initialize with default templates
  const defaults: Template[] = [
    {
      id: '1',
      name: 'Particle Field',
      description: 'Immersive glowing particles',
      imageUrl: '/src/assets/backgrounds/glares.jpg',
      prompt: 'photorealistic portrait with glowing particle field background, cinematic lighting',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Ocean Waves',
      description: 'Serene ocean backdrop',
      imageUrl: '/src/assets/backgrounds/ocean.jpg',
      prompt: 'professional portrait with ocean waves background, natural lighting',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Jungle Vibes',
      description: 'Tropical rainforest',
      imageUrl: '/src/assets/backgrounds/jungle.jpg',
      prompt: 'vibrant portrait with tropical jungle background, natural atmosphere',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Rain Effect',
      description: 'Dramatic rain backdrop',
      imageUrl: '/src/assets/backgrounds/rain.jpg',
      prompt: 'cinematic portrait with rain and bokeh lights background',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Autumn Leaves',
      description: 'Warm fall colors',
      imageUrl: '/src/assets/backgrounds/leafs.jpg',
      prompt: 'warm portrait with autumn leaves background, golden hour lighting',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(defaults));
  return defaults;
};

export const createTemplate = (template: Omit<Template, 'id' | 'createdAt'>): Template => {
  const newTemplate: Template = {
    ...template,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const templates = getTemplates();
  templates.push(newTemplate);
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  return newTemplate;
};

export const updateTemplate = (id: string, updates: Partial<Template>): Template | null => {
  const templates = getTemplates();
  const index = templates.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  templates[index] = { ...templates[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  return templates[index];
};

export const deleteTemplate = (id: string): boolean => {
  const templates = getTemplates();
  const filtered = templates.filter(t => t.id !== id);
  if (filtered.length === templates.length) return false;
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(filtered));
  return true;
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
