"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { useToast } from "../../hooks/use-toast"
import { Upload, CheckCircle, AlertCircle } from "lucide-react"

interface ProcessedBill {
  gst_number?: string | null;
  captcha_data?: {
    captcha_image: string;
    captcha_cookie: string;
  };
  data: {
    gst_number: string | null;
    total_amount: number;
    store_name: string;
    date: string | null;
    address: string | null;
    items: Array<{
      name: string;
      price: number;
      category: string;
    }>;
  };
}

export default function BillScanner() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [processedBill, setProcessedBill] = useState<ProcessedBill | null>(null)
  const [captcha, setCaptcha] = useState("")
  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setProcessedBill(null)
      setValidated(false)
      setCaptcha("")
    }
  }

  const processBill = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("http://localhost:5000/api/process-bill", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setProcessedBill({
          gst_number: data.data.gst_number,
          captcha_data: data.captcha_data,
          data: data.data
        })
        toast({
          title: "Success",
          description: "Bill processed successfully",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process bill",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateGST = async () => {
    if (!processedBill || !captcha || !processedBill.captcha_data) {
      toast({
        title: "Error",
        description: "Please enter the captcha",
        variant: "destructive",
      })
      return
    }

    setValidating(true)

    try {
      const response = await fetch("http://localhost:5000/api/validate-gst", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          gst_number: processedBill.gst_number,
          captcha: captcha,
          captcha_cookie: processedBill.captcha_data.captcha_cookie,
          ai_data: processedBill.data
        }),
      })

      if (response.ok) {
        setValidated(true)
        toast({
          title: "Success",
          description: "GST validated and expense saved successfully",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "GST validation failed",
        variant: "destructive",
      })
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bill Scanner</h1>
        <p className="text-gray-600">Upload or scan your bills for automatic expense tracking</p>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload Bill
          </CardTitle>
          <CardDescription>Upload an image of your bill to extract GST details and categorize expenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bill-upload">Select Bill Image</Label>
            <Input id="bill-upload" type="file" accept="image/*" onChange={handleFileChange} className="mt-1" />
          </div>

          {file && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Selected: {file.name}</p>
              <p className="text-xs text-gray-500">Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}

          <Button onClick={processBill} disabled={!file || loading} className="w-full">
            {loading ? "Processing..." : "Process Bill"}
          </Button>
        </CardContent>
      </Card>

      {/* GST Validation */}
      {processedBill?.gst_number && processedBill.captcha_data && !validated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              GST Validation
            </CardTitle>
            <CardDescription>Complete the captcha to validate the GST number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">GST Number Found:</p>
              <p className="text-lg font-mono bg-gray-100 p-2 rounded">{processedBill.gst_number}</p>
            </div>

            <div>
              <Label>Enter Captcha</Label>
              <div className="flex items-center space-x-4 mt-2">
                <img
                  src={`http://localhost:5000/uploads/${processedBill.captcha_data.captcha_image}`}
                  alt="Captcha"
                  className="border rounded w-32 h-10"
                />
                <Input
                  type="text"
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                  placeholder="Enter captcha"
                  className="max-w-32"
                />
              </div>
            </div>

            <Button onClick={validateGST} disabled={!captcha || validating} className="w-full">
              {validating ? "Validating..." : "Validate GST & Save Expense"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Expense Details */}
      {processedBill?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {validated ? (
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
              )}
              Expense Details
            </CardTitle>
            <CardDescription>
              {validated ? "Expense saved successfully" : "Extracted expense information"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Store Name</p>
                <p className="text-lg">{processedBill.data.store_name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-lg font-bold">${processedBill.data.total_amount}</p>
              </div>
            </div>

            {processedBill.data.items && processedBill.data.items.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Items</p>
                <div className="space-y-2">
                  {processedBill.data.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <p className="font-bold">${item.price}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}