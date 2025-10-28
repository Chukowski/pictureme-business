export interface Template {
  id: string;
  name: string;
  description: string;
  images: string[]; // Array of image URLs/base64
  prompt: string;
  active: boolean;
  includeBranding?: boolean;
  includeHeader?: boolean;
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
  themeMode?: 'light' | 'dark';
  userProfile?: {
    name: string;
    role?: string;
    avatarUrl?: string;
  };
  watermark?: {
    imageUrl?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    text?: string;
  };
  aiModel: string;
  enableVideoGeneration?: boolean;
  videoModel?: string;
  enableVideoRecording?: boolean;
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
    themeMode: event.themeMode || 'light',
  }));
};

export const getEvent = (id: string): EventConfig | null => {
  const events = getEvents();
  return events.find(e => e.id === id) || null;
};

export const createEvent = (event: Omit<EventConfig, 'id' | 'createdAt' | 'updatedAt'>): EventConfig => {
  const newEvent: EventConfig = {
    ...event,
    themeMode: event.themeMode || 'light',
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
    description: 'Tech innovation with particles',
    images: ['/src/assets/backgrounds/glares.jpg', '/src/assets/backgrounds/chevron_orange.png'],
    prompt: 'Take the person from the first image and place them into the second image background with the glowing golden particles and dark atmosphere. Keep the person\'s face and body exactly as they appear in the first photo without any modifications to their facial features. Use all the visual elements from the second image: the golden glowing particles, the dark background, and the technological atmosphere. The person should be holding the orange glowing chevron/arrow symbol from the third image in their hands at chest level. Dress the person in professional business attire (dark sweater or business casual). The person should be centered looking at camera with confident expression, proudly displaying the glowing orange chevron symbol. The chevron should appear to be floating or held by the person with a subtle glow effect. Cinematic lighting with warm golden particle effects creating depth. Professional corporate photography style.',
    active: true,
    includeBranding: true,
    includeHeader: true,
  },
  {
    id: crypto.randomUUID(),
    name: 'Ocean Depths',
    description: 'Underwater exploration',
    images: ['/src/assets/backgrounds/ocean.jpg'],
    prompt: 'Take the person from the first image and place them into the second image background. Keep the person\'s face and body exactly as they appear in the first photo without any modifications to their facial features. Do not cover their face with masks, goggles, or breathing apparatus—keep the face fully visible and natural. Use all the visual elements from the second image: the octopus with tentacles, the bubbles, the turquoise underwater lighting, and the deep ocean atmosphere. Dress the person in professional black diving suit with equipment, harness and gear. The person should be positioned in the lower center area looking at camera with the large octopus tentacles surrounding them in the background. Professional underwater photography with dramatic turquoise lighting. Campaign text: "Need extra hands?"',
    active: true,
    includeBranding: true,
    includeHeader: false,
  },
  {
    id: crypto.randomUUID(),
    name: 'Jungle Explorer',
    description: 'Running with wildlife',
    images: ['/src/assets/backgrounds/jungle.jpg'],
    prompt: 'Take the person from the first image and place them into the second image background. Keep the person\'s face and body exactly as they appear in the first photo without any modifications to their facial features. Use all the visual elements from the second image: the majestic turquoise cheetah/leopard running, the particles, and the dark teal jungle environment. Dress the person in safari/outdoor explorer outfit (beige/tan shirt and cargo pants) with backpack. The person should be running or in dynamic motion pose on the left side, with the cheetah running beside them on the right. Both should appear to be running together. Professional wildlife photography with dramatic turquoise atmospheric lighting. Campaign text: "Run lean. Run fast."',
    active: true,
    includeBranding: true,
    includeHeader: false,
  },
  {
    id: crypto.randomUUID(),
    name: 'Rain Magic',
    description: 'Sustainable growth',
    images: ['/src/assets/backgrounds/rain.jpg'],
    prompt: 'Take the person from the first image and place them into the second image background. Keep the person\'s face and body exactly as they appear in the first photo without any modifications to their facial features. Use all the visual elements from the second image: the rain falling heavily, the turquoise-tinted lighting, and the dark moody atmosphere with water reflections on ground. Dress the person in casual earth-tone clothing (olive/grey t-shirt and jeans). The person should be sitting cross-legged on the wet ground, smiling at camera while holding a small plant or seedling with glowing turquoise leaves growing from soil in their hands. Professional environmental photography with rain and dramatic turquoise lighting. Campaign text: "Simply sustainable."',
    active: true,
    includeBranding: true,
    includeHeader: false,
  },
  {
    id: crypto.randomUUID(),
    name: 'Mystical Leaves',
    description: 'Lightening the load',
    images: ['/src/assets/backgrounds/leafs.jpg'],
    prompt: 'Take the person from the first image and place them into the second image background. Keep the person\'s face and body exactly as they appear in the first photo without any modifications to their facial features. Use all the visual elements from the second image: the glowing turquoise leaves with visible leaf veins, the small ant on leaf, the bokeh effects, and the dark mystical background. Dress the person in professional dark clothing (black jacket or professional attire with white collar visible). The person should be centered looking at camera with calm expression while gently holding or presenting a glowing turquoise leaf with their gloved hands. Professional photography with dramatic turquoise accent lighting and floating particles. Campaign text: "Lighten the load."',
    active: true,
    includeBranding: true,
    includeHeader: false,
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
