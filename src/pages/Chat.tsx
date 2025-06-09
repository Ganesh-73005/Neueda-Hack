"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { useToast } from "../../hooks/use-toast"
import { Send, Bot, User, Shield, AlertTriangle, Copy, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

interface Message {
  id: string
  type: "user" | "bot"
  content: string
  timestamp: Date
  formatted?: boolean
}

interface SpamResult {
  message: string
  detected_links: string[] | string
}

// Component to render formatted text
const FormattedMessage = ({ content }: { content: string }) => {
  const formatText = (text: string) => {
    // Split by lines and process each line
    const lines = text.split("\n")
    const elements: React.ReactNode[] = []

    lines.forEach((line, index) => {
      if (line.trim() === "") {
        elements.push(<br key={`br-${index}`} />)
        return
      }

      const processedLine = line.trim()

      // Handle bullet points first
      if (processedLine.startsWith("•") || processedLine.startsWith("-")) {
        const bulletContent = processedLine.replace(/^[•-]\s*/, "")
        elements.push(
          <div key={index} className="flex items-start space-x-2 my-1 ml-4">
            <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
            <span className="text-sm">{renderInlineFormatting(bulletContent)}</span>
          </div>,
        )
        return
      }

      // Handle section headings (lines that start and end with **)
      if (processedLine.startsWith("**") && processedLine.endsWith("**")) {
        const headingText = processedLine.replace(/^\*\*|\*\*$/g, "")
        elements.push(
          <div key={index} className="font-bold text-lg text-blue-600 dark:text-blue-400 my-3 flex items-center">
            {headingText}
          </div>,
        )
        return
      }

      // Handle lines with emojis and bold text
      elements.push(
        <div key={index} className="my-2">
          {renderInlineFormatting(processedLine)}
        </div>,
      )
    })

    return elements
  }

  const renderInlineFormatting = (text: string) => {
    const parts = []
    let currentIndex = 0

    // Find all **text** patterns
    const boldRegex = /\*\*(.*?)\*\*/g
    let match

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the bold part
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index))
      }

      // Add the bold part
      parts.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-gray-900 dark:text-white">
          {match[1]}
        </strong>,
      )

      currentIndex = match.index + match[0].length
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex))
    }

    return parts.length > 0 ? parts : text
  }

  return <div className="space-y-1 text-sm leading-relaxed">{formatText(content)}</div>
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [spamInput, setSpamInput] = useState("")
  const [spamResults, setSpamResults] = useState<SpamResult[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("http://localhost:5000/api/chat/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ message: input }),
      })

      if (response.ok) {
        const data = await response.json()
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "bot",
          content: data.response,
          timestamp: new Date(),
          formatted: data.formatted || false,
        }
        setMessages((prev) => [...prev, botMessage])
      } else {
        throw new Error("Failed to get response")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    })
  }

  const clearChat = () => {
    setMessages([])
    toast({
      title: "Chat Cleared",
      description: "All messages have been cleared",
    })
  }

  const checkSpam = async () => {
    if (!spamInput.trim()) return

    try {
      const response = await fetch("http://localhost:5000/api/chat/spam-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [spamInput] }),
      })

      if (response.ok) {
        const results = await response.json()
        setSpamResults(results)
      } else {
        throw new Error("Failed to check spam")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check spam",
        variant: "destructive",
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestedQuestions = [
    "How am I doing with my budget this month?",
    "What are my top spending categories?",
    "Give me tips to save money",
    "Analyze my spending patterns",
    "How can I improve my financial health?",
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chat Assistant</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Get personalized financial advice and check messages for spam
        </p>
      </div>

      <Tabs defaultValue="assistant" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assistant">Financial Assistant</TabsTrigger>
          <TabsTrigger value="spam">Spam Checker</TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="space-y-4">
          <Card className="h-[600px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Bot className="w-5 h-5 mr-2" />
                  Financial Assistant
                </CardTitle>
                <CardDescription>Get personalized financial advice based on your spending data</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={clearChat}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Chat
              </Button>
            </CardHeader>
            <CardContent className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">Start a conversation with your financial assistant</p>
                    <p className="text-sm mb-4">Try asking one of these questions:</p>
                    <div className="space-y-2">
                      {suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => setInput(question)}
                          className="block w-full text-left p-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-lg relative group chat-message ${
                        message.type === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {message.type === "user" ? (
                            <User className="w-4 h-4 mr-2" />
                          ) : (
                            <Bot className="w-4 h-4 mr-2" />
                          )}
                          <span className="text-xs opacity-75">{message.timestamp.toLocaleTimeString()}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => copyMessage(message.content)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="formatted-message">
                        {message.formatted ? (
                          <FormattedMessage content={message.content} />
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 max-w-xs px-4 py-3 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Bot className="w-4 h-4 mr-2" />
                        <span className="text-xs opacity-75">Analyzing your finances...</span>
                      </div>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your finances..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spam" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Spam & Phishing Checker
              </CardTitle>
              <CardDescription>Check messages for spam content and suspicious links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Message to Check</label>
                <textarea
                  value={spamInput}
                  onChange={(e) => setSpamInput(e.target.value)}
                  placeholder="Paste the message you want to check for spam..."
                  className="w-full p-3 border rounded-md resize-none h-24 dark:bg-gray-800 dark:border-gray-700"
                />
              </div>

              <Button onClick={checkSpam} disabled={!spamInput.trim()} className="w-full">
                <Shield className="w-4 h-4 mr-2" />
                Check for Spam
              </Button>

              {spamResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">Results:</h3>
                  {spamResults.map((result, index) => (
                    <div key={index} className="p-4 border rounded-lg dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Message Analysis</span>
                        <Badge
                          variant={result.message === "scam" ? "destructive" : "default"}
                          className="flex items-center"
                        >
                          {result.message === "scam" ? (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          ) : (
                            <Shield className="w-3 h-3 mr-1" />
                          )}
                          {result.message === "scam" ? "Potential Scam" : "Safe"}
                        </Badge>
                      </div>

                      <div>
                        <span className="text-sm font-medium">Links Analysis: </span>
                        {typeof result.detected_links === "string" ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400">{result.detected_links}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.detected_links.map((link, linkIndex) => (
                              <Badge key={linkIndex} variant={link === "suspicious" ? "destructive" : "secondary"}>
                                {link === "suspicious" ? "Suspicious Link" : "Safe Link"}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
