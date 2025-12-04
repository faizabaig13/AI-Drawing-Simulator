import React from "react";
import { motion } from "framer-motion";


interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard = ({ children, className = "", onClick, hoverEffect = true }: GlassCardProps) => {
  return (
    <motion.div
      whileHover={hoverEffect ? { scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" } : {}}
      whileTap={hoverEffect ? { scale: 0.98 } : {}}
      className={`backdrop-blur-xl bg-white/5 border border-white/10 shadow-lg ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};
