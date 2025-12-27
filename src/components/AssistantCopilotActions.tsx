/**
 * Assistant CopilotKit Actions
 * 
 * Frontend actions that the Assistant can execute directly in the browser.
 * These complement the backend actions and provide immediate UI feedback.
 */

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export function useAssistantActions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Make current page readable to Assistant
  useCopilotReadable({
    description: "The current page URL the user is on",
    value: location.pathname,
  });

  // Make user info readable to Assistant
  useCopilotReadable({
    description: "Information about the currently logged in user",
    value: (() => {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          return {
            id: user.id,
            role: user.role,
            name: user.full_name || user.username,
            plan: user.role?.includes("business") ? user.role : "individual",
          };
        }
      } catch {
        // Ignore
      }
      return { id: null, role: "guest", name: "Guest", plan: "none" };
    })(),
  });

  // Navigate action - allows Assistant to navigate the user
  useCopilotAction({
    name: "navigateTo",
    description: "Navigate the user to a specific page in the application",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "The path to navigate to (e.g., '/admin/events/create')",
        required: true,
      },
      {
        name: "message",
        type: "string",
        description: "Optional message to show the user about the navigation",
        required: false,
      },
    ],
    handler: async ({ path, message }) => {
      if (message) {
        toast({
          title: "Navegando...",
          description: message,
        });
      }
      navigate(path);
      return `Navigated to ${path}`;
    },
  });

  // Show toast notification
  useCopilotAction({
    name: "showNotification",
    description: "Show a notification toast to the user",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "The title of the notification",
        required: true,
      },
      {
        name: "message",
        type: "string",
        description: "The message content",
        required: true,
      },
      {
        name: "type",
        type: "string",
        description: "The type of notification: 'success', 'error', 'info'",
        required: false,
      },
    ],
    handler: async ({ title, message, type }) => {
      toast({
        title,
        description: message,
        variant: type === "error" ? "destructive" : "default",
      });
      return `Showed notification: ${title}`;
    },
  });

  // Copy text to clipboard
  useCopilotAction({
    name: "copyToClipboard",
    description: "Copy text to the user's clipboard",
    parameters: [
      {
        name: "text",
        type: "string",
        description: "The text to copy",
        required: true,
      },
    ],
    handler: async ({ text }) => {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado",
        description: "Texto copiado al portapapeles",
      });
      return "Text copied to clipboard";
    },
  });

  // Open external link
  useCopilotAction({
    name: "openExternalLink",
    description: "Open an external link in a new tab",
    parameters: [
      {
        name: "url",
        type: "string",
        description: "The URL to open",
        required: true,
      },
    ],
    handler: async ({ url }) => {
      window.open(url, "_blank");
      return `Opened ${url} in new tab`;
    },
  });

  // Scroll to element
  useCopilotAction({
    name: "scrollToSection",
    description: "Scroll to a specific section on the page",
    parameters: [
      {
        name: "sectionId",
        type: "string",
        description: "The ID of the section to scroll to",
        required: true,
      },
    ],
    handler: async ({ sectionId }) => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        return `Scrolled to ${sectionId}`;
      }
      return `Section ${sectionId} not found`;
    },
  });
}

/**
 * Component that registers all Assistant actions
 * Include this component once in your app (e.g., in App.tsx or a layout)
 */
export function AssistantCopilotActions() {
  useAssistantActions();
  return null;
}

export default AssistantCopilotActions;
