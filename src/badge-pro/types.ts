import { BadgeTemplateConfig, CustomElementPositions } from "@/components/templates/BadgeTemplateEditor";

export interface BadgePrintSettings {
  widthInches: number;
  heightInches: number;
  dpi: number;
  bleedInches?: number;
  units?: 'in' | 'mm';
}

export interface BadgeLayoutTemplate {
  id: string;
  name: string;
  description: string;
  layout: BadgeTemplateConfig['layout'];
  print: BadgePrintSettings;
  positions?: CustomElementPositions;
  backgroundUrl?: string;
  backgroundColor?: string;
  qrSize?: BadgeTemplateConfig['qrCode']['size'];
  photoSize?: BadgeTemplateConfig['photoPlacement']['size'];
}

export type BadgeProConfig = BadgeTemplateConfig & {
  print?: BadgePrintSettings;
  layoutTemplateId?: string;
};
