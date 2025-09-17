# 🔑 API Key Setup Instructions

## OpenAI API Key Setup

### Step 1: Get Your OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the API key (starts with `sk-`)

### Step 2: Add to Your App
1. Open `app.json` file
2. Find the line: `"OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE"`
3. Replace `YOUR_OPENAI_API_KEY_HERE` with your actual API key
4. Save the file

### Example:
```json
"extra": {
  "GOOGLE_STT_API_KEY": "AIzaSyBjXIUkoDTbqg1MTkKoQjexc49LXsHUjS4",
  "OPENAI_API_KEY": "sk-your-actual-api-key-here"
}
```

### Step 3: Restart the App
After adding the API key, restart your Expo development server:
```bash
npx expo start --clear
```

## ✅ What This Fixes

- **401 Unauthorized errors** - API key authentication
- **Better error handling** - User-friendly error messages
- **Fallback system** - App works even if AI fails
- **Clear instructions** - Users know what to do if something goes wrong

## 🔧 Error Messages You'll See

- **"API Key Error"** - Add your OpenAI API key to app.json
- **"Rate Limit"** - Too many requests, wait and try again
- **"AI Error"** - AI service issues, using fallback options

## 💡 Fallback System

If the AI fails, the app will automatically use simple fallback options:
- **Friends:** "I want to talk to my friends", "I need help with friends"
- **Hungry:** "I want food", "I am hungry", "Can I eat something?"
- **Help:** "I need help", "Can you help me?", "Please help"

The app will continue to work even without the AI, just with simpler options!
