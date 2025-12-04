import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, RotateCcw, Play, MicOff, Edit3, Check, X } from 'lucide-react-native';
 import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import serverImg from '../../assets/Server.png';
import storeHelperImg from '../../assets/Helper.png';
import receptionistImg from '../../assets/Reception.png';
import Constants from 'expo-constants';
import { colors, radii } from '../utils/theme';

// API Configuration (loaded from app.config.js → extra)
const { OPENAI_API_KEY, GOOGLE_STT_API_KEY } = (Constants.expoConfig?.extra ?? Constants?.manifestExtra ?? {});

export default function ConversationBuddy({ navigation }) {
  const insets = useSafeAreaInsets();

  // UI Constants
  const TAB_BAR_HEIGHT = 72;
  const TAB_BAR_BOTTOM_OFFSET = 10;
  const extraBottom = insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET;

  // State Management
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [currentScenario, setCurrentScenario] = useState('restaurant');
  const [currentScreen, setCurrentScreen] = useState('scenarios');
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [waveAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [chatMessages, setChatMessages] = useState([]);
  const [recording, setRecording] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  
  // Transcription Interface States
  const [showTranscriptionInterface, setShowTranscriptionInterface] = useState(false);
  const [rawTranscript, setRawTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Refs
  const scrollViewRef = useRef(null);
  const conversationHistory = useRef([]);
  const recordingTimeoutRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const textInputRef = useRef(null);

  // Scenario Definitions
  const scenarios = {
    restaurant: {
      title: 'Order Food',
      subtitle: 'Practice ordering at a restaurant',
      icon: '🍕',
      color: '#e8f5e8',
      borderColor: '#4ade80',
      character: 'Server',
      avatarImg: serverImg,
      systemPrompt: `You are a friendly restaurant server helping someone practice ordering food. Keep responses natural, short (1-2 sentences), and autism-friendly:
- Use clear, simple language
- Be patient and encouraging  
- Ask one question at a time
- Confirm choices clearly
- Guide through: greeting → order → size/options → drinks → confirmation
- Stay in character as a helpful server
- Always ask follow-up questions to keep the conversation going`
    },
    store: {
      title: 'Ask for Help',
      subtitle: 'Practice asking store employees for help',
      icon: '🛍️',
      color: '#eff6ff',
      borderColor: '#3b82f6',
      character: 'Store Helper',
      avatarImg: storeHelperImg,
      systemPrompt: `You are a helpful store employee assisting someone with shopping. Keep responses natural, short (1-2 sentences), and autism-friendly:
- Use clear, simple language
- Be patient and encouraging
- Ask one question at a time
- Offer specific help and directions
- Guide through: greeting → understanding needs → asking details → providing help
- Stay in character as a friendly store employee
- Always ask follow-up questions to keep the conversation going`
    },
    phone: {
      title: 'Make Appointment',
      subtitle: 'Practice making phone appointments',
      icon: '📞',
      color: '#fef3e8',
      borderColor: '#f59e0b',
      character: 'Receptionist',
      avatarImg: receptionistImg, 
      systemPrompt: `You are a professional but friendly receptionist helping someone make an appointment. Keep responses natural, short (1-2 sentences), and autism-friendly:
- Use clear, simple language
- Be patient and encouraging
- Ask one question at a time
- Confirm details clearly
- Guide through: greeting → service needed → date → time → confirmation
- Stay in character as a helpful receptionist
- Always ask follow-up questions to keep the conversation going`
    },
  };

  const currentScene = scenarios[currentScenario];

  // Initialize audio and permissions
  useEffect(() => {
    setupAudioAndPermissions();
    return () => {
      cleanup();
    };
  }, []);

  // Simple fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);


  const setupAudioAndPermissions = async () => {
  try {
    // 1) Ask mic permissions
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Microphone permission is required for voice conversations.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: setupAudioAndPermissions },
        ]
      );
      return;
    }

    // 2) Configure audio mode (platform-guard the interruption keys)
    const mode = {
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,

      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    };

    if (Platform.OS === 'ios') {
      mode.interruptionModeIOS = InterruptionModeIOS.DoNotMix; // or DuckOthers / MixWithOthers
    }
    if (Platform.OS === 'android') {
      mode.interruptionModeAndroid = InterruptionModeAndroid.DoNotMix; // or DuckOthers
    }

    await Audio.setAudioModeAsync(mode);

    setPermissionsGranted(true);
    console.log('Audio setup complete');
  } catch (error) {
    console.error('Error setting up audio:', error);
    Alert.alert('Setup Error', 'Could not set up audio. Voice features may not work.');
  }
};
  const cleanup = async () => {
    try {
      if (recording) {
        console.log('Cleaning up recording...');
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      await Speech.stop();
      setIsRecording(false);
      setIsProcessing(false);
      setIsSpeaking(false);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  // Recording Animation Effects
  useEffect(() => {
    if (isRecording) {
      // Pulse animation for the mic button
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      );
      
      // Wave animation for recording indicator
      const wave = Animated.loop(
        Animated.timing(waveAnim, { toValue: 1, duration: 1500, useNativeDriver: false })
      );
      
      pulse.start();
      wave.start();
      
      return () => {
        pulse.stop();
        wave.stop();
      };
    }
  }, [isRecording, pulseAnim, waveAnim]);

  // Recording Timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTimer(prev => prev + 1), 1000);
    } else {
      setRecordingTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Voice Recording Functions
  const startRecording = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permission Required', 'Please grant microphone permission to record.');
      await setupAudioAndPermissions();
      return;
    }

    try {
      console.log('🎤 Starting recording...');
      setProcessingStep('Preparing to record...');
      
      // Stop any current speech
      if (isSpeaking) {
        await Speech.stop();
        setIsSpeaking(false);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Fixed recording options - use formats that work better with Google STT
      const recordingOptions = {
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
      };

      console.log('Creating recording with options:', recordingOptions);
      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      
      setRecording(newRecording);
      setIsRecording(true);
      setProcessingStep('');

      console.log('✅ Recording started successfully');

      // Auto-stop after 15 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Auto-stopping recording after 15s');
        stopRecording();
      }, 15000);

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert('Recording Error', `Could not start recording: ${error.message}`);
      setIsRecording(false);
      setRecording(null);
      setProcessingStep('');
    }
  };

  const stopRecording = async () => {
    if (!recording || !isRecording) {
      console.log('⚠️ No active recording to stop');
      return;
    }

    try {
      console.log('🛑 Stopping recording...');
      setIsRecording(false);
      setProcessingStep('Processing recording...');
      
      // Clear timeouts
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      console.log('📁 Recording saved to:', uri);

      // Check if file exists and get info (only on native platforms)
      if (uri) {
        if (Platform.OS === 'web') {
          // On web, we can't check file info, so just proceed with processing
          console.log('📊 Web platform: proceeding with recording URI:', uri);
          await processVoiceInput(uri);
        } else {
          // On native platforms, check file info
          const fileInfo = await FileSystem.getInfoAsync(uri);
          console.log('📊 Recording file info:', fileInfo);
          
          if (!fileInfo.exists) {
            throw new Error('Recording file was not created');
          }
          
          if (fileInfo.size < 1000) { // Less than 1KB is probably empty
            throw new Error('Recording is too short. Please speak longer.');
          }

          await processVoiceInput(uri);
        }
      } else {
        throw new Error('No recording URI received');
      }
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      Alert.alert('Recording Error', `Could not process recording: ${error.message}`);
      setRecording(null);
      setIsRecording(false);
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Voice Processing Pipeline
  const processVoiceInput = async (audioUri) => {
    setIsProcessing(true);
    
    try {
      console.log('🔄 Processing voice input...');
      
      // Step 1: Transcribe audio
      setProcessingStep('Transcribing your speech...');
      console.log('📝 Starting transcription...');
      
      const transcript = await transcribeAudio(audioUri);
      
      if (!transcript || transcript.trim().length === 0) {
        throw new Error('No speech detected. Please try speaking more clearly.');
      }

      console.log('✅ Transcript received:', transcript);

      // Step 2: Process with AI immediately (no transcription interface for smoother UX)
      setProcessingStep('Getting AI response...');
      
      // Add user message to chat
      addMessage(transcript, 'you');

      // Get AI response
      console.log('🤖 Getting AI response for:', transcript);
      const aiResponse = await getAIResponse(transcript);
      console.log('✅ AI Response:', aiResponse);

      // Add AI message and speak it
      addMessage(aiResponse, 'them');
      await speakText(aiResponse);

    } catch (error) {
      console.error('❌ Error processing voice:', error);
      setIsProcessing(false);
      setProcessingStep('');
      
      // Fallback: show manual input option
      Alert.alert(
        'Voice Processing Error', 
        error.message + '\n\nWould you like to type your message instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Type Message', onPress: showManualInput }
        ]
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const showManualInput = () => {
    setRawTranscript('');
    setEditedTranscript('');
    setShowTranscriptionInterface(true);
    setIsEditing(true);
  };

  // Transcription Interface Functions
  const confirmTranscript = React.useCallback(async () => {
    try {
      const finalText = editedTranscript.trim();
      if (!finalText) {
        Alert.alert('Empty Message', 'Please enter some text before confirming.');
        return;
      }

      setShowTranscriptionInterface(false);
      setIsProcessing(true);
      setProcessingStep('Getting AI response...');

      // Add user message to chat
      addMessage(finalText, 'you');

      // Get AI response
      console.log('🤖 Getting AI response for:', finalText);
      const aiResponse = await getAIResponse(finalText);
      console.log('✅ AI Response:', aiResponse);

      // Add AI message and speak it
      addMessage(aiResponse, 'them');
      await speakText(aiResponse);

      // Clear transcription states
      setRawTranscript('');
      setEditedTranscript('');
      setIsEditing(false);

    } catch (error) {
      console.error('❌ Error getting AI response:', error);
      Alert.alert('AI Error', error.message || 'Could not get AI response. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  }, [editedTranscript]);

  const cancelTranscript = React.useCallback(() => {
    setShowTranscriptionInterface(false);
    setRawTranscript('');
    setEditedTranscript('');
    setIsEditing(false);
  }, []);

  // Speech-to-Text with Google STT
  const transcribeAudio = async (audioUri) => {
    try {
      console.log('📂 Reading audio file...');
      
      if (Platform.OS === 'web') {
        // On web, we can't use FileSystem, so we'll use a mock response for now
        console.log('📊 Web platform: using mock transcription');
        
        // For web demo purposes, return a mock transcription
        // In a real app, you'd implement proper web audio processing
        const mockTranscriptions = [
          "Hello, I would like to order some food",
          "Can I have a burger please",
          "I want to practice ordering",
          "What do you recommend?",
          "I'll have the special"
        ];
        
        const randomTranscription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
        console.log('🎤 Mock transcription:', randomTranscription);
        return randomTranscription;
      }
      
      // Native platform processing
      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      console.log('📊 Audio file info:', audioInfo);
      
      if (!audioInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      if (audioInfo.size < 1000) {
        throw new Error('Audio recording is too short or empty');
      }

      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('📦 Audio encoded, size:', base64Audio.length, 'chars');

      // Check if we have a real API key
      if (!GOOGLE_STT_API_KEY || GOOGLE_STT_API_KEY === 'YOUR_GOOGLE_STT_API_KEY') {
        // Mock response for testing - replace with real transcription
        console.log('⚠️ Using mock transcript - please add your Google STT API key');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
        
        // Return a realistic mock based on scenario
        const mockResponses = {
          restaurant: "I would like to order a large pizza please",
          store: "Excuse me, can you help me find the electronics section",
          phone: "Hi, I'd like to schedule an appointment for next week"
        };
        return mockResponses[currentScenario] || "Hello, can you help me please";
      }

      // Google STT API request - optimized for phone calls
      const requestBody = {
        config: {
          encoding: 'ENCODING_UNSPECIFIED',
          
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          model: 'phone_call', // Better for conversational speech
          useEnhanced: true,
          maxAlternatives: 1,
        },
        audio: {
          content: base64Audio,
        },
      };

      console.log('🌐 Sending request to Google STT...');
      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_STT_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      const responseData = await response.json();
      console.log('📨 Google STT response:', JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        throw new Error(responseData.error?.message || `HTTP ${response.status}`);
      }

      if (responseData.results && responseData.results.length > 0) {
        const transcript = responseData.results[0].alternatives[0].transcript;
        console.log('✅ Transcription successful:', transcript);
        return transcript.trim();
      } else {
        throw new Error('No speech detected in the recording');
      }
    } catch (error) {
      console.error('❌ Transcription error:', error);
      throw error;
    }
  };

  // AI Response Generation with OpenAI
  const getAIResponse = async (userInput) => {
    try {
      // Build conversation context
      const messages = [
        {
          role: 'system',
          content: currentScene.systemPrompt
        },
        ...conversationHistory.current,
        {
          role: 'user',
          content: userInput
        }
      ];

      console.log('🤖 Sending to OpenAI with', messages.length, 'messages');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      console.log('📨 OpenAI response status:', response.status);

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      if (data.choices && data.choices[0]) {
        const aiReply = data.choices[0].message.content.trim();
        
        // Update conversation history
        conversationHistory.current.push(
          { role: 'user', content: userInput },
          { role: 'assistant', content: aiReply }
        );
        
        return aiReply;
      } else {
        throw new Error('No response received from AI');
      }
    } catch (error) {
      console.error('❌ AI response error:', error);
      throw new Error(`AI response failed: ${error.message}`);
    }
  };

  // Text-to-Speech
  const speakText = async (text) => {
    try {
      console.log('🔊 Speaking text:', text);
      setIsSpeaking(true);

      // Stop any existing speech first
      await Speech.stop();

      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
        quality: Speech.VoiceQuality.Enhanced,
        onDone: () => {
          console.log('✅ Speech completed');
          setIsSpeaking(false);
        },
        onError: (error) => {
          console.error('❌ Speech error:', error);
          setIsSpeaking(false);
        },
        onStopped: () => {
          console.log('🛑 Speech stopped');
          setIsSpeaking(false);
        },
      });
    } catch (error) {
      console.error('❌ Text-to-speech error:', error);
      setIsSpeaking(false);
    }
  };

  // Message Management
  const addMessage = (text, type) => {
    const newMessage = {
      text,
      type,
      timestamp: new Date(),
      avatar: type === 'them' ? currentScene.avatar : '🙋‍♂️',
    };
    
    setChatMessages((prev) => [...prev, newMessage]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const initializeChat = async (scenarioKey) => {
    const scenario = scenarios[scenarioKey];
    conversationHistory.current = [];
    
    console.log('🚀 Initializing chat for:', scenarioKey);
    
    // Add initial greeting
    const greeting = getInitialGreeting(scenarioKey);
    setChatMessages([
      {
        text: greeting,
        type: 'them',
        timestamp: new Date(),
        avatar: scenario.avatar,
      },
    ]);

    // Speak the greeting after a short delay
    setTimeout(() => {
      speakText(greeting);
    }, 1500);
  };

  const getInitialGreeting = (scenarioKey) => {
    switch (scenarioKey) {
      case 'restaurant':
        return "Hi! Welcome to our restaurant. What would you like to order today?";
      case 'store':
        return "Hello! Can I help you find something today?";
      case 'phone':
        return "Good morning! How can I help you today?";
      default:
        return "Hello! How can I help you?";
    }
  };

  // Navigation Functions
  const selectScenario = (key) => {
    console.log('🎯 Selecting scenario:', key);
    setCurrentScenario(key);
    setCurrentScreen('chat');
    initializeChat(key);
  };

  const goHome = async () => {
    console.log('🏠 Going home');
    await cleanup();
    setCurrentScreen('scenarios');
    setChatMessages([]);
    conversationHistory.current = [];
    setShowTranscriptionInterface(false);
  };

  const restartScenario = async () => {
    console.log('🔄 Restarting scenario');
    await cleanup();
    setShowTranscriptionInterface(false);
    initializeChat(currentScenario);
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Handle mic button press
  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  /* TRANSCRIPTION INTERFACE OVERLAY */
  const TranscriptionInterface = () => {
    const [localText, setLocalText] = useState(editedTranscript);
    
    // Update local text when editedTranscript changes externally
    React.useEffect(() => {
      setLocalText(editedTranscript);
    }, [editedTranscript]);
    
    const handleTextChange = (text) => {
      setLocalText(text);
      setEditedTranscript(text);
    };
    
    return (
      <View style={styles.transcriptionOverlay}>
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionTitle}>Type your message:</Text>
          
          <View style={styles.transcriptSection}>
            <TextInput
              ref={textInputRef}
              style={styles.transcriptInput}
              value={localText}
              onChangeText={handleTextChange}
              multiline
              placeholder="Type your message here..."
              autoFocus
              selectTextOnFocus={false}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.transcriptionButtons}>
            <TouchableOpacity
              style={[styles.transcriptBtn, styles.cancelBtn]}
              onPress={cancelTranscript}
            >
              <X size={18} color="white" />
              <Text style={styles.transcriptBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.transcriptBtn, styles.confirmBtn]}
              onPress={confirmTranscript}
              disabled={isProcessing || !localText.trim()}
            >
              <Check size={18} color="white" />
              <Text style={styles.transcriptBtnText}>Send</Text>
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View style={styles.transcriptProcessing}>
              <ActivityIndicator size="small" color={currentScene.borderColor} />
              <Text style={styles.transcriptProcessingText}>{processingStep}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  /* SCENARIO SELECTION SCREEN */
  if (currentScreen === 'scenarios') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header with back button */}
        <View style={styles.scenarioHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fun Chat Practice</Text>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>Pick a friend to practice talking with!</Text>

          {/* Permission warning if not granted */}
          {!permissionsGranted && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                We need to use your microphone to have fun voice chats!
              </Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={setupAudioAndPermissions}>
                <Text style={styles.permissionBtnText}>Let's Do It!</Text>
              </TouchableOpacity>
            </View>
          )}

          {Object.entries(scenarios).map(([key, scenario]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.scenarioCard,
                { backgroundColor: scenario.color, borderColor: scenario.borderColor },
              ]}
              onPress={() => selectScenario(key)}
              accessibilityLabel={`Start conversation with ${scenario.character}`}
              accessibilityRole="button"
            >
              <View style={styles.cardContent}>
                <View style={styles.cardTopSection}>
                  {scenario.avatarImg ? (
                    <Image source={scenario.avatarImg} style={styles.cardAvatarImg} />
                  ) : (
                    <Text style={styles.cardAvatarEmoji}>{scenario.avatarFallback}</Text>
                  )}
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>{scenario.character}</Text>
                    <Text style={styles.cardSubtitle}>{scenario.subtitle}</Text>
                    <Text style={styles.stepCount}>Fun AI chat buddy</Text>
                  </View>
                </View>
                <View style={styles.startChatBtn}>
                  <Text style={styles.startChatText}>Let's Chat!</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  }

  /* CHAT SCREEN */
  if (currentScreen === 'chat') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Chat Header */}
        <View style={[styles.chatHeader, { backgroundColor: '#ff6b6b' }]}>
          <TouchableOpacity onPress={goHome} style={styles.headerBtn} accessibilityLabel="Go back to scenarios">
            <Home size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.chatHeaderInfo}>
            {currentScene.avatarImg ? (
              <Image source={currentScene.avatarImg} style={styles.headerAvatarImg} />
            ) : (
              <Text style={styles.headerAvatarEmoji}>{currentScene.avatarFallback}</Text>
            )}
            <View>
              <Text style={styles.chatHeaderName}>{currentScene.character}</Text>
              <Text style={styles.chatHeaderStatus}>
                {isSpeaking ? 'Speaking...' : isProcessing ? processingStep || 'Processing...' : isRecording ? 'Listening...' : 'Ready to chat'}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={restartScenario} style={styles.headerBtn} accessibilityLabel="Restart conversation">
            <RotateCcw size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={[
            styles.chatContent,
            { paddingBottom: extraBottom + 140 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.map((message, index) => (
            <View
              key={index}
              style={[
                styles.messageContainer,
                message.type === 'you' ? styles.myMessageContainer : styles.theirMessageContainer,
              ]}
            >
              {message.type === 'them' && (
                <Text style={styles.messageAvatar}>{message.avatar}</Text>
              )}

              <View
                style={[
                  styles.messageBubble,
                  message.type === 'you' ? styles.myMessage : styles.theirMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.type === 'you' ? styles.myMessageText : styles.theirMessageText,
                  ]}
                >
                  {message.text}
                </Text>
                {message.type === 'them' && (
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => speakText(message.text)}
                    accessibilityLabel="Play message"
                  >
                    <Play size={16} color="#6b7280" />
                  </TouchableOpacity>
                )}
                <Text
                  style={[
                    styles.messageTime,
                    message.type === 'you' ? styles.myMessageTime : styles.theirMessageTime,
                  ]}
                >
                  {formatTime(message.timestamp)}
                </Text>
              </View>

              {message.type === 'you' && (
                <Text style={styles.messageAvatar}>🙋‍♂️</Text>
              )}
            </View>
          ))}

          {/* Processing Indicator */}
          {isProcessing && !showTranscriptionInterface && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color="#d32f2f" />
              <Text style={styles.processingText}>{processingStep}</Text>
            </View>
          )}
        </ScrollView>

        {/* Voice Input Area */}
        <View
          style={[
            styles.voiceInputContainer,
            { marginBottom: extraBottom + 8 },
          ]}
        >
          <View style={styles.inputHint}>
            <Text style={styles.inputHintText}>
              {isRecording 
                ? '🎤 Recording... Speak clearly!' 
                : isProcessing 
                ? `⏳ ${processingStep}`
                : isSpeaking
                ? '🔊 AI is speaking... Please wait'
                : '🎯 Tap microphone to speak'}
            </Text>
          </View>

          <View style={styles.micContainer}>
            {/* Enhanced Recording Visual */}
            {isRecording && (
              <View style={styles.recordingVisualization}>
                {/* Animated Sound Waves */}
                <Animated.View style={[
                  styles.soundWave,
                  styles.wave1,
                  { 
                    transform: [{ 
                      scaleY: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1.2],
                      })
                    }]
                  }
                ]} />
                <Animated.View style={[
                  styles.soundWave,
                  styles.wave2,
                  { 
                    transform: [{ 
                      scaleY: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1.0],
                      })
                    }]
                  }
                ]} />
                <Animated.View style={[
                  styles.soundWave,
                  styles.wave3,
                  { 
                    transform: [{ 
                      scaleY: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.2, 0.8],
                      })
                    }]
                  }
                ]} />
                <Animated.View style={[
                  styles.soundWave,
                  styles.wave4,
                  { 
                    transform: [{ 
                      scaleY: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1.1],
                      })
                    }]
                  }
                ]} />
                <Animated.View style={[
                  styles.soundWave,
                  styles.wave5,
                  { 
                    transform: [{ 
                      scaleY: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.9],
                      })
                    }]
                  }
                ]} />
              </View>
            )}

            <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
              <TouchableOpacity
                onPress={handleMicPress}
                disabled={isProcessing || isSpeaking || showTranscriptionInterface}
                style={[
                  styles.micBtn,
                  {
                    opacity: (isProcessing || isSpeaking || showTranscriptionInterface) ? 0.6 : 1,
                  },
                ]}
                accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
                accessibilityRole="button"
              >
                {isRecording ? (
                  <Image source={require('../../assets/mic_recording.png')} style={{ width: 80, height: 80 }} />
                ) : (
                  <Image source={require('../../assets/mic.png')} style={{ width: 80, height: 80 }} />
                )}
              </TouchableOpacity>
            </Animated.View>

            {isRecording && (
              <View style={styles.recordingIndicator}>
                <Text style={styles.recordingTimer}>{recordingTimer}s</Text>
                <View style={styles.recordingDots}>
                  <View style={[styles.dot, { opacity: 0.8 }]} />
                  <View style={[styles.dot, { opacity: 0.6 }]} />
                  <View style={[styles.dot, { opacity: 0.4 }]} />
                </View>
                <Text style={styles.recordingHint}>Tap to stop</Text>
              </View>
            )}
          </View>

          {/* Manual Input Button */}
          <TouchableOpacity 
            style={styles.manualInputBtn} 
            onPress={showManualInput}
            disabled={isRecording || isProcessing || isSpeaking}
          >
            <Edit3 size={16} color={currentScene.borderColor} />
            <Text style={[styles.manualInputText, { color: currentScene.borderColor }]}>Type message</Text>
          </TouchableOpacity>
        </View>

        {/* Transcription Interface Overlay */}
        {showTranscriptionInterface && <TranscriptionInterface />}
      </Animated.View>
    );
  }

  // Fallback
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.debugText}>Unknown screen: {currentScreen}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    shadowColor: '#000',
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
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  scrollContainer: { flex: 1 },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 100 
  },
  warningContainer: {
    backgroundColor: colors.surfaceAlt,
    padding: 16,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  warningText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  permissionBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  debugText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    margin: 20,
  },
  mainHeader: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    fontWeight: '600',
  },

  // Scenario cards
  scenarioCard: {
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'column',
    padding: 20,
  },
  cardTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardAvatarEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  cardAvatarImg: { 
    width: 48, 
    height: 48, 
    marginRight: 16, 
    borderRadius: 12 
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  stepCount: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  startChatBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startChatText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 18,
  },

  // Chat Header
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  headerAvatarEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  headerAvatarImg: { 
    width: 32, 
    height: 32, 
    marginRight: 12, 
    borderRadius: 8 
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Chat Messages
  chatContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatContent: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    fontSize: 25,
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 16,
    borderRadius: 18,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  myMessage: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 8,
    borderWidth: 0,
  },
  theirMessage: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
    fontWeight: '600',
  },
  myMessageText: {
    color: '#ffffff',
  },
  theirMessageText: {
    color: colors.textPrimary,
  },
  playBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: colors.textTertiary,
    textAlign: 'left',
  },

  // Processing indicator
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.surfaceAlt,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  processingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontWeight: '600',
  },

  // Voice Input
  voiceInputContainer: {
    backgroundColor: colors.surface,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputHint: {
    backgroundColor: colors.surfaceAlt,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  inputHintText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  micContainer: {
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  
  // Enhanced Recording Visualization
  recordingVisualization: {
    position: 'absolute',
    bottom: 90,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 60,
    width: 120,
  },
  soundWave: {
    backgroundColor: colors.accent,
    width: 4,
    marginHorizontal: 2,
    borderRadius: 2,
    opacity: 0.8,
  },
  wave1: {
    height: 20,
    backgroundColor: colors.accent,
  },
  wave2: {
    height: 30,
    backgroundColor: colors.accent,
  },
  wave3: {
    height: 15,
    backgroundColor: colors.accent,
  },
  wave4: {
    height: 35,
    backgroundColor: colors.accent,
  },
  wave5: {
    height: 25,
    backgroundColor: colors.accent,
  },
  
  micBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Recording Icon (Stop Square)
  recordingIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSquare: {
    width: 20,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 3,
  },
  
  recordingIndicator: {
    alignItems: 'center',
    marginTop: 10,
  },
  recordingTimer: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 8,
  },
  recordingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginHorizontal: 2,
  },
  recordingHint: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  manualInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  manualInputText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },

  // Transcription Interface
  transcriptionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  transcriptionContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  transcriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  transcriptSection: {
    marginBottom: 16,
  },
  transcriptInput: {
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  transcriptionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  transcriptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#ef4444',
  },
  confirmBtn: {
    backgroundColor: '#10b981',
  },
  transcriptBtnText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  transcriptProcessing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  transcriptProcessingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});