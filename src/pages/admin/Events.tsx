import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEvents, createEvent, updateEvent, deleteEvent, adminLogout, setCurrentEvent, addTemplateToEvent, updateEventTemplate, deleteEventTemplate, type EventConfig, type Template } from '@/services/adminStorage';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Power, Save, X, Upload } from 'lucide-react';

export default function AdminEvents() {
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventConfig | null>(null);
  const [editForm, setEditForm] = useState<Partial<EventConfig>>({});
  const [newTemplate, setNewTemplate] = useState<Partial<Template>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setEvents(getEvents());
  }, []);

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  const handleCreateEvent = () => {
    const newEvent = createEvent({
      name: 'New Event',
      slug: 'new-event',
      templates: [],
      primaryColor: '#4F46E5',
      secondaryColor: '#EC4899',
      brandName: 'Photo Booth',
      aiModel: 'fal-ai/bytedance/seedream/v4/edit',
      active: true,
    });
    setEvents(getEvents());
    setSelectedEvent(newEvent);
    setEditForm(newEvent);
    toast({ title: 'Event created' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setNewTemplate(prev => ({
          ...prev,
          images: [...(prev.images || []), base64]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setNewTemplate(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddTemplate = () => {
    if (!selectedEvent) return;
    if (!newTemplate.name || !newTemplate.images?.length || !newTemplate.prompt) {
      toast({ title: 'Fill all template fields and add at least one image', variant: 'destructive' });
      return;
    }
    
    addTemplateToEvent(selectedEvent.id, {
      name: newTemplate.name,
      description: newTemplate.description || '',
      images: newTemplate.images,
      prompt: newTemplate.prompt,
      active: true,
    });
    
    const updated = getEvents();
    setEvents(updated);
    setSelectedEvent(updated.find(e => e.id === selectedEvent.id) || null);
    setNewTemplate({});
    toast({ title: 'Template added' });
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (!selectedEvent) return;
    deleteEventTemplate(selectedEvent.id, templateId);
    const updated = getEvents();
    setEvents(updated);
    setSelectedEvent(updated.find(e => e.id === selectedEvent.id) || null);
    toast({ title: 'Template deleted' });
  };

  const handleSaveEvent = () => {
    if (!selectedEvent || !editForm) return;
    updateEvent(selectedEvent.id, editForm);
    setEvents(getEvents());
    toast({ title: 'Event saved' });
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('Delete this event?')) {
      deleteEvent(id);
      setEvents(getEvents());
      setSelectedEvent(null);
      setEditForm({});
      toast({ title: 'Event deleted' });
    }
  };

  const handleActivateEvent = (event: EventConfig) => {
    setCurrentEvent(event.id);
    toast({ 
      title: 'Event activated', 
      description: `${event.name} is now the active event` 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              View App
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <Power className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Events</h2>
              <Button onClick={handleCreateEvent}>
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-4 lg:col-span-1">
                <h3 className="font-semibold mb-4">Event List</h3>
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedEvent?.id === event.id
                          ? 'border-brand-primary bg-brand-primary/10'
                          : 'border-border hover:border-brand-primary/50'
                      }`}
                      onClick={() => {
                        setSelectedEvent(event);
                        setEditForm(event);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{event.name}</p>
                          <p className="text-xs text-muted-foreground">{event.slug}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActivateEvent(event);
                            }}
                          >
                            <Power className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {selectedEvent && (
                <Card className="p-6 lg:col-span-2">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold">Edit Event</h3>
                    <Button onClick={handleSaveEvent}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Event Name</Label>
                      <Input
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Slug</Label>
                      <Input
                        value={editForm.slug || ''}
                        onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Brand Name</Label>
                      <Input
                        value={editForm.brandName || ''}
                        onChange={(e) => setEditForm({ ...editForm, brandName: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Tagline</Label>
                      <Input
                        value={editForm.tagline || ''}
                        onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Primary Color</Label>
                        <Input
                          type="color"
                          value={editForm.primaryColor || '#4F46E5'}
                          onChange={(e) => setEditForm({ ...editForm, primaryColor: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Secondary Color</Label>
                        <Input
                          type="color"
                          value={editForm.secondaryColor || '#EC4899'}
                          onChange={(e) => setEditForm({ ...editForm, secondaryColor: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>AI Model</Label>
                      <select
                        className="w-full p-2 rounded-lg border border-border bg-background"
                        value={editForm.aiModel || 'fal-ai/bytedance/seedream/v4/edit'}
                        onChange={(e) => setEditForm({ ...editForm, aiModel: e.target.value })}
                      >
                        <option value="fal-ai/bytedance/seedream/v4/edit">Seedream v4 Edit</option>
                        <option value="fal-ai/gemini-25-flash-image/edit">Gemini Flash Image Edit</option>
                      </select>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="templates">
            {!selectedEvent ? (
              <Card className="p-6">
                <p className="text-muted-foreground">Select an event to manage its templates</p>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Add Template to {selectedEvent.name}</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Template Name</Label>
                      <Input
                        value={newTemplate.name || ''}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="e.g., Ocean Sunset"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={newTemplate.description || ''}
                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        placeholder="Short description"
                      />
                    </div>
                    <div>
                      <Label>Upload Images</Label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="cursor-pointer"
                          />
                          <Upload className="w-5 h-5 text-muted-foreground" />
                        </div>
                        {newTemplate.images && newTemplate.images.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {newTemplate.images.map((img, idx) => (
                              <div key={idx} className="relative group">
                                <img 
                                  src={img} 
                                  alt={`Preview ${idx + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border"
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveImage(idx)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>AI Prompt</Label>
                      <Input
                        value={newTemplate.prompt || ''}
                        onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
                        placeholder="professional portrait with ocean background, natural lighting"
                      />
                    </div>
                    <Button onClick={handleAddTemplate}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Template
                    </Button>
                  </div>
                </Card>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Templates for {selectedEvent.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(selectedEvent.templates || []).map((template) => (
                      <Card key={template.id} className="p-4">
                        {template.images && template.images.length > 0 && (
                          <div className="mb-3">
                            {template.images.length === 1 ? (
                              <img
                                src={template.images[0]}
                                alt={template.name}
                                className="w-full h-40 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="grid grid-cols-2 gap-1">
                                {template.images.slice(0, 4).map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`${template.name} ${idx + 1}`}
                                    className="w-full h-20 object-cover rounded"
                                  />
                                ))}
                                {template.images.length > 4 && (
                                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                    +{template.images.length - 4} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {template.images?.length || 0} image(s)
                        </p>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </Card>
                    ))}
                    {(!selectedEvent.templates || selectedEvent.templates.length === 0) && (
                      <p className="text-muted-foreground col-span-full">No templates yet. Add one above.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Settings</h3>
              <p className="text-muted-foreground">
                Additional settings and configuration options will be available here.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
