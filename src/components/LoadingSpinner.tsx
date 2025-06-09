"use client"

import { motion } from "framer-motion"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
}

export default function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        className={`${sizeClasses[size]} border-4 border-t-blue-600 border-b-blue-600 border-l-transparent border-r-transparent rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-gray-600 dark:text-gray-300"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}
