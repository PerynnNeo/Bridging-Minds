// src/screens/TranslateScreen.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  ScrollView,
  Alert,
} from "react-native";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import Constants from "expo-constants";
import { getUserProfile } from '../utils/personalization';

// API keys from app.json / .env
const GOOGLE_STT_API_KEY = Constants?.expoConfig?.extra?.GOOGLE_STT_API_KEY;
const OPENAI_API_KEY = Constants?.expoConfig?.extra?.OPENAI_API_KEY;

// Check if API keys are configured
if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
  console.warn('⚠️ OpenAI API key not configured. Please add your API key to app.json');
} else {
  console.log('✅ OpenAI API key found:', OPENAI_API_KEY.substring(0, 10) + '...');
}

// Mic icons
const micImages = {
  inactive: require("../../assets/mic.png"),
  recording: require("../../assets/mic_recording.png"),
};

// Convert blob → base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Google STT
async function transcribeAudio(uri) {
  const res = await fetch(uri);
  const blob = await res.blob();
  if (blob.size < 1000) throw new Error("No speech detected");

  const base64 = await blobToBase64(blob);

  const apiRes = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_STT_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          languageCode: "en-US",
          enableAutomaticPunctuation: true,
          model: "latest_short",
        },
        audio: { content: base64 },
      }),
    }
  );

  if (!apiRes.ok) {
    const txt = await apiRes.text();
    throw new Error(`STT failed: ${txt}`);
  }
  const json = await apiRes.json();
  const alt = json?.results?.[0]?.alternatives?.[0];
  return alt?.transcript?.trim() || "";
}

// Enhanced OpenAI rewrite with personalization
async function getRewrites(transcript, userProfile = null) {
  // Get user profile for personalization
  const profile = userProfile || await getUserProfile();
  
  // Create personalized system prompt based on user's needs
  const systemPrompt = createPersonalizedSystemPrompt(profile);
  
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { 
          role: "user", 
          content: `Please rewrite this unclear message into COMPLETE, LONGER sentences that include all the user's ideas. Make it clear and autism-friendly with 10-15 words per sentence: "${transcript}"` 
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 200, // Increased for better explanations
    }),
  });

  const data = await res.json();
  
  // Check for API errors
  if (!res.ok) {
    console.error('OpenAI API Error Status:', res.status);
    console.error('OpenAI API Error Response:', data);
    console.error('API Key being used:', OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');
    
    if (res.status === 401) {
      throw new Error(`OpenAI API key is invalid. Status: ${res.status}. Please check your API key in app.json. Error: ${data.error?.message || 'Unauthorized'}`);
    } else if (res.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else {
      throw new Error(`OpenAI API error (${res.status}): ${data.error?.message || 'Unknown error'}`);
    }
  }
  
  // Check if we have valid response data
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid OpenAI response structure:', data);
    throw new Error('Invalid response from OpenAI API');
  }
  
  try {
    const response = data.choices[0].message.content;
    return parseAIResponse(response, transcript);
  } catch (error) {
    console.error('OpenAI response parsing error:', error);
    throw new Error('Failed to parse OpenAI response');
  }
}

// Create personalized system prompt based on user profile
function createPersonalizedSystemPrompt(profile) {
  const basePrompt = `You are a communication assistant helping someone with autism express themselves more clearly. Your job is to COMPLETELY REWRITE their message into EXACTLY 2 clear, autism-friendly options.

CRITICAL RULES FOR AUTISM-FRIENDLY COMMUNICATION:
1. DO NOT just add punctuation - COMPLETELY REWRITE the sentence
2. Fix grammar, word order, and missing words
3. Create COMPLETE, LONGER sentences (10-15 words) that include all the user's ideas
4. Use CONCRETE words, avoid abstract concepts
5. NO idioms, metaphors, or slang
6. Use DIRECT language ("I want" not "I would like")
7. Combine all ideas into ONE complete sentence per option
8. Make it EASIER to understand, not harder
9. Return EXACTLY 2 options as JSON array: ["option1", "option2"]

AUTISM-FRIENDLY REWRITING EXAMPLES:
- "Hello, I want hanburgur cheese one" → ["Hello, I want to order a cheeseburger with cheese", "Can I please have a cheeseburger with cheese on it?"]
- "Hello, I friends. Cannot speak properly to them my friends." → ["Hello, I want to talk to my friends but I cannot speak properly", "I need help talking to my friends because I cannot speak clearly"]
- "I hungry food want" → ["I am hungry and I want some food to eat", "I need food because I am feeling very hungry right now"]
- "Not understand what you saying" → ["I do not understand what you are saying to me", "Can you please explain what you are saying because I do not understand"]
- "Go store need milk" → ["I need to go to the store to buy some milk", "Can we go to the store because I need to get milk"]
- "I want pizza pepperoni" → ["I want to order a pepperoni pizza for dinner", "Can I have a pepperoni pizza with pepperoni on top"]`;

  // Add personalization based on user profile
  let personalizedPrompt = basePrompt;
  
  if (profile) {
    // Age-appropriate language
    if (profile.age <= 10) {
      personalizedPrompt += "\n\nFOR YOUNG CHILD (age 7-10): Use very simple words, short sentences (max 6 words), and concrete examples.";
    } else if (profile.age <= 16) {
      personalizedPrompt += "\n\nFOR TEENAGER (age 11-16): Use clear, direct language appropriate for teens.";
    } else {
      personalizedPrompt += "\n\nFOR YOUNG ADULT (age 17-25): Use mature but clear language.";
    }

    // Communication challenges
    if (profile.challenges && profile.challenges.includes('words')) {
      personalizedPrompt += "\n\nUSER STRUGGLES WITH: Finding the right words - provide very clear, simple alternatives.";
    }
    
    if (profile.challenges && profile.challenges.includes('nervous')) {
      personalizedPrompt += "\n\nUSER FEELS: Nervous about communication - make options very confident and clear.";
    }

    // Learning style
    if (profile.learningStyle === 'visual') {
      personalizedPrompt += "\n\nUSER LEARNS BEST: Visually - include descriptive words that paint a picture.";
    }
  }

  personalizedPrompt += `\n\nMORE EXAMPLES:
- "I'm hungry" → ["I want food", "Can I eat something?", "I need to eat"]
- "That's not fair" → ["I don't like this", "This is wrong", "I want it to be different"]
- "I'm tired" → ["I want to rest", "I need to sleep", "I'm sleepy"]
- "Help me please" → ["I need help", "Can you help me?", "Please help"]
- "Where is bathroom" → ["Where is the bathroom?", "I need to find the bathroom", "Can you show me the bathroom?"]

IMPORTANT: The user has autism. Make sentences SHORTER and SIMPLER. Avoid complex words and phrases. Focus on the main idea only.`;

  return personalizedPrompt;
}

// Parse AI response and handle different formats
function parseAIResponse(response, originalTranscript) {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const validOptions = parsed.filter(option => 
        option && 
        option.trim().length > 0 && 
        option.trim() !== originalTranscript.trim() // Don't return the same as input
      );
      
      // If we have valid rewrites, return only the first 2
      if (validOptions.length > 0) {
        return validOptions.slice(0, 2); // Only return first 2 options
      }
    }
  } catch (e) {
    // If not JSON, try to extract options from text
    const lines = response.split('\n').filter(line => line.trim());
    const options = [];
    
    for (const line of lines) {
      // Look for quoted text or numbered options
      const match = line.match(/"([^"]+)"/) || line.match(/^\d+\.\s*(.+)$/) || line.match(/^-\s*(.+)$/);
      if (match) {
        const option = match[1].trim();
        // Only add if it's different from the original
        if (option !== originalTranscript.trim()) {
          options.push(option);
        }
      }
    }
    
    if (options.length > 0) {
      return options.slice(0, 2); // Only return first 2 options
    }
  }
  
  // Fallback: create simple rewrites if AI fails
  return createFallbackRewrites(originalTranscript);
}

// Create simple fallback rewrites when AI fails
function createFallbackRewrites(transcript) {
  const words = transcript.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  
  // Food-related patterns
  if (words.includes('hamburger') || words.includes('hanburgur') || words.includes('burger')) {
    if (words.includes('cheese')) {
      return ["Hello, I want to order a cheeseburger with cheese on it", "Can I please have a cheeseburger with cheese for my meal?"];
    }
    return ["Hello, I want to order a hamburger for my meal", "Can I please have a hamburger to eat?"];
  }
  
  if (words.includes('pizza')) {
    if (words.includes('pepperoni')) {
      return ["I want to order a pepperoni pizza for dinner tonight", "Can I please have a pepperoni pizza with pepperoni on top?"];
    }
    return ["I want to order a pizza for my meal", "Can I please have a pizza to eat?"];
  }
  
  if (words.includes('hungry') || words.includes('food') || words.includes('eat')) {
    return ["I am hungry and I want some food to eat right now", "I need food because I am feeling very hungry at this moment"];
  }
  
  if (words.includes('tired') || words.includes('sleep')) {
    return ["I am tired and I want to rest for a while", "I need to sleep because I am feeling very tired right now"];
  }
  
  if (words.includes('help')) {
    return ["I need help with something and I do not know what to do", "Can you please help me because I need assistance right now?"];
  }
  
  if (words.includes('bathroom') || words.includes('toilet')) {
    return ["Where is the bathroom because I need to use it?", "I need to find the bathroom so I can use it"];
  }
  
  if (words.includes('friends') || words.includes('friend')) {
    return ["I want to talk to my friends but I need help with communication", "I need help talking to my friends because I cannot speak clearly"];
  }
  
  // Generic fallback
  return [`I want to say something but I need help: ${transcript}`, `Can you help me understand what I am trying to say: ${transcript}`];
}


// Log feedback to backend
async function sendFeedback(payload) {
  try {
    await fetch("https://your-backend.com/api/translator/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("Feedback error:", e);
  }
}

export default function TranslateScreen({ navigation }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingRef, setRecordingRef] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [options, setOptions] = useState([]);
  const [history, setHistory] = useState([]);
  const [statusMsg, setStatusMsg] = useState("Tap the microphone and say something!");
  const [userProfile, setUserProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const [fadeAnim] = useState(new Animated.Value(0));

  // Load user profile and fade in animation
  useEffect(() => {
    loadUserProfile();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Animate pulse on recording
  useEffect(() => {
    if (!isRecording) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 450, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulse]);

  // Start recording
  const startRecording = async () => {
    try {
      setStatusMsg("I'm listening! Speak up!");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") throw new Error("Microphone permission not granted");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await rec.startAsync();
      setRecordingRef(rec);
      setIsRecording(true);

      // auto-stop after 10s
      setTimeout(() => {
        if (isRecording) stopRecording();
      }, 10000);
    } catch (e) {
      Alert.alert("Recording Error", e.message);
      setStatusMsg("Tap the mic and speak naturally.");
    }
  };

  // Stop recording → STT → enhanced AI rewrite
  const stopRecording = async () => {
    try {
      if (!recordingRef) return;
      setIsRecording(false);
      setIsProcessing(true);
      await recordingRef.stopAndUnloadAsync();
      const uri = recordingRef.getURI();
      setRecordingRef(null);
      setStatusMsg("Let me think about what you said...");

      // Step 1: Transcribe audio
      const raw = await transcribeAudio(uri);
      setTranscript(raw);
      setStatusMsg("Making your message clearer...");

      // Step 2: Get personalized rewrites using user profile
      try {
        const rewrites = await getRewrites(raw, userProfile);
        setOptions(rewrites);
        setStatusMsg("Pick the message that sounds right to you!");
      } catch (aiError) {
        console.error('AI rewrite error:', aiError);
        
        // Show user-friendly error message
        if (aiError.message.includes('API key')) {
          Alert.alert(
            "API Key Error", 
            "Please add your OpenAI API key to app.json file. The translator will use fallback options for now.",
            [{ text: "OK" }]
          );
        } else if (aiError.message.includes('rate limit')) {
          Alert.alert(
            "Rate Limit", 
            "Too many requests. Please wait a moment and try again.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert(
            "AI Error", 
            "The AI translator is having issues. Using fallback options.",
            [{ text: "OK" }]
          );
        }
        
        // Use fallback rewrites
        const fallbackRewrites = createFallbackRewrites(raw);
        setOptions(fallbackRewrites);
        setStatusMsg("Here are some basic options (AI unavailable):");
      }
    } catch (e) {
      console.error('Recording/transcription error:', e);
      Alert.alert("Error", e.message);
      setStatusMsg("Tap the microphone and say something!");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // Handle feedback ✅ ❌
  const handleFeedback = async (label, text) => {
    await sendFeedback({
      session_id: "demo-session",
      transcript,
      options,
      chosen_text: text,
      label,
      timestamp: Date.now(),
    });

    if (label === "correct") {
      setHistory((prev) => [text, ...prev].slice(0, 3));
      setTranscript("");
      setOptions([]);
      setStatusMsg("Great job! Tap the microphone and say something!");
    } else {
      // ❌ regenerate new rewrites with enhanced AI
      setStatusMsg("Let me try different ways to say that...");
      try {
        const rewrites = await getRewrites(transcript, userProfile);
        setOptions(rewrites);
        setStatusMsg("Here are some other ways to say it!");
      } catch (error) {
        setStatusMsg("Sorry, let me try again. Tap the microphone!");
      }
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Let's Talk Better</Text>
      </View>

      <Text style={styles.subtitle}>{statusMsg}</Text>

      {/* Mic */}
      <View style={styles.micWrap}>
        <Animated.View style={{ transform: [{ scale: isRecording ? pulse : 1 }] }}>
          <TouchableOpacity
            onPress={toggleRecording}
            style={[styles.micBtn, { opacity: isProcessing ? 0.6 : 1 }]}
            disabled={isProcessing}
          >
            <Image
              source={isRecording ? require('../../assets/mic_recording.png') : require('../../assets/mic.png')}
              style={styles.micIcon}
            />
          </TouchableOpacity>
        </Animated.View>
        
        {/* Processing indicator */}
        {isProcessing && (
          <View style={styles.processingIndicator}>
            <Text style={styles.processingText}>🤖 AI is working...</Text>
          </View>
        )}
      </View>

      {/* Results */}
      <ScrollView style={styles.results} contentContainerStyle={{ paddingBottom: 24 }}>
        {options.length > 0 && (
          <View style={styles.clearMessageCard}>
            <Text style={styles.clearMessageLabel}>Clear Message</Text>
            
            {/* All options displayed together in one unified message */}
            <View style={styles.unifiedMessageContainer}>
              <Text style={styles.unifiedMessageText}>
                {options.join(' • ')}
              </Text>
              <View style={styles.unifiedActionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
                  onPress={() => handleFeedback("correct", options[0])}
                >
                  <Text style={styles.actionBtnText}>Correct</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#ef4444" }]}
                  onPress={() => handleFeedback("incorrect", options[0])}
                >
                  <Text style={styles.actionBtnText}>Wrong</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#3b82f6" }]}
                  onPress={() => Speech.speak(options.join(' '))}
                >
                  <Text style={styles.actionBtnText}>Listen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {history.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Your recent messages</Text>
            {history.map((h, idx) => (
              <Text key={idx} style={styles.cardText}>
                • {h}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0f5" },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ff6b6b',
    borderRadius: 20,
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  title: { fontSize: 36, fontWeight: "900", color: "#d32f2f", flex: 1 },
  subtitle: { fontSize: 24, color: "#e91e63", paddingHorizontal: 20, marginTop: 6, marginBottom: 14, fontWeight: "600" },
  micWrap: { alignItems: "center", marginTop: 8, marginBottom: 6 },
  micBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  micIcon: { width: 120, height: 120 },
  results: { flex: 1, paddingHorizontal: 16, marginTop: 10 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    shadowColor: "#ff6b6b",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#ffebee",
  },
  cardLabel: { fontSize: 20, color: "#e91e63", marginBottom: 8, fontWeight: "700" },
  cardText: { fontSize: 18, color: "#d32f2f", lineHeight: 24, fontWeight: "500" },
  
  // Clear message styles - much bigger
  clearMessageCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    marginVertical: 12,
    shadowColor: "#ff6b6b",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#ffebee",
  },
  clearMessageLabel: { 
    fontSize: 28, 
    color: "#d32f2f", 
    marginBottom: 16, 
    fontWeight: "800",
    textAlign: "center"
  },
  clearMessageOption: { 
    marginBottom: 20,
    alignItems: "center"
  },
  
  // New unified message container styles
  unifiedMessageContainer: {
    backgroundColor: "#fafafa",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  unifiedMessageText: {
    fontSize: 28,
    color: "#d32f2f",
    lineHeight: 36,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  unifiedActionsRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  clearMessageText: { 
    fontSize: 32, 
    color: "#d32f2f", 
    lineHeight: 40, 
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 16
  },
  optionRow: { marginBottom: 12 },
  actionsRow: { flexDirection: "row", marginTop: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    minWidth: 80,
    justifyContent: "center",
  },
  actionBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  
  // Processing indicator styles
  processingIndicator: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffebee',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffcdd2',
  },
  processingText: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '600',
    textAlign: 'center',
  },
});
