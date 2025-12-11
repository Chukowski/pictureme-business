import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  createEvent,
  updateEvent,
  getUserEvents,
  getCurrentUser,
  type Template,
  type AlbumStation,
  type AspectRatio,
} from "@/services/eventsApi";
import { DEFAULT_BADGE_CONFIG, BadgeTemplateConfig } from "@/components/templates/BadgeTemplateEditor";
import { EventEditorLayout } from "@/components/admin/event-editor/EventEditorLayout";
import { EventSetup } from "@/components/admin/event-editor/EventSetup";
import { EventDesign } from "@/components/admin/event-editor/EventDesign";
import { EventTemplates } from "@/components/admin/event-editor/EventTemplates";
import { EventSettings } from "@/components/admin/event-editor/EventSettings";
import { EventWorkflow } from "@/components/admin/event-editor/EventWorkflow";
import { LivePreview } from "@/components/admin/event-editor/LivePreview";
import { EventFormData } from "@/components/admin/event-editor/types";

export default function AdminEventForm() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEdit = Boolean(eventId);

  const currentUser = useMemo(() => getCurrentUser(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Navigation State
  const [currentStep, setCurrentStep] = useState(searchParams.get('step') || 'setup');
  
  // Update URL when step changes
  useEffect(() => {
    if (currentStep) {
      setSearchParams(params => {
        params.set('step', currentStep);
        return params;
      });
    }
  }, [currentStep, setSearchParams]);

  const [previewMode, setPreviewMode] = useState<'event' | 'badge' | 'template'>('event');

  // Event mode types
  type EventMode = 'free' | 'lead_capture' | 'pay_per_photo' | 'pay_per_album';
  type ThemePreset = 'classic_dark' | 'clean_light' | 'neon_party' | 'corporate' | 'kids_fun' | 'holiday' | 'custom';

  // Form state
  const [formData, setFormData] = useState<EventFormData>({
    slug: "",
    title: "",
    description: "",
    is_active: true,
    start_date: "",
    end_date: "",
    
    // Event Mode & Rules
    eventMode: "free",
    rules: {
      leadCaptureEnabled: false,
      requirePaymentBeforeDownload: false,
      allowFreePreview: true,
      staffOnlyMode: false,
      enableQRToPayment: false,
      useStripeCodeForPayment: false,
      feedEnabled: true,
      hardWatermarkOnPreviews: false,
      allowPrintStation: false,
      allowTimelineSplitView: false,
      enableBadgeCreator: false,
      blurOnUnpaidGallery: true, // Default: blur unpaid photos in gallery
      showPaymentCardOnSharedAlbum: true, // Default: show payment card on shared album
    },
    
    // Theme & Branding
    theme: {
      preset: "classic_dark" as ThemePreset,
      brandName: "Akitá",
      primaryColor: "#6366F1", // Indigo
      secondaryColor: "#F59E0B", // Amber
      accentColor: "#10B981", // Emerald
      tagline: "AI-powered photo experiences",
      mode: "dark",
      cardRadius: "xl",
      buttonStyle: "solid",
    },
    branding: {
      logoPath: "",
      footerPath: "",
      sponsorLogos: [],
      headerBackgroundColor: "#FFFFFF",
      footerBackgroundColor: "#000000",
      taglineText: "",
      showLogoInBooth: true,
      showLogoInFeed: true,
      showSponsorStrip: false,
      includeLogoOnPrints: true,
      watermark: {
        enabled: false,
        type: "image",
        imageUrl: "",
        text: "",
        position: "bottom-right",
        size: 15,
        opacity: 0.7,
        pattern: "step_repeat",
      },
    },
    
    // Badge Creator settings (legacy)
    badgeCreator: {
      enabled: false,
      mode: "simple",
      templateId: "",
      layout: "portrait",
      includeQR: false,
      fields: {
        showName: true,
        showDate: true,
        showEventName: true,
        customField1: "",
        customField2: "",
      },
    },
    
    // New Badge Template
    badgeTemplate: { ...DEFAULT_BADGE_CONFIG } as BadgeTemplateConfig,
    
    // Sharing settings
    sharing: {
      emailEnabled: true,
      whatsappEnabled: false,
      smsEnabled: false,
      emailTemplate: "",
      emailAfterBuy: true,
      groupPhotosIntoAlbums: false,
    },
    
    // Album Tracking
    albumTracking: {
      enabled: false,
      albumType: "individual",
      stations: [] as AlbumStation[],
      rules: {
        maxPhotosPerAlbum: 5,
        allowReEntry: false,
        requireStaffApproval: false,
        printReady: false,
      },
      badgeIntegration: {
        autoGenerateBadge: false,
        badgeLayout: "portrait",
        includeQR: true,
        includeName: true,
        includeDateTime: true,
        customFields: [],
      },
    },
    
    // Sharing Overrides
    sharingOverrides: {
      enabled: false,
      defaultAspectRatio: "auto" as AspectRatio,
      availableRatios: ["1:1", "4:5", "9:16", "16:9"],
      shareTemplateId: "",
    },
    
    // Legacy settings
    settings: {
      aiModel: "nano-banana",
      imageSize: { width: 1080, height: 1920 },
      feedEnabled: true,
      moderationEnabled: false,
      maxPhotosPerSession: 5,
      staffAccessCode: "",
    },
    templates: [] as Template[],
  } as EventFormData);

  useEffect(() => {
    if (!currentUser) {
      navigate("/admin/auth");
      return;
    }

    if (isEdit && eventId) {
      loadEvent();
    }
  }, [currentUser, isEdit, eventId, navigate]);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      const events = await getUserEvents();
      const event = events.find((e) => e._id === eventId);

      if (!event) {
        toast.error("Event not found");
        navigate("/admin/events");
        return;
      }

      // Map event data to form (ensuring all fields exist)
      // We perform a deep merge to ensure new schema fields (like albumTracking rules)
      // are properly initialized with defaults if missing in the DB object.
      console.log('📋 Loading event from DB:', {
        id: event._id,
        title: event.title,
        templates: event.templates?.length,
        templateModels: event.templates?.map((t: any) => ({ name: t.name, model: t.pipelineConfig?.imageModel })),
        settings: event.settings,
        theme: event.theme,
      });
      
      setFormData((prev) => {
        const safeEvent = event as any;
        return {
          ...prev,
          ...event,
          
          // Keep templates exactly as they come from DB (preserve all fields)
          templates: safeEvent.templates || prev.templates,
          
          // Explicitly handle eventMode (camelCase vs snake_case check)
          eventMode: safeEvent.eventMode || safeEvent.event_mode || prev.eventMode,

          // Deep merge Settings first as it might contain rules/sharing
          settings: { 
            ...prev.settings, 
            ...(safeEvent.settings || {}) 
          },

          // Restore rules and sharing from settings if available (for persistence)
          // Check settings.rules first, then root rules
          rules: {
            ...prev.rules,
            ...(safeEvent.rules || {}),
            ...(safeEvent.settings?.rules || {})
          },
          sharing: {
            ...prev.sharing,
            ...(safeEvent.sharing || {}),
            ...(safeEvent.settings?.sharing || {})
          },

          // Deep merge Theme
          theme: { 
            ...prev.theme, 
            ...(safeEvent.theme || {}) 
          },

          // Deep merge Branding
          branding: { 
            ...prev.branding, 
            ...(safeEvent.branding || {}),
            watermark: {
              ...prev.branding?.watermark,
              ...(safeEvent.branding?.watermark || {})
            }
          },

          // Deep merge Badge Template
          badgeTemplate: {
            ...prev.badgeTemplate,
            ...(safeEvent.badgeTemplate || {}),
            // Deep merge sub-objects if necessary (e.g. fields)
            fields: {
              ...prev.badgeTemplate.fields,
              ...(safeEvent.badgeTemplate?.fields || {})
            }
          },

          // Deep merge Album Tracking (Critical for legacy events)
          albumTracking: {
            ...prev.albumTracking,
            ...(safeEvent.albumTracking || {}),
            rules: {
              ...prev.albumTracking?.rules,
              ...(safeEvent.albumTracking?.rules || {})
            },
            badgeIntegration: {
              ...prev.albumTracking?.badgeIntegration,
              ...(safeEvent.albumTracking?.badgeIntegration || {})
            },
            // Ensure array exists
            stations: safeEvent.albumTracking?.stations || prev.albumTracking.stations
          },
        } as EventFormData;
      });
    } catch (error) {
      toast.error("Failed to load event");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.slug || !formData.title) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      
      // Prepare data for API
      // Persist rules and sharing inside settings as expected by backend
      const dataToSave = {
        ...formData,
        settings: {
          ...(formData.settings || {}),
          rules: formData.rules,
          sharing: formData.sharing,
        },
        // Ensure dates are ISO strings if needed, or keep as string
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      };

      if (isEdit && eventId) {
        await updateEvent(eventId, dataToSave);
        toast.success("Event updated successfully");
      } else {
        const newEvent = await createEvent(dataToSave);
        toast.success("Event created successfully");
        navigate(`/admin/events/${newEvent._id}/edit`);
      }
    } catch (error) {
      toast.error("Failed to save event");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <EventEditorLayout
      title={formData.title}
      onTitleChange={(title) => setFormData({ ...formData, title })}
      status={formData.is_active ? 'active' : 'draft'}
      onStatusChange={(status) => setFormData({ ...formData, is_active: status === 'active' })}
      onSave={handleSubmit}
      isSaving={isSaving}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      preview={
        <LivePreview 
          formData={formData} 
          currentStep={currentStep}
          previewMode={previewMode}
          onBadgeChange={(config) => setFormData(prev => ({ ...prev, badgeTemplate: config }))}
        />
      }
    >
      {currentStep === 'setup' && (
        <EventSetup 
          formData={formData} 
          setFormData={setFormData} 
          currentUser={currentUser}
          isEdit={isEdit}
        />
      )}
      
      {currentStep === 'design' && (
        <EventDesign 
          formData={formData} 
          setFormData={setFormData} 
        />
      )}
      
      {currentStep === 'experience' && (
        <EventTemplates 
          formData={formData} 
          setFormData={setFormData}
          currentUser={currentUser}
          onPreviewModeChange={setPreviewMode}
        />
      )}

      {currentStep === 'workflow' && (
        <EventWorkflow 
          formData={formData} 
          setFormData={setFormData} 
        />
      )}
      
      {currentStep === 'settings' && (
        <EventSettings 
          formData={formData} 
          setFormData={setFormData} 
        />
      )}
    </EventEditorLayout>
  );
}
