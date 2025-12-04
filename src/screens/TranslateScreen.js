// src/screens/TranslateScreen.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from "react-native";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import Constants from "expo-constants";
import { getUserProfile } from "../utils/personalization";
import { colors, radii, typography } from "../utils/theme";
import { Mic } from "lucide-react-native";
import * as FileSystem from 'expo-file-system';

// 🔐 API keys from app.config.js (.env → app.config.js → extra)
const { OPENAI_API_KEY, GOOGLE_STT_API_KEY } = (Constants.expoConfig?.extra ?? Constants?.manifestExtra ?? {});

if (!OPENAI_API_KEY) {
  console.warn(
    "OPENAI_API_KEY is missing. Set it in your .env and app.config.js (extra.OPENAI_API_KEY)."
  );
}
if (!GOOGLE_STT_API_KEY) {
  console.warn(
    "GOOGLE_STT_API_KEY is missing. Set it in your .env and app.config.js (extra.GOOGLE_STT_API_KEY)."
  );
}

// Mic icons (vector)

// Convert blob → base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Google STT (robust native handling)
async function transcribeAudio(uri) {
  if (!GOOGLE_STT_API_KEY) {
    throw new Error(
      "Google STT key missing. Add GOOGLE_STT_API_KEY to your .env and app.config.js."
    );
  }

  let base64;
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    if (blob.size < 1000) throw new Error("No speech detected");
    base64 = await blobToBase64(blob);
  } else {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) throw new Error('Recording file was not created');
    if (fileInfo.size < 1000) throw new Error('Recording is too short. Please speak longer.');
    base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }

  const apiRes = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_STT_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          languageCode: "en-US",
          enableAutomaticPunctuation: true,
          model: Platform.OS === 'web' ? 'latest_short' : 'phone_call',
          useEnhanced: Platform.OS !== 'web',
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
  if (!OPENAI_API_KEY) {
    // Fall back immediately if key missing; caller will catch and use fallback
    throw new Error("OpenAI API key is missing");
  }

  const profile = userProfile || (await getUserProfile());
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
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            `Please rewrite this unclear message into COMPLETE, LONGER sentences that include all the user's ideas. ` +
            `Make it clear and autism-friendly with 10-15 words per sentence: "${transcript}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("OpenAI API Error Status:", res.status);
    console.error("OpenAI API Error Response:", data);
    throw new Error(
      data?.error?.message || `OpenAI API error (status ${res.status})`
    );
  }

  if (!data.choices?.[0]?.message) {
    console.error("Invalid OpenAI response structure:", data);
    throw new Error("Invalid response from OpenAI API");
  }

  try {
    const response = data.choices[0].message.content;
    return parseAIResponse(response, transcript);
  } catch (error) {
    console.error("OpenAI response parsing error:", error);
    throw new Error("Failed to parse OpenAI response");
  }
}

// Create personalized system prompt based on user profile
function createPersonalizedSystemPrompt(profile) {
  const basePrompt = `You are a communication assistant helping someone with autism express themselves more clearly. Your job is to COMPLETELY REWRITE their message into ONE clear, simple sentence that is easy for them to say out loud.

CRITICAL RULES FOR AUTISM-FRIENDLY COMMUNICATION:
1. DO NOT just add punctuation - COMPLETELY REWRITE the sentence
2. Fix grammar, word order, and missing words
3. Create ONE COMPLETE, CLEAR sentence (8-12 words) that includes all the user's ideas
4. Use CONCRETE words, avoid abstract concepts
5. NO idioms, metaphors, or slang
6. Use DIRECT language ("I want" not "I would like")
7. Make it EASY to say out loud - simple words, clear structure
8. Make it EASIER to understand, not harder
9. Return EXACTLY 1 sentence as a string (NOT an array, NOT multiple sentences)

IMPORTANT: You must return ONLY ONE sentence. Do not return multiple options, arrays, bullet points, or multiple sentences. Just return the single rewritten sentence as plain text. NO bullet points (•) or separators.

AUTISM-FRIENDLY REWRITING EXAMPLES:
- "Hello, I want hanburgur cheese one" → "I want to order a cheeseburger with cheese"
- "Hello, I friends. Cannot speak properly to them my friends." → "I want to talk to my friends but I have trouble speaking clearly"
- "I hungry food want" → "I am hungry and I need food to eat"
- "Not understand what you saying" → "I do not understand what you are saying"
- "Go store need milk" → "I need to go to the store to buy milk"
- "I want pizza pepperoni" → "I want to order a pepperoni pizza for dinner"`;

  let personalizedPrompt = basePrompt;

  if (profile) {
    if (profile.age <= 10) {
      personalizedPrompt +=
        "\n\nFOR YOUNG CHILD (age 7-10): Use very simple words, short sentences (max 6 words), and concrete examples.";
    } else if (profile.age <= 16) {
      personalizedPrompt +=
        "\n\nFOR TEENAGER (age 11-16): Use clear, direct language appropriate for teens.";
    } else {
      personalizedPrompt +=
        "\n\nFOR YOUNG ADULT (age 17-25): Use mature but clear language.";
    }

    if (profile.challenges?.includes("words")) {
      personalizedPrompt +=
        "\n\nUSER STRUGGLES WITH: Finding the right words - provide very clear, simple alternatives.";
    }
    if (profile.challenges?.includes("nervous")) {
      personalizedPrompt +=
        "\n\nUSER FEELS: Nervous about communication - make options very confident and clear.";
    }
    if (profile.learningStyle === "visual") {
      personalizedPrompt +=
        "\n\nUSER LEARNS BEST: Visually - include descriptive words that paint a picture.";
    }
  }

  personalizedPrompt += `

MORE EXAMPLES:
- "I'm hungry" → "I am hungry and I need food to eat"
- "That's not fair" → "I do not like this because it is not fair"
- "I'm tired" → "I am tired and I want to rest for a while"
- "Help me please" → "I need help with this task right now"
- "Where is bathroom" → "I need to find the bathroom so I can use it"
- "I want fries hamburger" → "I want to order fries and a hamburger for my meal"

CRITICAL: Always provide EXACTLY ONE clear, simple sentence that is easy to say out loud:
- Use direct language (I want/need/have)
- Keep it simple and clear
- Make it easy for someone with autism to speak
- Focus on the main idea only
- Return ONLY the sentence, no explanations or multiple options

IMPORTANT: The user has autism. Make sentences SHORTER and SIMPLER. Avoid complex words and phrases. Focus on the main idea only. Return ONLY ONE sentence as plain text.

FINAL REMINDER: Return exactly ONE sentence. No bullet points (•), no multiple options, no arrays. Just one clear sentence that the user can say out loud.`;

  return personalizedPrompt;
}

// Parse AI response and handle different formats
function parseAIResponse(response, originalTranscript) {
  try {
    // Try to parse as JSON first (in case AI still returns array)
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // If AI returns array, take only the first valid option
      const validOption = parsed.find(
        (option) =>
          option &&
          option.trim().length > 0 &&
          option.trim() !== originalTranscript.trim()
      );
      if (validOption) {
        return [validOption.trim()];
      }
    } else if (typeof parsed === 'string' && parsed.trim().length > 0) {
      // Single string response
      return [parsed.trim()];
    }
  } catch (_) {
    // Not JSON; treat as plain text
    const cleanResponse = response.trim();
    
    // Split on bullet points and take only the first sentence
    const sentences = cleanResponse.split(/[•·]/);
    const firstSentence = sentences[0]
      .replace(/^[-•]\s*/, '') // Remove bullet points
      .replace(/^\d+\.\s*/, '') // Remove numbers
      .replace(/^["']|["']$/g, '') // Remove quotes
      .trim();
    
    if (firstSentence && firstSentence !== originalTranscript.trim()) {
      return [firstSentence];
    }
  }
  
  // Fallback to single sentence
  return [createFallbackSingleSentence(originalTranscript)];
}

// Create single fallback sentence when AI fails
function createFallbackSingleSentence(transcript) {
  const words = transcript.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.includes("hamburger") || words.includes("hanburgur") || words.includes("burger")) {
    if (words.includes("cheese")) {
      return "I want to order a cheeseburger with cheese";
    }
    if (words.includes("fries") || words.includes("fry")) {
      return "I want to order a hamburger with fries";
    }
    return "I want to order a hamburger";
  }

  if (words.includes("pizza")) {
    if (words.includes("pepperoni")) {
      return "I want to order a pepperoni pizza";
    }
    return "I want to order a pizza";
  }

  if (words.includes("hungry") || words.includes("food") || words.includes("eat")) {
    return "I am hungry and I need food to eat";
  }

  if (words.includes("tired") || words.includes("sleep")) {
    return "I am tired and I want to rest";
  }

  if (words.includes("help")) {
    return "I need help with this task";
  }

  if (words.includes("bathroom") || words.includes("toilet")) {
    return "I need to find the bathroom";
  }

  if (words.includes("friends") || words.includes("friend")) {
    return "I want to talk to my friends";
  }

  if (words.includes("water") || words.includes("drink")) {
    return "I am thirsty and I need water";
  }

  if (words.includes("home") || words.includes("house")) {
    return "I want to go home";
  }

  // Generic fallback
  return `I want to say: ${transcript}`;
}

// Create simple fallback rewrites when AI fails (legacy function)
function createFallbackRewrites(transcript) {
  const words = transcript.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.includes("hamburger") || words.includes("hanburgur") || words.includes("burger")) {
    if (words.includes("cheese")) {
      return [
        "I want to order a cheeseburger with cheese on it",
        "Can I please have a cheeseburger with extra cheese?",
      ];
    }
    if (words.includes("fries") || words.includes("fry")) {
      return [
        "I want to order a hamburger with fries for my meal",
        "Can I please have a hamburger and some fries to eat?",
      ];
    }
    return [
      "I want to order a hamburger for my meal",
      "Can I please have a hamburger to eat?",
    ];
  }

  if (words.includes("pizza")) {
    if (words.includes("pepperoni")) {
      return [
        "I want to order a pepperoni pizza for dinner tonight",
        "Can I please have a pepperoni pizza with lots of pepperoni?",
      ];
    }
    return [
      "I want to order a pizza for my meal",
      "Can I please have a pizza to eat?",
    ];
  }

  if (words.includes("hungry") || words.includes("food") || words.includes("eat")) {
    return [
      "I am hungry and I need food to eat right now",
      "Can I get something to eat because I am very hungry?",
    ];
  }

  if (words.includes("tired") || words.includes("sleep")) {
    return [
      "I am tired and I want to rest for a while",
      "Can I take a break because I am feeling very tired?",
    ];
  }

  if (words.includes("help")) {
    return [
      "I need help with something and I do not know what to do",
      "Can you please help me because I need assistance right now?",
    ];
  }

  if (words.includes("bathroom") || words.includes("toilet")) {
    return [
      "I need to find the bathroom so I can use it",
      "Can you show me where the bathroom is located?",
    ];
  }

  if (words.includes("friends") || words.includes("friend")) {
    return [
      "I want to talk to my friends but I need help with communication",
      "Can you help me talk to my friends because I have trouble speaking?",
    ];
  }

  if (words.includes("water") || words.includes("drink")) {
    return [
      "I am thirsty and I need water to drink",
      "Can I please have some water because I am thirsty?",
    ];
  }

  if (words.includes("home") || words.includes("house")) {
    return [
      "I want to go home because I am done here",
      "Can we go home now because I want to leave?",
    ];
  }

  // Generic fallback with better variety
  return [
    `I want to say: ${transcript}`,
    `Can you help me say this better: ${transcript}?`,
  ];
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
  const recordingRef = useRef(null);
  const [transcript, setTranscript] = useState("");
  const [options, setOptions] = useState([]);
  const [history, setHistory] = useState([]);
  const [statusMsg, setStatusMsg] = useState("Tap the microphone and say something!");
  const [userProfile, setUserProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const [fadeAnim] = useState(new Animated.Value(0));
  const [emotion, setEmotion] = useState({ label: null, emoji: null, color: colors.surfaceAlt });
  const emotionAnim = useRef(new Animated.Value(0)).current;

  // Load user profile and fade in animation
  useEffect(() => {
    (async () => {
      try {
        const profile = await getUserProfile();
        setUserProfile(profile);
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    })();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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

  // Emotion tag appear animation
  const animateEmotion = () => {
    emotionAnim.setValue(0);
    Animated.timing(emotionAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  };

  // Simple sentiment/emotion detection from text
  const detectEmotion = (text) => {
    const t = (text || "").toLowerCase();
    let label = "Calm"; let emoji = "🙂"; let color = "#E6F0FF"; // soft blue
    if (/(anxious|nervous|scared|afraid|worried|stress)/.test(t)) { label = "Nervous"; emoji = "😟"; color = "#FFEFD6"; }
    else if (/(angry|mad|upset|frustrated|annoyed)/.test(t)) { label = "Tense"; emoji = "😠"; color = "#FFE3E3"; }
    else if (/(sad|unhappy|down|depressed)/.test(t)) { label = "Sad"; emoji = "😔"; color = "#EDEBFF"; }
    else if (/(happy|glad|excited|great|good)/.test(t)) { label = "Happy"; emoji = "🙂"; color = "#E7F9ED"; }
    return { label, emoji, color };
  };

  // Start recording
  const startRecording = async () => {
    try {
      console.log('Starting recording in TranslateScreen...');
      setStatusMsg("I'm listening! Speak up!");
      
      const { status } = await Audio.requestPermissionsAsync();
      console.log('Permission status:', status);
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required", 
          "Microphone permission is needed for voice input. Please enable it in your device settings.",
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });
      
      await rec.startAsync();
      recordingRef.current = rec;
      setIsRecording(true);
      console.log('Recording started successfully in TranslateScreen');

      // auto-stop after 10s
      setTimeout(() => {
        if (recordingRef.current && isRecording) {
          console.log('Auto-stopping recording after timeout');
          stopRecording();
        }
      }, 10000);
    } catch (e) {
      console.error('Recording error in TranslateScreen:', e);
      setIsRecording(false);
      recordingRef.current = null;
      Alert.alert("Recording Error", `Could not start recording: ${e.message}`);
      setStatusMsg("Tap the mic and speak naturally.");
    }
  };

  // Stop recording → STT → enhanced AI rewrite
  const stopRecording = async () => {
    try {
      console.log('Stopping recording in TranslateScreen...');
      
      if (!recordingRef.current) {
        console.log('No recording to stop in TranslateScreen');
        return;
      }
      
      setIsRecording(false);
      setIsProcessing(true);
      console.log('Recording state updated, stopping...');
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      console.log('Recording stopped, URI:', uri);
      
      recordingRef.current = null;
      setStatusMsg("Let me think about what you said...");

      // Step 1: Transcribe audio
      const raw = await transcribeAudio(uri);
      setTranscript(raw);
      setStatusMsg("Making your message clearer...");

      // Step 2: Get personalized rewrites using user profile
      try {
        const rewrites = await getRewrites(raw, userProfile);
        setOptions(rewrites);
        // Emotion detection from final text
        const detected = detectEmotion(rewrites[0] || raw);
        setEmotion(detected);
        animateEmotion();
        // Speak automatically
        try { Speech.speak(rewrites[0]); } catch (_) {}
        setStatusMsg("Pick the message that sounds right to you!");
      } catch (aiError) {
        console.error("AI rewrite error:", aiError);

        // User-friendly error message
        if (String(aiError.message).toLowerCase().includes("key")) {
          Alert.alert(
            "API Key Error",
            "Your OpenAI API key is missing or invalid. Using fallback options for now."
          );
        } else if (String(aiError.message).toLowerCase().includes("rate limit")) {
          Alert.alert("Rate Limit", "Too many requests. Please wait and try again.");
        } else {
          Alert.alert("AI Error", "The AI translator had an issue. Using fallback options.");
        }

        // Fallback single sentence
        const fallbackSentence = createFallbackSingleSentence(raw);
        setOptions([fallbackSentence]);
        const detected = detectEmotion(fallbackSentence);
        setEmotion(detected);
        animateEmotion();
        setStatusMsg("Here's a basic message (AI unavailable):");
      }
    } catch (e) {
      console.error("Recording/transcription error:", e);
      setIsRecording(false);
      recordingRef.current = null;
      Alert.alert("Processing Error", `${e.message}`);
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
        <Text style={styles.title}>Translator</Text>
      </View>

      <Text style={styles.subtitle}>{statusMsg}</Text>

      {/* Mic */}
      <View style={styles.micWrap}>
        <Animated.View style={{ transform: [{ scale: isRecording ? pulse : 1 }] }}>
          <TouchableOpacity
            onPress={toggleRecording}
            style={[styles.micBtn, { opacity: isProcessing ? 0.6 : 1 }]}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <Mic size={96} color={isRecording ? colors.accent : colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Processing indicator */}
        {isProcessing && (
          <View style={styles.processingIndicator}>
            <Text style={styles.processingText}>AI is working...</Text>
          </View>
        )}
      </View>

      {/* Results */}
      <ScrollView style={styles.results} contentContainerStyle={{ paddingBottom: 24 }}>
        {options.length > 0 && (
          <View style={styles.clearMessageCard}>
            <Text style={styles.clearMessageLabel}>Clear Message</Text>

            {/* Single clear message */}
            <View style={styles.unifiedMessageContainer}>
              <Text style={styles.unifiedMessageText}>{options[0]}</Text>
              {emotion.label && (
                <Animated.View
                  style={[
                    styles.emotionTag,
                    {
                      backgroundColor: emotion.color,
                      transform: [{ translateY: emotionAnim.interpolate({ inputRange: [0,1], outputRange: [6,0] }) }],
                      opacity: emotionAnim,
                    },
                  ]}
                >
                  <Text style={styles.emotionText}>{emotion.emoji} {emotion.label}</Text>
                </Animated.View>
              )}
              <View className="unifiedActionsRow" style={styles.unifiedActionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.success }]}
                  onPress={() => handleFeedback("correct", options[0])}
                >
                  <Text style={styles.actionBtnText}>Correct</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                  onPress={() => handleFeedback("incorrect", options[0])}
                >
                  <Text style={styles.actionBtnText}>Wrong</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                  onPress={() => Speech.speak(options[0])}
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  title: { ...typography.titleLarge, color: colors.textPrimary, flex: 1 },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 14,
    fontWeight: "600",
  },
  micWrap: { alignItems: "center", marginTop: 8, marginBottom: 6 },
  micBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  micIcon: { width: 120, height: 120 },
  results: { flex: 1, paddingHorizontal: 16, marginTop: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardLabel: { fontSize: 16, color: colors.textSecondary, marginBottom: 8, fontWeight: "700" },
  cardText: { fontSize: 16, color: colors.textPrimary, lineHeight: 24, fontWeight: "500" },

  clearMessageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 24,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  clearMessageLabel: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  unifiedMessageContainer: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
  },
  unifiedMessageText: {
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 30,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  unifiedActionsRow: {
    flexDirection: "row",
    justifyContent: "center",
  },

  emotionTag: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: 8,
  },
  emotionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  processingIndicator: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  processingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
});
