"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

interface User {
  id: string
  email: string
  name?: string
  age?: number
  income?: number
  profile_completed: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (name: string, age: number, income: number) => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/user", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        localStorage.removeItem("token")
      }
    } catch (error) {
      console.error("Error fetching user:", error)
      localStorage.removeItem("token")
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Login failed")
    }

    const data = await response.json()
    localStorage.setItem("token", data.access_token)
    setUser(data.user)
  }

  const signup = async (email: string, password: string) => {
    const response = await fetch("http://localhost:5000/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Signup failed")
    }

    const data = await response.json()
    localStorage.setItem("token", data.access_token)
    setUser(data.user)
  }

  const updateProfile = async (name: string, age: number, income: number) => {
    const response = await fetch("http://localhost:5000/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ name, age, income }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Profile update failed")
    }

    setUser((prev) => (prev ? { ...prev, name, age, income, profile_completed: true } : null))
  }

  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
  }

  const value = {
    user,
    login,
    signup,
    logout,
    updateProfile,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
