from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
from bson import ObjectId
import re
import requests
import base64
import random
import os
import tempfile
import json
from datetime import datetime, timedelta
import uuid
from llama_index.llms.groq import Groq
import pytesseract
from PIL import Image

# Configure Tesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Users\ganes\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'

app = Flask(__name__)
CORS(app)

# Configuration
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-this'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

jwt = JWTManager(app)

# MongoDB Configuration
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client.expense_tracker

# Collections
users_collection = db.users
expenses_collection = db.expenses
gst_details_collection = db.gst_details

# Constants for GST API
class CONSTANTS:
    GST_REGEX = re.compile(r'[0-9]{2}[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[1-9A-Za-z]{1}[Zz1-9A-Ja-j]{1}[0-9a-zA-Z]{1}')
    CAPTCHA_REGEX = re.compile(r'^([0-9]){6}$')
    GST_DETAILS_URL = "https://services.gst.gov.in/services/api/search/taxpayerDetails"
    GST_CAPTCHA_URL = "https://services.gst.gov.in/services/captcha?rnd="
    INVALID_GST_CODE = "SWEB_9035"
    INVALID_CAPTCHA_CODE = "SWEB_9000"
    CAPTCHA_COOKIE_STRING = "CaptchaCookie"

# API Keys
GROQ_API_KEY = "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"

# Initialize Groq client
class GroqChatBot:
    def __init__(self):
        self.llm = Groq(
            model="llama3-70b-8192",
            api_key=GROQ_API_KEY,
            temperature=0.7
        )

groq_bot = GroqChatBot()

# Ensure uploads directory exists
UPLOADS_DIR = "uploads"
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

# Geocoding function to get coordinates from address
def geocode_address(address):
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1"
        headers = {"User-Agent": "ExpenseTrackerApp/1.0"}
        response = requests.get(url, headers=headers)
        data = response.json()
        
        if data and len(data) > 0:
            return {
                "lat": float(data[0]["lat"]),
                "lon": float(data[0]["lon"]),
                "display_name": data[0]["display_name"]
            }
        return None
    except Exception as e:
        print(f"Geocoding error: {e}")
        return None

# Authentication Routes (same as before)
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    if users_collection.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400
    
    hashed_password = generate_password_hash(password)
    user_id = str(uuid.uuid4())
    
    user = {
        "_id": user_id,
        "email": email,
        "password": hashed_password,
        "profile_completed": False,
        "created_at": datetime.utcnow()
    }
    
    users_collection.insert_one(user)
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user_id,
            "email": email,
            "profile_completed": False
        }
    })

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    user = users_collection.find_one({"email": email})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401
    
    access_token = create_access_token(identity=user["_id"])
    
    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user["_id"],
            "email": user["email"],
            "profile_completed": user.get("profile_completed", False),
            "name": user.get("name"),
            "age": user.get("age"),
            "income": user.get("income")
        }
    })

# Text extraction and processing functions
def extract_text_from_image(image_path):
    try:
        print(f"Extracting text from image: {image_path}")
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        print(f"Extracted text (first 100 chars): {text[:100]}...")
        return text.strip()
    except Exception as e:
        print(f"Error in extract_text_from_image: {str(e)}")
        return None

def get_gst_captcha_data():
    try:
        url = f"{CONSTANTS.GST_CAPTCHA_URL}{random.random()}"
        captcha_response = requests.get(url, stream=True)
        base64_image = base64.b64encode(captcha_response.content).decode('utf-8')

        cookie_header = captcha_response.headers.get('Set-Cookie', '')
        captcha_cookie = ""
        for cookie in cookie_header.split(';'):
            if CONSTANTS.CAPTCHA_COOKIE_STRING in cookie:
                captcha_cookie = cookie.split('=')[1]
                break

        captcha_filename = f"captcha_{random.randint(1000, 9999)}.png"
        captcha_filepath = os.path.join(UPLOADS_DIR, captcha_filename)
        
        with open(captcha_filepath, "wb") as f:
            f.write(base64.b64decode(base64_image))

        return {
            "captcha_image": captcha_filename,
            "captcha_cookie": captcha_cookie
        }
    except Exception as error:
        print(f"Error in get_gst_captcha_data: {str(error)}")
        return None

def validate_gst_with_govt(gst_number, captcha, captcha_cookie):
    try:
        payload = {"gstin": gst_number, "captcha": captcha}
        headers = {"cookie": f"CaptchaCookie={captcha_cookie}"}
        
        gst_response = requests.post(CONSTANTS.GST_DETAILS_URL, json=payload, headers=headers)
        gst_data = gst_response.json()
        
        if gst_data.get("errorCode") == CONSTANTS.INVALID_GST_CODE:
            return None, "Invalid GST number"
        elif gst_data.get("errorCode") == CONSTANTS.INVALID_CAPTCHA_CODE:
            return None, "Invalid captcha"

        return gst_data, None
    except Exception as e:
        print(f"Error validating GST: {str(e)}")
        return None, "GST validation failed"

def process_text_with_ai(text):
    try:
        prompt = f"""Analyze this invoice text and extract structured data. Follow these rules:
        1. GST number must be in 22AAAAA0000A1Z5 format or null
        2. For categories, choose from: Food, Electronics, Clothing, Utilities, Transportation, Healthcare, Entertainment, Other
        3. Return ONLY valid JSON in this exact format:
        {{
            "gst_number": "string or null",
            "total_amount": float,
            "store_name": "string",
            "date": "YYYY-MM-DD or null",
            "address": "string or null",
            "items": [
                {{
                    "name": "string",
                    "price": float,
                    "category": "string (never null)"
                }}
            ]
        }}
        
        Invoice Text:
        {text[:3000]}"""  # Truncate to avoid token limits

        response = groq_bot.llm.complete(prompt)
        response_text = response.text.strip()
        
        # Debugging
        print(f"AI Raw Response:\n{response_text}")

        # Parse JSON with multiple fallbacks
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            try:
                # Try extracting from markdown
                json_str = re.search(r'```json\n(.*?)\n```', response_text, re.DOTALL).group(1)
                data = json.loads(json_str)
            except (AttributeError, json.JSONDecodeError):
                # Final fallback - find first JSON object
                json_str = re.search(r'\{.*\}', response_text, re.DOTALL).group(0)
                data = json.loads(json_str)

        # Ensure categories are never null
        if 'items' in data:
            for item in data['items']:
                item['category'] = item.get('category', 'Other')
                
        return data

    except Exception as e:
        print(f"AI Processing Error: {str(e)}")
        # Fallback to minimal data extraction
        gst_match = CONSTANTS.GST_REGEX.search(text)
        return {
            "gst_number": gst_match.group(0) if gst_match else None,
            "total_amount": None,
            "store_name": None,
            "date": None,
            "address": None,
            "items": []
        }


@app.route('/api/process-bill', methods=['POST'])
@jwt_required()
def process_bill():
    user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save and process image
            file_path = os.path.join(temp_dir, file.filename)
            file.save(file_path)
            extracted_text = extract_text_from_image(file_path)
            
            if not extracted_text:
                return jsonify({"error": "Text extraction failed"}), 400

            # Process with AI
            ai_data = process_text_with_ai(extracted_text)
            
            # Prepare response
            response_data = {
                "success": True,
                "data": ai_data
            }

            # Only include captcha data if GST number exists
            if ai_data.get('gst_number'):
                captcha_data = get_gst_captcha_data()
                if captcha_data:
                    response_data['captcha_data'] = captcha_data
                else:
                    print("Warning: GST found but captcha failed")

            return jsonify(response_data)

    except Exception as e:
        print(f"Process Bill Error: {str(e)}")
        return jsonify({"error": "Processing failed"}), 500


@app.route("/api/validate-gst", methods=["POST"])
@jwt_required()
def validate_gst():
    user_id = get_jwt_identity()
    data = request.json
    
    gst_number = data.get("gst_number")
    captcha = data.get("captcha")
    captcha_cookie = data.get("captcha_cookie")
    ai_data = data.get("ai_data")

    if not all([gst_number, captcha, captcha_cookie]):
        return jsonify({"error": "Missing required fields"}), 400

    # Step 1: Validate with government API
    gst_data, error = validate_gst_with_govt(gst_number, captcha, captcha_cookie)
    if error:
        return jsonify({"error": error}), 400

    # Step 2: Geocode address
    address = gst_data.get("pradr", {}).get("adr", "") or ai_data.get("address")
    location_data = geocode_address(address) if address else None

    # Step 3: Save GST details
    gst_details = {
        "user_id": user_id,
        "gst_number": gst_number,
        "business_name": gst_data.get("tradeNam", "") or ai_data.get("store_name"),
        "address": address,
        "location": location_data,
        "created_at": datetime.utcnow()
    }
    gst_details_collection.insert_one(gst_details)

    # Step 4: Save expense if we have AI data
    if ai_data:
        expense = {
            "user_id": user_id,
            "gst_number": gst_number,
            "store_name": ai_data.get("store_name", ""),
            "total_amount": float(ai_data.get("total_amount", 0)),
            "items": ai_data.get("items", []),
            "date": ai_data.get("date") or datetime.utcnow().isoformat(),
            "address": address,
            "location": location_data,
            "created_at": datetime.utcnow()
        }
        expenses_collection.insert_one(expense)

    return jsonify({
        "success": True,
        "gst_data": gst_data,
        "location_data": location_data,
        "expense_saved": bool(ai_data)
    })
# Dashboard Routes
@app.route("/api/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard():
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": user_id})
    
    # Get expenses for the current month
    current_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    expenses = list(expenses_collection.find({
        "user_id": user_id,
        "created_at": {"$gte": current_month}
    }))
    
    total_spent = sum(expense.get("total_amount", 0) for expense in expenses)
    income = user.get("income", 0)
    remaining_budget = income - total_spent
    
    # Category breakdown
    category_totals = {}
    for expense in expenses:
        for item in expense.get("items", []):
            category = item.get("category", "Other")
            category_totals[category] = category_totals.get(category, 0) + float(item.get("price", 0))
    
    # Recent expenses
    recent_expenses = list(expenses_collection.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(10))
    
    # Convert ObjectId to string for JSON serialization
    for expense in recent_expenses:
        expense["_id"] = str(expense["_id"])
    
    return jsonify({
        "total_spent": total_spent,
        "income": income,
        "remaining_budget": remaining_budget,
        "category_breakdown": category_totals,
        "recent_expenses": recent_expenses,
        "expense_count": len(expenses)
    })

# Map Data Route
@app.route("/api/map-data", methods=["GET"])
@jwt_required()
def get_map_data():
    user_id = get_jwt_identity()
    
    # Get all expenses with location data
    expenses = list(expenses_collection.find({
        "user_id": user_id,
        "location": {"$ne": None}
    }).sort("created_at", -1))
    
    # Format data for map
    map_data = []
    for expense in expenses:
        if expense.get("location"):
            map_data.append({
                "id": str(expense["_id"]),
                "store_name": expense.get("store_name", "Unknown Store"),
                "date": expense.get("date"),
                "total_amount": expense.get("total_amount", 0),
                "address": expense.get("address", ""),
                "location": expense.get("location"),
                "items": expense.get("items", [])
            })
    print(map_data)
    return jsonify(map_data)

# Chatbot Routes
@app.route("/api/chat/spam-check", methods=["POST"])
def check_spam():
    data = request.json
    messages = data.get("messages", [])

    if not messages or not isinstance(messages, list):
        return jsonify({"error": "Invalid input. Provide a list of messages."}), 400

    results = []
    for msg in messages:
        if loaded_model:
            spam_prediction = loaded_model.predict([msg])[0]
            is_spam = "scam" if spam_prediction == "spam" else "safe"
        else:
            is_spam = "safe"  # Default if model not loaded

        extracted_links = extract_links(msg)
        detected_links = []
        
        for link in extracted_links:
            if link in phishing_urls:
                detected_links.append("suspicious")
            else:
                detected_links.append("safe")

        result = {
            "message": is_spam,
            "detected_links": detected_links if detected_links else "no links found"
        }
        results.append(result)

    return jsonify(results)

@app.route("/api/chat/assistant", methods=["POST"])
@jwt_required()
def chat_assistant():
    user_id = get_jwt_identity()
    data = request.json
    message = data.get("message", "")
    
    if not message:
        return jsonify({"error": "Message required"}), 400
    
    # Get user data for context
    user = users_collection.find_one({"_id": user_id})
    expenses = list(expenses_collection.find({"user_id": user_id}).sort("created_at", -1).limit(50))
    
    # Calculate financial metrics
    current_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_expenses = list(expenses_collection.find({
        "user_id": user_id,
        "created_at": {"$gte": current_month}
    }))
    
    total_monthly_spent = sum(exp.get('total_amount', 0) for exp in monthly_expenses)
    monthly_income = user.get('income', 0)
    remaining_budget = monthly_income - total_monthly_spent
    
    # Category breakdown
    category_totals = {}
    for expense in monthly_expenses:
        for item in expense.get("items", []):
            category = item.get("category", "Other")
            category_totals[category] = category_totals.get(category, 0) + float(item.get("price", 0))
    
    # Top spending categories
    top_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Recent transactions summary
    recent_stores = [exp.get('store_name', 'Unknown') for exp in monthly_expenses[:10] if exp.get('store_name')]
    
    # Prepare enhanced context
    context = f"""
    You are a professional personal finance assistant. Provide helpful, well-formatted responses using the following structure:

    **FORMATTING GUIDELINES:**
    - dont Use **bold** for important numbers and headings
    - Use bullet points (•) for lists
    - Use line breaks (\n) for better readability
    - Include relevant emojis for visual appeal
    - Structure responses with clear sections
    - Provide actionable advice

    **USER FINANCIAL PROFILE:**
    👤 **Name:** {user.get('name', 'N/A')}
    🎂 **Age:** {user.get('age', 'N/A')}
    💰 **Monthly Income:** ${monthly_income:,.2f}

    **CURRENT MONTH FINANCIAL SUMMARY:**
    📊 **Total Spent:** ${total_monthly_spent:,.2f}
    💳 **Transactions:** {len(monthly_expenses)}
    💵 **Remaining Budget:** ${remaining_budget:,.2f}
    📈 **Budget Usage:** {(total_monthly_spent/monthly_income*100) if monthly_income > 0 else 0:.1f}%

    **TOP SPENDING CATEGORIES:**
    {chr(10).join([f"• **{cat}:** ${amount:,.2f}" for cat, amount in top_categories]) if top_categories else "• No spending data available"}

    **RECENT STORES:**
    {chr(10).join([f"• {store}" for store in list(set(recent_stores))[:5]]) if recent_stores else "• No recent transactions"}

    **FINANCIAL HEALTH INDICATORS:**
    • Budget Status: {"🔴 Over Budget" if remaining_budget < 0 else "🟢 Within Budget" if remaining_budget > monthly_income * 0.2 else "🟡 Tight Budget"}
    • Savings Rate: {((monthly_income - total_monthly_spent) / monthly_income * 100) if monthly_income > 0 else 0:.1f}%

    Always provide personalized, actionable financial advice based on this data. Format your response clearly with sections, bullet points, and relevant emojis.
    """
    
    
    
    try:
        prompt = f"{context}\n\n**USER QUESTION:** {message}\n\nProvide a well-formatted, helpful response:"
        response = groq_bot.llm.complete(prompt)
        print(response.text)  # Debugging output
        return jsonify({
            "response": response.text,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        print(f"Error in chat assistant: {e}")
        return jsonify({"error": "Failed to get response from assistant"}), 500


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    if filename == 'undefined':
        return jsonify({"error": "Invalid filename"}), 400
    return send_from_directory(UPLOADS_DIR, filename)

if __name__ == "__main__":
    app.run(debug=True, port=5000)