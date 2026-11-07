// Ícones SVG em linha (decorativos: o texto acessível fica no botão que os contém).
import type { ReactNode } from "react";
import { chatConfig } from "../config";

function Svg({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const MenuIcon = () => (
  <Svg>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);
export const CloseIcon = () => (
  <Svg>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const SendIcon = () => (
  <Svg size={20}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const MicIcon = () => (
  <Svg size={20}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Svg>
);
export const SpeakerIcon = () => (
  <Svg size={18}>
    <path d="M11 5L6 9H3v6h3l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </Svg>
);
export const StopIcon = () => (
  <Svg size={18}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Svg>
);
export const PlayIcon = () => (
  <Svg size={18}>
    <path d="M7 5l12 7-12 7V5z" />
  </Svg>
);
export const CheckIcon = () => (
  <Svg size={18}>
    <path d="M5 12l5 5 9-10" />
  </Svg>
);
export const UserIcon = () => (
  <Svg size={20}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);
export const LogoutIcon = () => (
  <Svg size={20}>
    <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
  </Svg>
);
export const PauseIcon = () => (
  <Svg size={20}>
    <path d="M8 5v14M16 5v14" />
  </Svg>
);
export const PlayFilledIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" />
  </svg>
);

/**
 * Marca do assistente: a logo do app num círculo.
 * MOCK: a logo vem de chat/assets/logo.svg; substitua o arquivo ou passe `logoUrl` ao <ChatApp>.
 */
export function Avatar({ size = 36 }: { size?: number }) {
  return (
    <span className="avatar avatar-logo" style={{ width: size, height: size }} aria-hidden="true">
      <img src={chatConfig().logoUrl} alt="" width={size} height={size} />
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Foto de quem está conversando.
 * MOCK: a API ainda não tem foto; sem `src`, mostra as iniciais do nome.
 */
export function UserAvatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  return (
    <span className="avatar avatar-user" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {src ? <img src={src} alt="" width={size} height={size} /> : initials(name)}
    </span>
  );
}
