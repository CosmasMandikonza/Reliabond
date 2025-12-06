'use client';

// ===========================================
// RELIABOND LOGO - Custom SVG Logo Component
// ===========================================
// A distinctive "bond ring" logo that represents:
// - The circular bond between service and reliability
// - A shield for protection
// - Interconnected nodes (services)

import { motion } from 'framer-motion';

interface ReliabondLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export function ReliabondLogo({ 
  size = 40, 
  animated = true,
  className = '' 
}: ReliabondLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gold/Amber gradient for the bond ring */}
        <linearGradient id="bondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        
        {/* Teal gradient for inner elements */}
        <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer bond ring */}
      <motion.circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="url(#bondGradient)"
        strokeWidth="6"
        strokeLinecap="round"
        initial={animated ? { pathLength: 0, rotate: -90 } : {}}
        animate={animated ? { pathLength: 1, rotate: -90 } : {}}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        style={{ transformOrigin: 'center' }}
      />

      {/* Inner protective circle */}
      <motion.circle
        cx="50"
        cy="50"
        r="32"
        fill="none"
        stroke="url(#tealGradient)"
        strokeWidth="2"
        strokeDasharray="8 4"
        initial={animated ? { opacity: 0 } : {}}
        animate={animated ? { opacity: 1 } : {}}
        transition={{ delay: 0.5, duration: 0.5 }}
      />

      {/* Central shield shape */}
      <motion.path
        d="M50 25 L70 35 L70 55 Q70 70 50 80 Q30 70 30 55 L30 35 Z"
        fill="url(#bondGradient)"
        filter="url(#glow)"
        initial={animated ? { scale: 0 } : {}}
        animate={animated ? { scale: 1 } : {}}
        transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
        style={{ transformOrigin: 'center' }}
      />

      {/* Checkmark inside shield */}
      <motion.path
        d="M42 52 L48 58 L60 44"
        fill="none"
        stroke="#0F172A"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ delay: 0.8, duration: 0.4 }}
      />

      {/* Node dots around the ring */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const x = 50 + 45 * Math.cos((angle - 90) * Math.PI / 180);
        const y = 50 + 45 * Math.sin((angle - 90) * Math.PI / 180);
        return (
          <motion.circle
            key={angle}
            cx={x}
            cy={y}
            r="4"
            fill="url(#tealGradient)"
            initial={animated ? { scale: 0 } : {}}
            animate={animated ? { scale: 1 } : {}}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
          />
        );
      })}
    </svg>
  );
}

// Simple icon version for smaller uses
export function ReliabondIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      
      {/* Simplified bond ring */}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="url(#iconGradient)"
        strokeWidth="2"
      />
      
      {/* Simplified shield */}
      <path
        d="M12 5 L17 7 L17 12 Q17 16 12 19 Q7 16 7 12 L7 7 Z"
        fill="url(#iconGradient)"
      />
      
      {/* Checkmark */}
      <path
        d="M9 12 L11 14 L15 10"
        fill="none"
        stroke="#0F172A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
