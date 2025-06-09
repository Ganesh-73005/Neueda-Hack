"use client"

import type React from "react"
import { useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { useToast } from "../../hooks/use-toast"

export default function Profile() {
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [income, setIncome] = useState("")
  const [loading, setLoading] = useState(false)
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()

  if (!user) {
    return <Navigate to="/login" />
  }

  if (user.profile_completed) {
    return <Navigate to="/" />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await updateProfile(name, Number.parseInt(age), Number.parseFloat(income))
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Profile update failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>Please provide some basic information to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                min="18"
                max="100"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="income">Monthly Income ($)</Label>
              <Input
                id="income"
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                required
                min="0"
                step="0.01"
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
