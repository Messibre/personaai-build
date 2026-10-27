"use client"

import { useCallback, useRef, type Dispatch } from "react"
import type { WizardState, WizardAction, TemplateStyle, ColorScheme, SectionId } from "@/lib/types"
import { COLOR_SCHEMES, PORTFOLIO_SECTIONS, TEMPLATE_OPTIONS } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Camera,
  X,
  ImagePlus,
  Check,
  User,
  MessageSquare,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { TemplateThumbnail } from "./template-thumbnail"

interface StepCustomizeProps {
  state: WizardState
  dispatch: Dispatch<WizardAction>
  onNext: () => void
  onBack: () => void
}

/* Mini SVG preview for each template style */
function TemplatePreview({ templateId, isSelected }: { templateId: TemplateStyle; isSelected: boolean }) {
  const accent = isSelected ? "var(--persona-accent)" : "currentColor"

  switch (templateId) {
    case "bold-portrait":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="90" fill="#111" />
          {/* Large portrait silhouette */}
          <circle cx="100" cy="50" r="30" fill="#333" />
          <ellipse cx="100" cy="35" rx="12" ry="14" fill="#444" />
          {/* Big "Hello" text */}
          <text x="12" y="42" fontSize="22" fontWeight="900" fill="#fff" fontFamily="sans-serif">Hello</text>
          {/* Stats */}
          <text x="12" y="58" fontSize="6" fill={accent} fontFamily="sans-serif">+200</text>
          <text x="42" y="58" fontSize="6" fill={accent} fontFamily="sans-serif">+50</text>
          {/* Nav dots */}
          <circle cx="12" cy="10" r="2" fill="#555" />
          <rect x="70" y="8" width="16" height="3" rx="1" fill="#444" />
          <rect x="90" y="8" width="16" height="3" rx="1" fill="#444" />
          <rect x="110" y="8" width="16" height="3" rx="1" fill="#444" />
        </svg>
      )
    case "typographic":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="90" fill="#fafafa" />
          {/* Portrait behind text */}
          <circle cx="80" cy="45" r="28" fill="#ddd" />
          <ellipse cx="80" cy="32" rx="10" ry="12" fill="#ccc" />
          {/* Oversized text overlay */}
          <text x="10" y="55" fontSize="20" fontWeight="900" fill="#111" opacity="0.85" fontFamily="sans-serif">Web</text>
          <text x="8" y="72" fontSize="16" fontWeight="900" fill={accent} opacity="0.7" fontFamily="sans-serif">{"Designer"}</text>
          {/* Small intro */}
          <text x="12" y="22" fontSize="5" fill="#888" fontFamily="sans-serif">my name is...</text>
          {/* Nav */}
          <rect x="100" y="8" width="14" height="3" rx="1" fill="#ccc" />
          <rect x="118" y="8" width="14" height="3" rx="1" fill="#ccc" />
          <rect x="136" y="8" width="14" height="3" rx="1" fill="#ccc" />
        </svg>
      )
    case "split-editorial":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          {/* Split dark/light */}
          <rect width="80" height="90" fill="#1a1a1a" />
          <rect x="80" width="80" height="90" fill="#f5f5f5" />
          {/* Portrait on dark side */}
          <circle cx="55" cy="50" r="22" fill="#333" />
          <ellipse cx="55" cy="38" rx="9" ry="10" fill="#444" />
          {/* Text on light side */}
          <text x="88" y="30" fontSize="8" fontWeight="800" fill="#111" fontFamily="sans-serif">Amazing</text>
          <text x="88" y="42" fontSize="8" fontWeight="800" fill="#111" fontFamily="sans-serif">branding</text>
          <text x="88" y="54" fontSize="8" fontWeight="800" fill="#111" fontFamily="sans-serif">mock-up</text>
          {/* Number */}
          <text x="10" y="30" fontSize="14" fontWeight="300" fill="#555" fontFamily="sans-serif">1/5</text>
          {/* Accent line */}
          <rect x="88" y="60" width="30" height="1" fill={accent} />
        </svg>
      )
    case "pastel-creative":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          {/* Pastel background blocks */}
          <rect width="160" height="55" fill="#d4eaf7" />
          <rect y="55" width="160" height="35" fill="#f5d5e0" />
          {/* Portrait */}
          <circle cx="100" cy="35" r="20" fill="#9cc" opacity="0.5" />
          <ellipse cx="100" cy="25" rx="8" ry="10" fill="#8bb" opacity="0.6" />
          {/* Text */}
          <text x="12" y="30" fontSize="8" fontWeight="800" fill="#222" fontFamily="sans-serif">Hey there,</text>
          <text x="12" y="42" fontSize="7" fontWeight="800" fill="#222" fontFamily="sans-serif">Interaction</text>
          <text x="12" y="52" fontSize="7" fontWeight="800" fill="#222" fontFamily="sans-serif">Designer</text>
          {/* Project cards */}
          <rect x="20" y="62" width="35" height="20" rx="3" fill="#fff" opacity="0.8" />
          <rect x="62" y="62" width="35" height="20" rx="3" fill="#fff" opacity="0.8" />
          <rect x="104" y="62" width="35" height="20" rx="3" fill="#fff" opacity="0.8" />
        </svg>
      )
    case "designer-coder":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          {/* Split gradient */}
          <rect width="80" height="90" fill="#f8f8f8" />
          <rect x="80" width="80" height="90" fill="#2a2a2a" />
          {/* Colorful portrait center */}
          <circle cx="80" cy="45" r="24" fill={accent} opacity="0.3" />
          <circle cx="80" cy="45" r="18" fill="#eee" />
          <ellipse cx="80" cy="35" rx="8" ry="10" fill="#ddd" />
          {/* Paint splashes */}
          <circle cx="62" cy="30" r="5" fill="#f59e0b" opacity="0.6" />
          <circle cx="98" cy="60" r="4" fill="#3b82f6" opacity="0.6" />
          <circle cx="70" cy="65" r="3" fill="#ef4444" opacity="0.6" />
          {/* Labels */}
          <text x="10" y="45" fontSize="9" fontWeight="800" fill="#333" fontFamily="sans-serif">designer</text>
          <text x="95" y="45" fontSize="8" fontWeight="600" fill="#aaa" fontFamily="monospace">{"<coder>"}</text>
          {/* Nav */}
          <circle cx="80" cy="8" r="4" fill="none" stroke="#888" strokeWidth="0.5" />
        </svg>
      )
    case "minimal-clean":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="90" fill="#fff" />
          {/* Clean grid lines */}
          <line x1="0" y1="18" x2="160" y2="18" stroke="#f0f0f0" strokeWidth="0.5" />
          {/* Simple portrait */}
          <circle cx="80" cy="42" r="14" fill="#f0f0f0" />
          <ellipse cx="80" cy="35" rx="6" ry="7" fill="#e5e5e5" />
          {/* Clean text */}
          <text x="55" y="68" fontSize="7" fontWeight="600" fill="#222" fontFamily="sans-serif" textAnchor="start">John Doe</text>
          <text x="55" y="76" fontSize="4" fill="#999" fontFamily="sans-serif" textAnchor="start">Software Engineer</text>
          {/* Minimal nav */}
          <rect x="10" y="8" width="20" height="3" rx="1" fill="#222" />
          <rect x="110" y="8" width="12" height="3" rx="1" fill="#eee" />
          <rect x="126" y="8" width="12" height="3" rx="1" fill="#eee" />
          <rect x="142" y="8" width="12" height="3" rx="1" fill="#eee" />
          {/* Accent dot */}
          <circle cx="80" cy="83" r="2" fill={accent} />
        </svg>
      )
    case "brutalist":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="90" fill="#0a0a0a" />
          {/* Bold top border */}
          <rect x="0" y="0" width="160" height="3" fill={accent} />
          {/* Left panel */}
          <rect x="0" y="3" width="95" height="87" fill="#111" />
          {/* Right panel / photo */}
          <rect x="95" y="3" width="65" height="87" fill="#1a1a1a" />
          <rect x="95" y="3" width="3" height="87" fill={accent} />
          {/* Photo placeholder */}
          <rect x="98" y="5" width="59" height="52" fill="#222" />
          <ellipse cx="127" cy="25" rx="10" ry="12" fill="#333" />
          {/* Oversized text */}
          <text x="8" y="38" fontSize="20" fontWeight="900" fill="#fff" fontFamily="monospace">NAME</text>
          <text x="8" y="55" fontSize="10" fontWeight="900" fill={accent} fontFamily="monospace">PORTFOLIO</text>
          {/* Role tag */}
          <rect x="8" y="20" width="40" height="8" fill={accent} />
          <text x="10" y="26" fontSize="4" fontWeight="700" fill="#000" fontFamily="monospace">DEV</text>
          {/* Stat boxes */}
          <rect x="98" y="62" width="18" height="14" fill="none" stroke="#333" strokeWidth="1" />
          <rect x="120" y="62" width="18" height="14" fill="none" stroke="#333" strokeWidth="1" />
          <rect x="142" y="62" width="12" height="14" fill="none" stroke="#333" strokeWidth="1" />
          <text x="104" y="72" fontSize="6" fontWeight="900" fill={accent} fontFamily="monospace">12</text>
          <text x="126" y="72" fontSize="6" fontWeight="900" fill={accent} fontFamily="monospace">8</text>
          <text x="146" y="72" fontSize="5" fontWeight="900" fill={accent} fontFamily="monospace">3</text>
          {/* Nav */}
          <rect x="0" y="0" width="160" height="12" fill="#0a0a0a" />
          <text x="8" y="9" fontSize="5" fontWeight="900" fill="#fff" fontFamily="monospace">PERSONA</text>
          <rect x="100" y="4" width="14" height="3" rx="0" fill="#222" />
          <rect x="118" y="4" width="14" height="3" rx="0" fill="#222" />
          <rect x="136" y="4" width="14" height="3" rx="0" fill={accent} />
        </svg>
      )
    case "glassmorphism":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <defs>
            <radialGradient id="g1" cx="30%" cy="30%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
              <stop offset="100%" stopColor="#050510" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="g2" cx="80%" cy="80%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#050510" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="160" height="90" fill="#050510" />
          <ellipse cx="40" cy="30" rx="50" ry="40" fill="url(#g1)" />
          <ellipse cx="130" cy="70" rx="45" ry="35" fill="url(#g2)" />
          <rect x="8" y="15" width="85" height="60" rx="6" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
          <text x="16" y="35" fontSize="4" fontWeight="600" fill={accent} fontFamily="sans-serif" letterSpacing="1">DEVELOPER</text>
          <text x="16" y="47" fontSize="9" fontWeight="800" fill="#fff" fontFamily="sans-serif">Jane Doe</text>
          <text x="16" y="56" fontSize="3.5" fill="rgba(255,255,255,0.5)" fontFamily="sans-serif">Building beautiful things at</text>
          <text x="16" y="62" fontSize="3.5" fill="rgba(255,255,255,0.5)" fontFamily="sans-serif">the edge of design & code.</text>
          <rect x="16" y="65" width="28" height="7" rx="3" fill={accent} />
          <text x="22" y="70" fontSize="3" fontWeight="700" fill="#000" fontFamily="sans-serif">My Work</text>
          <rect x="48" y="65" width="28" height="7" rx="3" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.15" strokeWidth="0.5" />
          <text x="53" y="70" fontSize="3" fill="rgba(255,255,255,0.7)" fontFamily="sans-serif">Contact</text>
          <rect x="100" y="10" width="52" height="70" rx="8" fill="white" fillOpacity="0.06" stroke={accent} strokeOpacity="0.3" strokeWidth="0.5" />
          <ellipse cx="126" cy="38" rx="14" ry="16" fill="#1a1a2e" />
          <ellipse cx="126" cy="30" rx="7" ry="8" fill="#222240" />
          <rect x="0" y="0" width="160" height="11" fill="rgba(5,5,16,0.8)" />
          <text x="8" y="8" fontSize="5" fontWeight="800" fill="#fff" fontFamily="sans-serif">P.</text>
          <rect x="90" y="4" width="14" height="3" rx="1" fill="rgba(255,255,255,0.1)" />
          <rect x="108" y="4" width="14" height="3" rx="1" fill="rgba(255,255,255,0.1)" />
          <rect x="126" y="3" width="20" height="5" rx="2" fill={accent} fillOpacity="0.9" />
        </svg>
      )
    case "terminal":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          {/* Terminal dark bg with scanlines */}
          <rect width="160" height="90" fill="#0d0d0d" />
          <rect x="0" y="0" width="160" height="0.8" fill={accent} opacity="0.15" />
          <rect x="0" y="18" width="160" height="0.8" fill={accent} opacity="0.08" />
          <rect x="0" y="36" width="160" height="0.8" fill={accent} opacity="0.08" />
          <rect x="0" y="54" width="160" height="0.8" fill={accent} opacity="0.08" />
          <rect x="0" y="72" width="160" height="0.8" fill={accent} opacity="0.08" />
          {/* Terminal window */}
          <rect x="8" y="14" width="144" height="70" rx="4" fill="#111" stroke={accent} strokeWidth="0.5" strokeOpacity="0.3" />
          {/* Window dots */}
          <circle cx="17" cy="22" r="2.5" fill="#ff5f57" />
          <circle cx="25" cy="22" r="2.5" fill="#febc2e" />
          <circle cx="33" cy="22" r="2.5" fill="#28c840" />
          {/* Command lines */}
          <text x="16" y="36" fontSize="5" fill={accent} fontFamily="monospace">$ whoami</text>
          <text x="16" y="45" fontSize="5" fill="#e0e0e0" fontFamily="monospace">Jane Doe — Full Stack Dev</text>
          <text x="16" y="56" fontSize="5" fill={accent} fontFamily="monospace">$ ls projects/</text>
          <rect x="16" y="60" width="32" height="6" rx="1" fill={accent} fillOpacity="0.12" stroke={accent} strokeWidth="0.4" strokeOpacity="0.4" />
          <rect x="52" y="60" width="32" height="6" rx="1" fill={accent} fillOpacity="0.12" stroke={accent} strokeWidth="0.4" strokeOpacity="0.4" />
          <rect x="88" y="60" width="32" height="6" rx="1" fill={accent} fillOpacity="0.12" stroke={accent} strokeWidth="0.4" strokeOpacity="0.4" />
          <text x="26" y="64.5" fontSize="4" fill={accent} fontFamily="monospace">app-1</text>
          <text x="61" y="64.5" fontSize="4" fill={accent} fontFamily="monospace">app-2</text>
          <text x="97" y="64.5" fontSize="4" fill={accent} fontFamily="monospace">app-3</text>
          {/* Cursor */}
          <text x="16" y="76" fontSize="5" fill={accent} fontFamily="monospace">_</text>
          {/* Nav */}
          <rect x="0" y="0" width="160" height="12" fill="#0d0d0d" />
          <text x="8" y="8.5" fontSize="5" fontWeight="700" fill={accent} fontFamily="monospace">~/portfolio</text>
        </svg>
      )
    case "liquid-glass":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <defs>
            <radialGradient id="lg1" cx="25%" cy="25%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
              <stop offset="100%" stopColor="#050510" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="lg2" cx="80%" cy="75%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#050510" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="160" height="90" fill="#050510" />
          <ellipse cx="35" cy="30" rx="60" ry="45" fill="url(#lg1)" />
          <ellipse cx="130" cy="65" rx="55" ry="40" fill="url(#lg2)" />
          {/* Pill nav */}
          <rect x="30" y="4" width="100" height="9" rx="4.5" fill="rgba(5,5,16,0.7)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <text x="38" y="10" fontSize="4" fontWeight="800" fill="#fff" fontFamily="sans-serif">J.</text>
          <rect x="80" y="6" width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
          <rect x="95" y="6" width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
          <rect x="110" y="5" width="16" height="5" rx="2.5" fill={accent} />
          {/* Hero grid */}
          <rect x="8" y="18" width="70" height="66" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          {/* Photo tile */}
          <rect x="82" y="18" width="70" height="66" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <ellipse cx="117" cy="44" rx="18" ry="20" fill="rgba(255,255,255,0.06)" />
          <ellipse cx="117" cy="36" rx="8" ry="9" fill="rgba(255,255,255,0.08)" />
          {/* Text in left tile */}
          <rect x="16" y="24" width="30" height="5" rx="2.5" fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="0.4" strokeOpacity="0.4" />
          <text x="20" y="27.5" fontSize="3.5" fill={accent} fontFamily="sans-serif">Developer</text>
          <text x="14" y="40" fontSize="8" fontWeight="800" fill="#fff" fontFamily="sans-serif">Jane</text>
          <text x="14" y="50" fontSize="8" fontWeight="800" fill="#fff" fontFamily="sans-serif">Doe</text>
          <text x="14" y="60" fontSize="3.5" fill="rgba(255,255,255,0.4)" fontFamily="sans-serif">Building products</text>
          <rect x="14" y="66" width="24" height="8" rx="4" fill={accent} />
          <text x="19" y="71" fontSize="3.5" fontWeight="700" fill="#000" fontFamily="sans-serif">See Work</text>
        </svg>
      )
    case "cyberpunk-noir":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="90" fill="#080608" />
          {/* Scanlines */}
          {[...Array(10)].map((_, i) => (
            <rect key={i} x="0" y={i * 9} width="160" height="0.4" fill="rgba(255,255,255,0.03)" />
          ))}
          {/* Nav */}
          <rect x="0" y="0" width="160" height="12" fill="#080608" />
          <rect x="0" y="11" width="160" height="0.5" fill={accent} fillOpacity="0.4" />
          <text x="8" y="8.5" fontSize="6" fontWeight="700" fill="#fff" fontFamily="sans-serif" letterSpacing="1">PERSONA</text>
          <rect x="100" y="4" width="12" height="2.5" rx="0" fill="#222" />
          <rect x="116" y="4" width="12" height="2.5" rx="0" fill="#222" />
          <rect x="132" y="3" width="18" height="5" fill={accent} />
          {/* Hero: glitch name */}
          <text x="8" y="38" fontSize="20" fontWeight="900" fill="#fff" fontFamily="sans-serif">JANE</text>
          <text x="9" y="37.5" fontSize="20" fontWeight="900" fill={accent} fontFamily="sans-serif" opacity="0.5">JANE</text>
          <text x="7" y="38.5" fontSize="20" fontWeight="900" fill="#0ff" fontFamily="sans-serif" opacity="0.2">JANE</text>
          <text x="8" y="48" fontSize="6" fill={accent} fontFamily="monospace" letterSpacing="2">DEVELOPER</text>
          {/* Corner brackets on photo */}
          <rect x="95" y="14" width="58" height="70" fill="#111" />
          <ellipse cx="124" cy="44" rx="16" ry="19" fill="#1a1a1a" />
          <ellipse cx="124" cy="34" rx="7" ry="8" fill="#222" />
          <rect x="95" y="14" width="6" height="1.5" fill={accent} />
          <rect x="95" y="14" width="1.5" height="6" fill={accent} />
          <rect x="147" y="14" width="6" height="1.5" fill={accent} />
          <rect x="151.5" y="14" width="1.5" height="6" fill={accent} />
          <rect x="95" y="82.5" width="6" height="1.5" fill={accent} />
          <rect x="95" y="78" width="1.5" height="6" fill={accent} />
          <rect x="147" y="82.5" width="6" height="1.5" fill={accent} />
          <rect x="151.5" y="78" width="1.5" height="6" fill={accent} />
          {/* CTA clip-path style */}
          <rect x="8" y="56" width="44" height="10" fill={accent} />
          <text x="14" y="62.5" fontSize="4.5" fontWeight="700" fill="#000" fontFamily="sans-serif" letterSpacing="1">PROJECTS</text>
          <rect x="56" y="56" width="32" height="10" fill="none" stroke={accent} strokeWidth="1" strokeOpacity="0.6" />
          <text x="60" y="62.5" fontSize="4.5" fill={accent} fontFamily="sans-serif">CONTACT</text>
        </svg>
      )
    case "bento-grid":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="90" fill="#0a0a0a" />
          {/* Nav */}
          <rect x="0" y="0" width="160" height="10" fill="#0a0a0a" />
          <rect x="0" y="9.5" width="160" height="0.5" fill="rgba(255,255,255,0.05)" />
          <text x="8" y="7" fontSize="5" fontWeight="800" fill="#fff" fontFamily="sans-serif">J.</text>
          <rect x="110" y="3.5" width="10" height="3" rx="1" fill="rgba(255,255,255,0.1)" />
          <rect x="124" y="3.5" width="10" height="3" rx="1" fill="rgba(255,255,255,0.1)" />
          <rect x="138" y="3" width="14" height="4" rx="1.5" fill={accent} />
          {/* Bento cells */}
          {/* Large name cell */}
          <rect x="8" y="13" width="72" height="36" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
          <rect x="14" y="18" width="24" height="5" rx="2.5" fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="0.4" strokeOpacity="0.5" />
          <text x="16" y="21.5" fontSize="3.5" fill={accent} fontFamily="sans-serif">Developer</text>
          <text x="13" y="32" fontSize="10" fontWeight="800" fill="#fff" fontFamily="sans-serif">Jane</text>
          <text x="13" y="42" fontSize="10" fontWeight="800" fill="#fff" fontFamily="sans-serif">Doe</text>
          {/* Photo cell */}
          <rect x="84" y="13" width="68" height="36" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
          <ellipse cx="118" cy="29" rx="16" ry="19" fill="rgba(255,255,255,0.05)" />
          <ellipse cx="118" cy="22" rx="7" ry="8" fill="rgba(255,255,255,0.07)" />
          {/* Bio cell */}
          <rect x="8" y="53" width="48" height="30" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
          <text x="14" y="61" fontSize="3" fill={accent} fontFamily="sans-serif" letterSpacing="1">ABOUT</text>
          <rect x="13" y="63" width="36" height="2.5" rx="1" fill="rgba(255,255,255,0.1)" />
          <rect x="13" y="67" width="30" height="2.5" rx="1" fill="rgba(255,255,255,0.1)" />
          <rect x="13" y="71" width="33" height="2.5" rx="1" fill="rgba(255,255,255,0.1)" />
          {/* Stats cell */}
          <rect x="60" y="53" width="36" height="30" rx="5" fill={accent} fillOpacity="0.06" stroke={accent} strokeWidth="0.5" strokeOpacity="0.2" />
          <text x="66" y="66" fontSize="12" fontWeight="800" fill={accent} fontFamily="sans-serif" textAnchor="middle">12</text>
          <text x="78" y="71" fontSize="3" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif" textAnchor="middle">repos</text>
          {/* Skills cell */}
          <rect x="100" y="53" width="52" height="30" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
          <rect x="106" y="60" width="16" height="5" rx="2.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
          <rect x="125" y="60" width="20" height="5" rx="2.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
          <rect x="106" y="68" width="22" height="5" rx="2.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
          <rect x="131" y="68" width="14" height="5" rx="2.5" fill={accent} fillOpacity="0.15" stroke={accent} strokeWidth="0.4" strokeOpacity="0.4" />
        </svg>
      )
    case "spotlight-dark":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <defs>
            <radialGradient id="spot" cx="35%" cy="55%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.12" />
              <stop offset="60%" stopColor={accent} stopOpacity="0.03" />
              <stop offset="100%" stopColor="#030303" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="160" height="90" fill="#030303" />
          <ellipse cx="55" cy="50" rx="70" ry="55" fill="url(#spot)" />
          {/* Nav */}
          <rect x="0" y="0" width="160" height="12" fill="rgba(3,3,3,0.9)" />
          <text x="10" y="8.5" fontSize="5" fontWeight="800" fill="#fff" fontFamily="sans-serif">J.</text>
          <rect x="90" y="4.5" width="12" height="3" rx="1" fill="#333" />
          <rect x="106" y="4.5" width="12" height="3" rx="1" fill="#333" />
          <rect x="122" y="4" width="18" height="4.5" rx="1" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          {/* Hero layout */}
          <text x="10" y="30" fontSize="4" fill={accent} fontFamily="sans-serif" letterSpacing="2">FULL STACK DEVELOPER</text>
          <text x="10" y="44" fontSize="16" fontWeight="800" fill="#fff" fontFamily="sans-serif" letterSpacing="-0.5">Jane</text>
          <text x="10" y="56" fontSize="16" fontWeight="300" fill="#555" fontFamily="sans-serif" letterSpacing="-0.5">Doe</text>
          <rect x="10" y="62" width="28" height="8" rx="2" fill={accent} />
          <text x="16" y="67.5" fontSize="3.5" fontWeight="700" fill="#000" fontFamily="sans-serif">Projects</text>
          <rect x="42" y="62" width="28" height="8" rx="2" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <text x="47" y="67.5" fontSize="3.5" fill="#888" fontFamily="sans-serif">Contact</text>
          {/* Photo */}
          <rect x="100" y="14" width="52" height="70" rx="6" fill="#111" />
          <ellipse cx="126" cy="42" rx="15" ry="18" fill="#1a1a1a" />
          <ellipse cx="126" cy="33" rx="7" ry="8" fill="#222" />
          {/* Project list lines */}
          <rect x="10" y="76" width="80" height="0.5" fill="rgba(255,255,255,0.04)" />
        </svg>
      )
    case "swiss-editorial":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="90" fill="#f5f5f0" />
          {/* Nav border */}
          <rect x="0" y="0" width="160" height="12" fill="#f5f5f0" />
          <rect x="0" y="11.5" width="160" height="2" fill="#111" />
          <text x="8" y="9" fontSize="5" fontWeight="900" fill="#111" fontFamily="sans-serif" letterSpacing="2">PERSONA</text>
          <rect x="100" y="4.5" width="12" height="2.5" rx="0" fill="#ccc" />
          <rect x="116" y="4.5" width="12" height="2.5" rx="0" fill="#ccc" />
          <rect x="132" y="3.5" width="18" height="4.5" fill="#111" />
          {/* Vertical divider */}
          <rect x="80" y="13" width="2" height="77" fill="#111" />
          {/* Left: large initial + name */}
          <text x="8" y="55" fontSize="40" fontWeight="900" fill={accent} fontFamily="sans-serif" opacity="0.9">J</text>
          <text x="8" y="68" fontSize="10" fontWeight="900" fill="#111" fontFamily="sans-serif" letterSpacing="-0.5">JANE</text>
          <text x="8" y="78" fontSize="8" fontWeight="300" fill="#888" fontFamily="sans-serif" letterSpacing="-0.3">DOE</text>
          {/* Right: photo + bio */}
          <rect x="84" y="14" width="72" height="48" fill="#e0e0da" />
          <ellipse cx="120" cy="34" rx="16" ry="19" fill="#ccc" />
          <ellipse cx="120" cy="24" rx="7" ry="8" fill="#bbb" />
          <rect x="84" y="66" width="50" height="2.5" rx="0" fill="#111" />
          <rect x="84" y="71" width="40" height="2" rx="0" fill="#ccc" />
          <rect x="84" y="76" width="44" height="2" rx="0" fill="#ccc" />
          {/* Accent rule */}
          <rect x="8" y="82" width="30" height="2" fill={accent} />
        </svg>
      )
    case "gradient-aurora":
      return (
        <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="aurora1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="aurora2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" stopOpacity="0" />
              <stop offset="50%" stopColor={accent} stopOpacity="0.1" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="nameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="100%" stopColor={accent} />
            </linearGradient>
          </defs>
          <rect width="160" height="90" fill="#07070f" />
          {/* Aurora bands */}
          <rect x="-20" y="8" width="220" height="18" fill="url(#aurora1)" rx="8" />
          <rect x="-20" y="28" width="220" height="14" fill="url(#aurora2)" rx="6" />
          <rect x="-20" y="50" width="220" height="16" fill="url(#aurora1)" rx="7" opacity="0.6" />
          {/* Nav */}
          <rect x="0" y="0" width="160" height="11" fill="rgba(7,7,15,0.8)" />
          <text x="8" y="8" fontSize="5.5" fontWeight="800" fill="#fff" fontFamily="sans-serif">J.</text>
          <rect x="88" y="4" width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.1)" />
          <rect x="104" y="4" width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.1)" />
          <rect x="120" y="3" width="20" height="5.5" rx="2.75" fill={accent} />
          {/* Centered hero */}
          <circle cx="80" cy="32" r="9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <ellipse cx="80" cy="29" rx="4.5" ry="5.5" fill="rgba(255,255,255,0.1)" />
          <rect x="60" y="23" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
          <text x="80" y="26.5" fontSize="3.5" fill="rgba(255,255,255,0.4)" fontFamily="sans-serif" textAnchor="middle">Developer</text>
          {/* Name with gradient */}
          <text x="80" y="52" fontSize="14" fontWeight="900" fill="url(#nameGrad)" fontFamily="sans-serif" textAnchor="middle">Jane Doe</text>
          <text x="80" y="62" fontSize="3.5" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif" textAnchor="middle">Building beautiful things</text>
          {/* CTAs */}
          <rect x="40" y="67" width="32" height="8" rx="4" fill={accent} />
          <text x="56" y="72.5" fontSize="3.5" fontWeight="700" fill="#000" fontFamily="sans-serif" textAnchor="middle">See Work</text>
          <rect x="76" y="67" width="32" height="8" rx="4" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          <text x="92" y="72.5" fontSize="3.5" fill="rgba(255,255,255,0.4)" fontFamily="sans-serif" textAnchor="middle">Say Hello</text>
          {/* Project cards */}
          <rect x="10" y="79" width="40" height="7" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
          <rect x="54" y="79" width="40" height="7" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
          <rect x="98" y="79" width="40" height="7" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
        </svg>
      )
  }
}

export function StepCustomize({ state, dispatch, onNext, onBack }: StepCustomizeProps) {
  const { config, photo } = state
  const photoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return
      if (file.size > 5 * 1024 * 1024) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        dispatch({ type: "SET_PHOTO", file, dataUrl })
      }
      reader.readAsDataURL(file)
    },
    [dispatch]
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 text-balance">Customize Your Portfolio</h2>
        <p className="text-muted-foreground leading-relaxed">
          Choose a design inspired by world-class portfolios, pick your colors, and add your photo.
        </p>
      </div>

      {/* Photo Upload */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Camera className="size-4 text-[var(--persona-accent)]" />
          Your Photo
          <span className="text-xs font-normal text-muted-foreground">(adds a personal touch)</span>
        </h3>
        <div className="flex items-center gap-4">
          {photo.dataUrl ? (
            <div className="relative group">
              <img
                src={photo.dataUrl}
                alt="Your photo"
                className="size-24 rounded-2xl object-cover border-2 border-[var(--persona-accent)]/30 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl"
              />
              <button
                type="button"
                onClick={() => dispatch({ type: "CLEAR_PHOTO" })}
                className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:scale-110"
                aria-label="Remove photo"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex flex-col items-center justify-center size-24 rounded-2xl border-2 border-dashed border-[var(--persona-border)] bg-[var(--persona-surface)] hover:border-[var(--persona-accent)]/50 hover:bg-[var(--persona-surface-hover)] transition-all duration-300 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-1 group-hover:bg-[var(--persona-accent)]/10 transition-colors">
                <User className="size-5 text-muted-foreground group-hover:text-[var(--persona-accent)] transition-colors" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Add Photo</span>
            </button>
          )}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-foreground font-medium">
              {photo.dataUrl ? "Looking great!" : "Upload a profile photo"}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {photo.dataUrl
                ? photo.file?.name
                : "Your photo will be featured prominently in the hero section. Max 5MB."}
            </p>
            {photo.dataUrl && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="text-xs text-[var(--persona-accent)] hover:underline w-fit transition-colors"
              >
                Change photo
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handlePhotoUpload(file)
            }}
            className="hidden"
            aria-label="Upload profile photo"
          />
        </div>
      </div>

      {/* Template Selection */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Template Style</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 stagger-children">
          {TEMPLATE_OPTIONS.map((template) => {
            const isSelected = config.template === template.id && !config.useAITemplate
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => dispatch({ type: "SET_CONFIG", config: { template: template.id, useAITemplate: false } })}
                className={cn(
                  "flex flex-col items-start gap-0 rounded-lg border-2 transition-all duration-300 text-left overflow-hidden group",
                  isSelected
                    ? "border-[var(--persona-accent)] shadow-md shadow-[var(--persona-accent)]/15 scale-[1.02]"
                    : "border-[var(--persona-border)] hover:border-[var(--persona-accent)]/30 hover:shadow-sm"
                )}
              >
                {/* Live preview of the real template; SVG sketch only until a profile exists */}
                <div className={cn(
                  "w-full h-20 flex items-center justify-center overflow-hidden transition-all duration-300",
                  isSelected ? "opacity-100" : "opacity-80 group-hover:opacity-100"
                )}>
                  {state.github.profile ? (
                    <TemplateThumbnail
                      templateId={template.id}
                      label={template.label}
                      profile={state.github.profile}
                      repos={state.github.repos}
                      photoUrl={photo.dataUrl}
                      config={config}
                    />
                  ) : (
                    <TemplatePreview templateId={template.id} isSelected={isSelected} />
                  )}
                </div>
                <div className="flex flex-col gap-0.5 px-2 py-1.5 w-full bg-[var(--persona-surface)] border-t border-[var(--persona-border)]">
                  <div className="flex items-center gap-1">
                    <p className={cn(
                      "text-[11px] font-semibold leading-tight transition-colors truncate",
                      isSelected ? "text-[var(--persona-accent)]" : "text-foreground"
                    )}>
                      {template.label}
                    </p>
                    {isSelected && <Check className="size-3 text-[var(--persona-accent)] ml-auto shrink-0" />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Color Scheme */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Color Scheme</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {(Object.entries(COLOR_SCHEMES) as [ColorScheme, (typeof COLOR_SCHEMES)[ColorScheme]][]).map(
            ([key, scheme]) => {
              const isSelected = config.colorScheme === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => dispatch({ type: "SET_CONFIG", config: { colorScheme: key } })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-300",
                    isSelected
                      ? "border-[var(--persona-accent)] shadow-md shadow-[var(--persona-accent)]/10 scale-105"
                      : "border-[var(--persona-border)] hover:border-muted-foreground/30 hover:scale-[1.03]"
                  )}
                >
                  <div className="flex gap-0.5">
                    <div
                      className="size-4 rounded-full transition-transform duration-300"
                      style={{ backgroundColor: scheme.primary, transform: isSelected ? "scale(1.15)" : "" }}
                    />
                    <div
                      className="size-4 rounded-full"
                      style={{ backgroundColor: scheme.accent }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors",
                      isSelected ? "text-[var(--persona-accent)]" : "text-muted-foreground"
                    )}
                  >
                    {scheme.label}
                  </span>
                </button>
              )
            }
          )}
        </div>
      </div>

      {/* Sections */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Sections to Include</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PORTFOLIO_SECTIONS.map((section) => {
            const isChecked = config.sections.includes(section.id as SectionId)
            return (
              <label
                key={section.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]",
                  isChecked
                    ? "border-[var(--persona-accent)]/40 bg-[var(--persona-accent)]/5"
                    : "border-[var(--persona-border)] hover:border-muted-foreground/30"
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() =>
                    dispatch({ type: "TOGGLE_SECTION", section: section.id as SectionId })
                  }
                />
                <span className="text-sm text-foreground">{section.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Additional Prompt (Optional) */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="size-4 text-[var(--persona-accent)]" />
          Additional Instructions
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Give the AI extra context or specific instructions for your portfolio.</p>
        <textarea
          placeholder="e.g. &quot;Focus on my machine learning experience&quot; or &quot;Make the tone more playful and casual&quot; or &quot;Highlight my open source contributions&quot;"
          value={config.additionalPrompt || ""}
          onChange={(e) => dispatch({ type: "SET_ADDITIONAL_PROMPT", prompt: e.target.value })}
          rows={3}
          className="w-full rounded-xl bg-[var(--persona-surface)] border-2 border-[var(--persona-border)] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--persona-accent)] focus:ring-1 focus:ring-[var(--persona-accent)]/20 transition-all resize-none"
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={config.sections.length === 0}
          className="bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90 gap-2 shadow-lg shadow-[var(--persona-accent)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--persona-accent)]/30 hover:scale-[1.02] active:scale-[0.98]"
          size="lg"
        >
          Generate Portfolio
          <Sparkles className="size-4" />
        </Button>
      </div>
    </div>
  )
}
