"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Progress } from "../../components/ui/progress"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Calendar, MapPin, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { format } from "date-fns"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

interface DashboardData {
  total_spent: number
  income: number
  remaining_budget: number
  category_breakdown: Record<string, number>
  recent_expenses: Array<{
    _id: string
    store_name: string
    total_amount: number
    date: string
    address?: string
    location?: {
      lat: number
      lon: number
    }
    items: Array<{
      name: string
      price: string
      category: string
    }>
  }>
  expense_count: number
}

// Colors for the pie chart
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-b-blue-600 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-center">Failed to load dashboard data</div>
  }

  const budgetUsedPercentage = (data.total_spent / data.income) * 100
  const isOverBudget = data.remaining_budget < 0

  // Prepare data for pie chart
  const pieChartData = Object.entries(data.category_breakdown).map(([name, value]) => ({
    name,
    value,
  }))

  // Prepare data for bar chart - last 7 expenses by date
  const barChartData = data.recent_expenses
    .slice(0, 7)
    .map((expense) => ({
      name: format(new Date(expense.date), "MMM d"),
      amount: expense.total_amount,
    }))
    .reverse()

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">Track your expenses and manage your budget</p>
      </motion.div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="overflow-hidden border-t-4 border-blue-500 dark:border-blue-400">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.total_spent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{data.expense_count} transactions this month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="overflow-hidden border-t-4 border-green-500 dark:border-green-400">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.income.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Your monthly budget</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card
            className={`overflow-hidden border-t-4 ${isOverBudget ? "border-red-500 dark:border-red-400" : "border-green-500 dark:border-green-400"}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
              {isOverBudget ? (
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500 dark:text-green-400" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${isOverBudget ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
              >
                ${Math.abs(data.remaining_budget).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">{isOverBudget ? "Over budget" : "Left to spend"}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Budget Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Budget Usage</CardTitle>
            <CardDescription>You've used {budgetUsedPercentage.toFixed(1)}% of your monthly budget</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={Math.min(budgetUsedPercentage, 100)}
              className={`w-full h-3 ${
                budgetUsedPercentage > 90
                  ? "bg-red-500"
                  : budgetUsedPercentage > 75
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
            />
            {isOverBudget && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 mr-2" />
                  <span className="text-sm text-red-700 dark:text-red-300">
                    You've exceeded your monthly budget by ${Math.abs(data.remaining_budget).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>Your expenses broken down by category</CardDescription>
            </CardHeader>
            <CardContent>
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value}`, "Amount"]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Spending Trend</CardTitle>
              <CardDescription>Your last 7 transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, "Amount"]} />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  No transaction data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Expenses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Your latest transactions</CardDescription>
            </div>
            <Link to="/map">
              <Button variant="outline" size="sm">
                View on Map
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recent_expenses.map((expense, index) => (
                <motion.div
                  key={expense._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{expense.store_name || "Unknown Store"}</p>
                      {expense.location && <MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(expense.date), "PPP")}
                      </p>
                    </div>
                    {expense.address && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{expense.address}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {expense.items.slice(0, 3).map((item, itemIndex) => (
                        <Badge key={itemIndex} variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      ))}
                      {expense.items.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{expense.items.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${expense.total_amount.toFixed(2)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
