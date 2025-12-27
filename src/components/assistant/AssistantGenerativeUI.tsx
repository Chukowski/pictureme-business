/**
 * Assistant Generative UI Components
 * 
 * Custom UI components that can be rendered inside Assistant's chat.
 * These are triggered by specific patterns in the AI response.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// ===== Plan Upgrade Card =====
interface PlanCardProps {
  plan: "starter" | "pro" | "masters";
  onSelect?: () => void;
  className?: string;
}

const planData = {
  starter: {
    name: "Event Starter",
    price: "$400",
    period: "/mes",
    description: "Perfecto para comenzar con eventos pequeños",
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
    popular: false,
    features: [
      "1,000 tokens/mes",
      "1 evento activo",
      "Analytics básico",
      "BYOH (Bring Your Own Hardware)",
      "Soporte por email",
    ],
  },
  pro: {
    name: "Event Pro",
    price: "$1,500",
    period: "/mes",
    description: "Para eventos profesionales y agencias",
    icon: Sparkles,
    color: "from-purple-500 to-pink-500",
    popular: true,
    features: [
      "5,000 tokens/mes",
      "Hasta 2 eventos activos",
      "Analytics avanzado",
      "BYOH (Bring Your Own Hardware)",
      "Lead capture & branded feeds",
      "Soporte prioritario",
    ],
  },
  masters: {
    name: "Masters",
    price: "Desde $3,000",
    period: "/mes",
    description: "Para empresas y alto volumen",
    icon: Crown,
    color: "from-amber-500 to-orange-500",
    popular: false,
    features: [
      "10,000 tokens/mes",
      "Hasta 3 eventos activos",
      "Templates premium & modelos LoRA",
      "Revenue-share & opciones de hardware",
      "Módulo de impresión",
      "Account manager dedicado",
    ],
  },
};

export function PlanCard({ plan, onSelect, className }: PlanCardProps) {
  const navigate = useNavigate();
  const data = planData[plan];
  const Icon = data.icon;

  const handleUpgrade = () => {
    if (onSelect) {
      onSelect();
    }
    navigate("/admin/billing?upgrade=" + plan);
  };

  return (
    <Card className={cn(
      "relative overflow-hidden border-white/10 bg-zinc-900/80 backdrop-blur",
      data.popular && "ring-2 ring-purple-500",
      className
    )}>
      {data.popular && (
        <div className="absolute top-0 right-0">
          <Badge className="rounded-none rounded-bl-lg bg-purple-500 text-white">
            Popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
          `bg-gradient-to-br ${data.color}`
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <CardTitle className="text-white text-lg">{data.name}</CardTitle>
        <CardDescription className="text-zinc-400 text-sm">
          {data.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-3xl font-bold text-white">{data.price}</span>
          <span className="text-zinc-500 text-sm">{data.period}</span>
        </div>

        <ul className="space-y-2">
          {data.features.slice(0, 5).map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
          {data.features.length > 5 && (
            <li className="text-xs text-zinc-500">
              +{data.features.length - 5} más...
            </li>
          )}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleUpgrade}
          className={cn(
            "w-full",
            `bg-gradient-to-r ${data.color} hover:opacity-90`
          )}
        >
          Actualizar a {data.name}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ===== Token Package Card =====
interface TokenPackageCardProps {
  tokens: number;
  price: number;
  bonus?: number;
  onPurchase?: () => void;
}

export function TokenPackageCard({ tokens, price, bonus, onPurchase }: TokenPackageCardProps) {
  const navigate = useNavigate();

  const handlePurchase = () => {
    if (onPurchase) {
      onPurchase();
    }
    navigate(`/admin/tokens?buy=${tokens}`);
  };

  return (
    <Card className="border-white/10 bg-zinc-900/80 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">
                {tokens.toLocaleString()}
              </span>
              <span className="text-zinc-400 text-sm">tokens</span>
              {bonus && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                  +{bonus}% bonus
                </Badge>
              )}
            </div>
            <p className="text-zinc-500 text-sm">${price.toFixed(2)}</p>
          </div>
          <Button
            size="sm"
            onClick={handlePurchase}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Comprar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Navigation Card =====
interface NavigationCardProps {
  title: string;
  description: string;
  path: string;
  icon?: React.ReactNode;
}

export function NavigationCard({ title, description, path, icon }: NavigationCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="border-white/10 bg-zinc-900/80 backdrop-blur cursor-pointer hover:bg-zinc-800/80 transition-colors"
      onClick={() => navigate(path)}
    >
      <CardContent className="p-4 flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h4 className="text-white font-medium">{title}</h4>
          <p className="text-zinc-400 text-sm">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-500" />
      </CardContent>
    </Card>
  );
}

// ===== Auth Card (for guests) =====
interface AuthCardProps {
  type: "register" | "login" | "both";
}

export function AuthCard({ type }: AuthCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-indigo-500/30 bg-zinc-900/90 backdrop-blur overflow-hidden">
      <CardContent className="p-4">
        <div className="text-center mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h4 className="text-white font-semibold text-sm">
            {type === "register" ? "Crea tu cuenta" : type === "login" ? "Inicia sesión" : "¡Comienza ahora!"}
          </h4>
          <p className="text-zinc-400 text-xs mt-1">
            {type === "register"
              ? "Regístrate para acceder a todas las funciones"
              : type === "login"
                ? "Accede a tu cuenta para continuar"
                : "Regístrate o inicia sesión"}
          </p>
        </div>

        <div className={cn("flex gap-2", type === "both" ? "flex-col" : "")}>
          {(type === "register" || type === "both") && (
            <Button
              onClick={() => navigate("/admin/register")}
              size="sm"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Crear cuenta
            </Button>
          )}
          {(type === "login" || type === "both") && (
            <Button
              onClick={() => navigate("/admin/auth")}
              size="sm"
              variant="outline"
              className="flex-1 border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white"
            >
              Iniciar sesión
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Feature Explanation Card =====
interface FeatureCardProps {
  feature: string;
  description: string;
  tips?: string[];
}

export function FeatureCard({ feature, description, tips }: FeatureCardProps) {
  return (
    <Card className="border-white/10 bg-zinc-900/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          {feature}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-zinc-300 text-sm mb-3">{description}</p>
        {tips && tips.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Tips:</p>
            <ul className="space-y-1">
              {tips.map((tip, idx) => (
                <li key={idx} className="text-xs text-zinc-400 flex items-start gap-1">
                  <span className="text-purple-400">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Parser for Generative UI =====
export interface GenerativeUIComponent {
  type: "plan_card" | "token_package" | "navigation" | "feature" | "auth";
  props: any;
}

/**
 * Parse AI response for generative UI markers
 * Format: [[component:type|prop1=value1|prop2=value2]]
 */
export function parseGenerativeUI(text: string): { text: string; components: GenerativeUIComponent[] } {
  const components: GenerativeUIComponent[] = [];

  // Pattern: [[plan_card:starter]] or [[plan_card:pro]] or [[plan_card:masters]]
  const planPattern = /\[\[plan_card:(starter|pro|masters)\]\]/gi;
  let match;

  while ((match = planPattern.exec(text)) !== null) {
    components.push({
      type: "plan_card",
      props: { plan: match[1].toLowerCase() }
    });
  }

  // Pattern: [[token_package:tokens=5000|price=49.99|bonus=10]]
  const tokenPattern = /\[\[token_package:tokens=(\d+)\|price=([\d.]+)(?:\|bonus=(\d+))?\]\]/gi;
  while ((match = tokenPattern.exec(text)) !== null) {
    components.push({
      type: "token_package",
      props: {
        tokens: parseInt(match[1]),
        price: parseFloat(match[2]),
        bonus: match[3] ? parseInt(match[3]) : undefined
      }
    });
  }

  // Pattern: [[navigate:path=/admin/events|title=Crear Evento|description=...]]
  const navPattern = /\[\[navigate:path=([^|]+)\|title=([^|]+)\|description=([^\]]+)\]\]/gi;
  while ((match = navPattern.exec(text)) !== null) {
    components.push({
      type: "navigation",
      props: {
        path: match[1],
        title: match[2],
        description: match[3]
      }
    });
  }

  // Pattern: [[auth:register]] or [[auth:login]] or [[auth:both]]
  const authPattern = /\[\[auth:(register|login|both)\]\]/gi;
  while ((match = authPattern.exec(text)) !== null) {
    components.push({
      type: "auth",
      props: { type: match[1].toLowerCase() }
    });
  }

  // Remove markers from text
  const cleanText = text
    .replace(planPattern, "")
    .replace(tokenPattern, "")
    .replace(navPattern, "")
    .replace(authPattern, "")
    .trim();

  return { text: cleanText, components };
}

// ===== Render Generative UI Component =====
export function RenderGenerativeUI({ component }: { component: GenerativeUIComponent }) {
  switch (component.type) {
    case "plan_card":
      return <PlanCard plan={component.props.plan} />;
    case "token_package":
      return <TokenPackageCard {...component.props} />;
    case "navigation":
      return <NavigationCard {...component.props} />;
    case "feature":
      return <FeatureCard {...component.props} />;
    case "auth":
      return <AuthCard type={component.props.type} />;
    default:
      return null;
  }
}
