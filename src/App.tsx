"use client"

import type React from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { Toaster } from "../components/ui/toaster"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Profile from "./pages/Profile"
import Dashboard from "./pages/Dashboard"
import BillScanner from "./pages/BillScanner"
import Chat from "./pages/Chat"
import ExpenseMap from "./pages/ExpenseMap"
import Layout from "./components/Layout"
import  {ThemeProvider } from "./contexts/ThemeContext"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-b-blue-600 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (!user.profile_completed) {
    return <Navigate to="/profile" />
  }

  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/profile" element={<Profile />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scan"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BillScanner />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Chat />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ExpenseMap />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
