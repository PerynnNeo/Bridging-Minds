// OnboardingQuiz.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Linking
} from 'react-native';

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import Constants from 'expo-constants';

import {
  QUIZ_QUESTIONS,
  saveQuizResults,
  generatePersonalizationProfile
} from '../utils/quizStorage';


// =========================
// 🔑 API KEYS
// =========================
const GOOGLE_STT_API_KEY = Constants?.expoConfig?.extra?.GOOGLE_STT_API_KEY;


// =========================
// 🔄 HELPERS: Blob → Base64
// =========================
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () =>
      resolve(reader.result.split(',')[1]);

    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
}


// =========================
// 🎤 Google STT for Expo Native Recording
// =========================
async function transcribeAudio(uri) {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    if (blob.size < 1000) {
      throw new Error('No speech detected');
    }

    const base64 = await blobToBase64(blob);

    return await transcribeWebAudio(base64);
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}


// =========================
// 🎤 Google STT for Web Recording
// =========================
async function transcribeWebAudio(base64) {
  try {
    console.log('🔤 Sending audio to Google STT...');

    const apiResponse = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_STT_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            model: 'latest_short',
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
          },
          audio: { content: base64 },
        }),
      }
    );

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`STT failed: ${errorText}`);
    }

    const result = await apiResponse.json();
    const transcript =
      result?.results?.[0]?.alternatives?.[0]?.transcript?.trim() || '';

    if (!transcript) {
      throw new Error('No speech detected');
    }

    console.log('✅ Google STT transcript:', transcript);
    return transcript;

  } catch (error) {
    console.error('Web Audio transcription error:', error);
    throw error;
  }
}


// =========================
// MAIN COMPONENT
// =========================
export default function OnboardingQuiz({ navigation }) {

  const [currentSection, setCurrentSection] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  const totalSections = 5;
  const currentSectionData = QUIZ_QUESTIONS[`section${currentSection}`];
  const currentQuestion = currentSectionData.questions[currentQuestionIndex];


  // =========================
  // ✨ Fade-in animation
  // =========================
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();


    // Web Audio diagnostics
    console.log('🔍 Testing Web Audio API availability...');
    console.log('navigator.mediaDevices:', !!navigator.mediaDevices);
    console.log('navigator.mediaDevices.getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
    console.log('AudioContext:', !!window.AudioContext || !!window.webkitAudioContext);
    console.log('MediaRecorder:', !!window.MediaRecorder);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log('✅ Basic microphone access works!');
          stream.getTracks().forEach(t => t.stop());
        })
        .catch(err => console.error('❌ Basic microphone access failed:', err));
    }
  }, []);


  // =========================
  // 🎛 Pulse animation during recording
  // =========================
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      );

      pulse.start();
      return () => pulse.stop();
    }
  }, [isRecording, pulseAnim]);


  // ============================================================
  // 🎤 START RECORDING (Decides Web vs Expo)
  // ============================================================
  const startRecording = async () => {
    try {
      console.log('🎤 STARTING RECORDING - OnboardingQuiz');
      console.log('Platform:', Platform.OS);

      if (Platform.OS === 'web') {
        console.log('🌐 Using Web Audio API');
        await startWebRecording();
      } else {
        console.log('📱 Using Expo Audio');
        await startExpoRecording();
      }

    } catch (error) {
      console.error('Recording error:', error);
      setIsRecording(false);
      setRecording(null);

      Alert.alert(
        'Recording Error',
        `Could not start recording: ${error.message}. Please try again or use text input instead.`
      );
    }
  };


  // ============================================================
  // 🌐 Web Recording (MediaRecorder)
  // ============================================================
  const startWebRecording = async () => {
    try {
      console.log('🌐 Starting Web Audio API recording...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 MediaRecorder stopped');

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const base64 = await blobToBase64(audioBlob);

        if (GOOGLE_STT_API_KEY) {
          const transcript = await transcribeWebAudio(base64);
          handleAnswer(transcript);
        } else {
          const mock = [
            "I like playing games and drawing",
            "I have a mom and dad and a sister",
            "My favorite thing is playing soccer",
            "I felt proud when I learned to ride a bike",
            "I feel happy when I'm with my family"
          ];

          handleAnswer(mock[Math.floor(Math.random() * mock.length)]);
        }

        setIsProcessing(false);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      console.log('✅ Web Audio recording started');

      setRecording({ mediaRecorder, stream });
      setIsRecording(true);

      setTimeout(() => {
        if (isRecording) stopRecording();
      }, 15000);

    } catch (error) {
      console.error('Web Audio recording error:', error);
      throw error;
    }
  };


  // ============================================================
  // 📱 Expo Audio Recording
  // ============================================================
  const startExpoRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Microphone permission is needed.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Settings',
              onPress: () => {
                if (Platform.OS === 'ios') Linking.openURL('app-settings:');
                else Linking.openSettings();
              }
            }
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

      const recordingInstance = new Audio.Recording();

      await recordingInstance.prepareToRecordAsync({
        ...Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
      });

      await recordingInstance.startAsync();
      setRecording(recordingInstance);
      setIsRecording(true);

      setTimeout(() => {
        if (isRecording) stopRecording();
      }, 15000);

    } catch (error) {
      console.error('Expo Audio recording error:', error);
      throw error;
    }
  };


  // ============================================================
  // 🛑 STOP RECORDING (Universal)
  // ============================================================
  const stopRecording = async () => {
    try {
      if (!recording) return;

      setIsRecording(false);
      setIsProcessing(true);

      // --- Web ---
      if (Platform.OS === 'web' && recording.mediaRecorder) {
        recording.mediaRecorder.stop();
        return;
      }

      // --- Expo ---
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (GOOGLE_STT_API_KEY) {
        const transcript = await transcribeAudio(uri);
        handleAnswer(transcript);
      } else {
        const mock = [
          "I like playing games and drawing",
          "I have a mom and dad and a sister",
          "My favorite thing is playing soccer",
          "I felt proud when I learned to ride a bike",
          "I feel happy when I'm with my family"
        ];
        handleAnswer(mock[Math.floor(Math.random() * mock.length)]);
      }

      setIsProcessing(false);

    } catch (error) {
      console.error('Stop recording error:', error);
      setIsRecording(false);
      setRecording(null);
      setIsProcessing(false);

      Alert.alert(
        'Error',
        `Could not process your voice: ${error.message}.`
      );
    }
  };


  // ============================================================
  // SAVE ANSWER + MOVE NEXT
  // ============================================================
  const handleAnswer = (answer) => {
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);

    if (currentQuestionIndex < currentSectionData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      if (currentSection < totalSections) {
        setCurrentSection(currentSection + 1);
        setCurrentQuestionIndex(0);
      } else {
        completeQuiz(newAnswers);
      }
    }
  };


  // ============================================================
  // MULTI-CHOICE
  // ============================================================
  const handleMCQSelection = (optionId) => {
    const currentAnswer = answers[currentQuestion.id];

    if (currentQuestion.allowMultiple) {
      const selected = Array.isArray(currentAnswer) ? currentAnswer : [];

      const newSelection = selected.includes(optionId)
        ? selected.filter(id => id !== optionId)
        : [...selected, optionId];

      if (newSelection.length > 0) {
        handleAnswer(newSelection);
      }

    } else {
      handleAnswer(optionId);
    }
  };


  // ============================================================
  // COMPLETE QUIZ
  // ============================================================
  const completeQuiz = async (finalAnswers) => {
    try {
      const profile = generatePersonalizationProfile(finalAnswers);
      await saveQuizResults(profile);
      navigation.replace('Home');

    } catch (error) {
      console.error('Error completing quiz:', error);
      Alert.alert('Error', 'Could not save your results.');
    }
  };


  // ============================================================
  // RENDER MCQ OPTIONS
  // ============================================================
  const renderMCQOptions = () => {
    return currentQuestion.options.map(option => {
      const isSelected = currentQuestion.allowMultiple
        ? Array.isArray(answers[currentQuestion.id]) &&
          answers[currentQuestion.id].includes(option.id)
        : answers[currentQuestion.id] === option.id;

      return (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.mcqOption,
            isSelected && styles.mcqOptionSelected
          ]}
          onPress={() => handleMCQSelection(option.id)}
        >
          <Text
            style={[
              styles.mcqOptionText,
              isSelected && styles.mcqOptionTextSelected
            ]}
          >
            {option.text}
          </Text>
        </TouchableOpacity>
      );
    });
  };


  // ============================================================
  // TEXT INPUT WITH MIC
  // ============================================================
  const renderTextInput = () => {
    const hasMic = currentQuestion.micAvailable || currentQuestion.micRecommended;
    const micRecommended = currentQuestion.micRecommended;

    return (
      <View style={styles.textInputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type your answer here..."
          value={answers[currentQuestion.id] || ''}
          onChangeText={(text) =>
            setAnswers({ ...answers, [currentQuestion.id]: text })
          }
          multiline
        />

        {hasMic && (
          <View style={styles.micContainer}>
            <Text style={styles.micLabel}>
              {micRecommended ? 'Speak your answer (recommended)' : 'Mic available'}
            </Text>

            <Text style={styles.debugText}>
              Status: {isRecording ? 'RECORDING' : 'Ready'}  
              | Processing: {isProcessing ? 'Yes' : 'No'}
            </Text>

            <View style={styles.micButtonContainer}>
              {isRecording ? (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    style={[styles.micButton, styles.recordingButton]}
                    onPress={stopRecording}
                    disabled={isProcessing}
                  >
                    <Image
                      source={require('../../assets/mic_recording.png')}
                      style={styles.micIcon}
                    />
                    <Text style={styles.micButtonText}>STOP RECORDING</Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <TouchableOpacity
                  style={[styles.micButton, styles.readyButton]}
                  onPress={startRecording}
                  disabled={isProcessing}
                >
                  <Image
                    source={require('../../assets/mic.png')}
                    style={styles.micIcon}
                  />
                  <Text style={styles.micButtonText}>START RECORDING</Text>
                </TouchableOpacity>
              )}
            </View>

            {isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#ff6b6b" />
                <Text style={styles.processingText}>Processing your voice...</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };


  // ============================================================
  // PROGRESS BAR %
  // ============================================================
  const progress =
    ((currentSection - 1) * 100 +
      (currentQuestionIndex + 1) *
        (100 / currentSectionData.questions.length)) /
    totalSections;


  // ============================================================
  // UI RENDER
  // ============================================================
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Getting to Know You</Text>
        <Text style={styles.progressText}>
          Section {currentSection} of {totalSections}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` }
            ]}
          />
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>
          {currentSectionData.title}
        </Text>
      </View>

      {/* Question Card */}
      <ScrollView
        style={styles.questionContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>
            {currentQuestion.text}
          </Text>

          {currentQuestion.type === 'mcq'
            ? <View style={styles.mcqContainer}>{renderMCQOptions()}</View>
            : renderTextInput()}
        </View>
      </ScrollView>

      {/* Next Button */}
      {answers[currentQuestion.id] && (
        <View style={styles.nextButtonContainer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => {
              if (currentQuestion.type === 'text') {
                handleAnswer(answers[currentQuestion.id]);
              }
            }}
          >
            <Text style={styles.nextButtonText}>
              {currentSection === totalSections &&
              currentQuestionIndex ===
                currentSectionData.questions.length - 1
                ? 'Complete Quiz'
                : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

    </Animated.View>
  );
}


// =========================
// 🎨 STYLES
// =========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F9',
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#f9f7f0',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 2,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0A0A0A',
    textAlign: 'center',
    marginBottom: 8,
  },

  progressText: {
    fontSize: 16,
    color: '#687d67',
    textAlign: 'center',
    fontWeight: '600',
  },

  progressBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  progressBar: {
    height: 8,
    backgroundColor: '#f9f7f0',
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#687d67',
    borderRadius: 4,
  },

  sectionTitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A0A0A',
    textAlign: 'center',
  },

  questionContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },

  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#f9f7f0',
  },

  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0A0A0A',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 28,
  },

  mcqContainer: { gap: 12 },

  mcqOption: {
    backgroundColor: '#f9f7f0',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },

  mcqOptionSelected: {
    backgroundColor: '#687d67',
    borderColor: '#334155',
  },

  mcqOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A0A0A',
    textAlign: 'center',
  },

  mcqOptionTextSelected: {
    color: '#FFFFFF',
  },

  textInputContainer: { gap: 16 },

  textInput: {
    backgroundColor: '#f9f7f0',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#0A0A0A',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 100,
    textAlignVertical: 'top',
  },

  micContainer: {
    alignItems: 'center',
    gap: 12,
  },

  micLabel: {
    fontSize: 16,
    color: '#687d67',
    fontWeight: '600',
    textAlign: 'center',
  },

  micButtonContainer: {
    alignItems: 'center',
  },

  micButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
  },

  readyButton: {
    backgroundColor: '#E4F4E4',
    borderColor: '#34C759',
  },

  recordingButton: {
    backgroundColor: '#f9f7f0',
    borderColor: '#FF9F0A',
  },

  micIcon: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },

  micButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0A',
  },

  debugText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'monospace',
  },

  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  processingText: {
    fontSize: 14,
    color: '#687d67',
    fontWeight: '500',
  },

  nextButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  nextButton: {
    backgroundColor: '#687d67',
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
