import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/services/eventsApi";

export type UserTemplateType = "image" | "video";

export interface UserTemplate {
  id: string;
  name: string;
  prompt: string;
  model: string;
  aspectRatio?: string;
  duration?: string; // video only
  tags?: string[];
  type: UserTemplateType;
  images?: string[]; // optional reference images
}

const storageKey = (userId: number | string | null) =>
  userId ? `my_templates_${userId}` : "my_templates_guest";

export function useMyTemplates() {
  const user = getCurrentUser();
  const key = storageKey(user?.id || null);
  const [templates, setTemplates] = useState<UserTemplate[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setTemplates(JSON.parse(raw));
      } else {
        setTemplates([]);
      }
    } catch (e) {
      console.warn("Failed to load templates", e);
      setTemplates([]);
    }
  }, [key]);

  const persist = useCallback(
    (next: UserTemplate[]) => {
      setTemplates(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to persist templates", e);
      }
    },
    [key]
  );

  const saveTemplate = useCallback(
    (tpl: Omit<UserTemplate, "id"> & { id?: string }) => {
      const id = tpl.id || crypto.randomUUID();
      const next: UserTemplate[] = [
        { ...tpl, id },
        ...templates.filter((t) => t.id !== id),
      ];
      persist(next);
      return id;
    },
    [persist, templates]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      const next = templates.filter((t) => t.id !== id);
      persist(next);
    },
    [persist, templates]
  );

  return { templates, saveTemplate, deleteTemplate };
}

