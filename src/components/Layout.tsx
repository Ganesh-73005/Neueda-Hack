"use client"

import type React from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import { Button } from "../../components/ui/button"
import { Home, Scan, MessageCircle, LogOut, Map, Sun, Moon, Laptop, Menu, X } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu"

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Scan Bill", href: "/scan", icon: Scan },
    { name: "Expense Map", href: "/map", icon: Map },
    { name: "Chat", href: "/chat", icon: MessageCircle },
  ]

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Desktop Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                  ExpenseTracker
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        location.pathname === item.href
                          ? "border-blue-500 text-gray-900 dark:text-white"
                          : "border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                      } transition-colors duration-200`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full">
                    {theme === "light" && <Sun className="h-[1.2rem] w-[1.2rem]" />}
                    {theme === "dark" && <Moon className="h-[1.2rem] w-[1.2rem]" />}
                    {theme === "system" && <Laptop className="h-[1.2rem] w-[1.2rem]" />}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Laptop className="mr-2 h-4 w-4" />
                    <span>System</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || user?.email}`} />
                  <AvatarFallback>{user?.name ? getInitials(user.name) : "U"}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200">
                  {user?.name || user?.email}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200"
          >
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      location.pathname === item.href
                        ? "border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    } transition-colors duration-200`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || user?.email}`} />
                    <AvatarFallback>{user?.name ? getInitials(user.name) : "U"}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800 dark:text-white">{user?.name}</div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{user?.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between px-4 py-2">
                  <span className="text-gray-600 dark:text-gray-300">Theme</span>
                  <div className="flex space-x-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setTheme("system")}
                    >
                      <Laptop className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    logout()
                    setMobileMenuOpen(false)
                  }}
                >
                  <div className="flex items-center">
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign out
                  </div>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
