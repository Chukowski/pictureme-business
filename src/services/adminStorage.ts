export interface Template {
  id: string;
  name: string;
  description: string;
  images: string[]; // Background images
  elementImages?: string[]; // Element/prop images for mixing (Seedream, Imagen)
  prompt: string;
  active: boolean;
  includeBranding?: boolean;
  includeHeader?: boolean;
  includeTagline?: boolean;
  includeWatermark?: boolean;
  isCustomPrompt?: boolean;
  campaignText?: string; // Text overlay on the AI image (e.g., "Need extra hands?")
  
  // Pipeline Configuration
  pipelineConfig?: {
    imageModel?: string;
    groupImageModel?: string; // Separate model for group photos (optional)
    forceInstructions?: boolean;
    seed?: number;
    faceswapEnabled?: boolean;
    faceswapModel?: string;
    videoEnabled?: boolean;
    videoModel?: string;
    badgeEnabled?: boolean;
  };
  
  // Access & Monetization Overrides
  overrideEventSettings?: boolean;
  accessOverrides?: {
    leadCaptureRequired?: boolean;
    requirePayment?: boolean;
    hardWatermark?: boolean;
    disableDownloads?: boolean;
    allowFreePreview?: boolean;
  };
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
export const getDefaultTemplates = (): Template[] => [
  {
    id: crypto.randomUUID(),
    name: 'Particle Field',
    description: 'Tech innovation with particles',
    images: ['/backgrounds/glares.jpg', '/backgrounds/chevron_orange.png'],
    prompt: 'Create a professional corporate photo by seamlessly compositing these images: Preserve the exact person (face, body, pose) from the first image. Add the atmospheric golden glowing particles and dark technological background from the second image around and behind the person. Place the orange glowing chevron/arrow symbol from the third image in the person\'s hands at chest level. Dress the person in professional dark business attire (sweater or blazer). The person should be centered, confidently displaying the glowing chevron. Maintain photorealistic quality with cinematic lighting. Blend all elements naturally - the person should look like they are physically present in this particle-filled environment.',
    active: true,
    includeBranding: true,
    includeHeader: true,
  },
  {
    id: crypto.randomUUID(),
    name: 'Ocean Depths',
    description: 'Underwater exploration',
    images: ['/backgrounds/ocean.jpg'],
    prompt: 'Create a professional underwater scene by compositing these images: Preserve the exact person (face, body, pose) from the first image - do NOT cover their face with masks or goggles. Composite the majestic octopus with tentacles, turquoise underwater lighting, and bubbles from the second image around the person. Dress the person in a professional black diving suit with equipment and harness. Keep the person\'s face fully visible and natural - NO MASKS ON FACE. Position the person in the lower center with the large octopus tentacles surrounding them in the background. Blend everything naturally so the person appears to be actually underwater with the octopus. Dramatic turquoise professional underwater photography.',
    active: true,
    includeBranding: true,
    includeHeader: false,
    campaignText: 'Need extra hands?',
  },
  {
    id: crypto.randomUUID(),
    name: 'Jungle Explorer',
    description: 'Running with wildlife',
    images: ['/backgrounds/jungle.jpg'],
    prompt: 'Create a dynamic wildlife action scene by compositing these images: Preserve the exact person (face, body) from the first image. Add the majestic turquoise cheetah/leopard, particles, and dark teal jungle environment from the second image. Dress the person in safari/outdoor explorer outfit (beige/tan shirt and cargo pants) with backpack. Position the person running on the left side with the cheetah running beside them on the right - both should appear to be running together in the same scene. Blend all elements naturally so the person and cheetah look like they are actually running together through the jungle. Professional wildlife photography with dramatic turquoise atmospheric lighting.',
    active: true,
    includeBranding: true,
    includeHeader: false,
    campaignText: 'Run lean. Run fast.',
  },
  {
    id: crypto.randomUUID(),
    name: 'Rain Magic',
    description: 'Sustainable growth',
    images: ['/backgrounds/rain.jpg'],
    prompt: 'Create an environmental scene by compositing these images: Preserve the exact person (face, body) from the first image. Add the heavy rain, turquoise-tinted lighting, dark moody atmosphere, and water reflections from the second image around them. Dress the person in casual earth-tone clothing (olive/grey t-shirt and jeans). The person should be sitting cross-legged on wet ground, smiling while holding a small plant or seedling with glowing turquoise leaves growing from soil in their hands. Blend all elements naturally so the person appears to be sitting in the rain with the plant. Professional environmental photography with rain and dramatic turquoise lighting.',
    active: true,
    includeBranding: true,
    includeHeader: false,
    campaignText: 'Simply sustainable.',
  },
  {
    id: crypto.randomUUID(),
    name: 'Mystical Leaves',
    description: 'Lightening the load',
    images: ['/backgrounds/leafs.jpg'],
    prompt: 'Create a mystical nature scene by compositing these images: Preserve the exact person (face, body) from the first image. Add the glowing turquoise leaves with visible veins, small ant on leaf, bokeh effects, and dark mystical background from the second image. Dress the person in professional dark clothing (black jacket with white collar visible). The person should be centered with a calm expression, gently holding or presenting a glowing turquoise leaf with their gloved hands. Blend all elements naturally with floating particles and dramatic turquoise accent lighting. Professional photography with mystical atmosphere.',
    active: true,
    includeBranding: true,
    includeHeader: false,
    campaignText: 'Lighten the load.',
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
