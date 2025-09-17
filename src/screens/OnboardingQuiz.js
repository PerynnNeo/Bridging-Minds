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
  Platform
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import Constants from 'expo-constants';
import { QUIZ_QUESTIONS, saveQuizResults, generatePersonalizationProfile } from '../utils/quizStorage';

// API Configuration
const GOOGLE_STT_API_KEY = Constants?.expoConfig?.extra?.GOOGLE_STT_API_KEY;

// Convert blob to base64 for Google STT
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Google STT Integration
async function transcribeAudio(uri) {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    if (blob.size < 1000) {
      throw new Error('No speech detected');
    }

    const base64 = await blobToBase64(blob);

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
    const transcript = result?.results?.[0]?.alternatives?.[0]?.transcript?.trim() || '';
    
    if (!transcript) {
      throw new Error('No speech detected');
    }

    return transcript;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

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

  // Animation effects
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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

  // Start recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone permission is needed for voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingInstance = new Audio.Recording();
      await recordingInstance.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recordingInstance.startAsync();
      
      setRecording(recordingInstance);
      setIsRecording(true);

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (isRecording) stopRecording();
      }, 15000);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  };

  // Stop recording and transcribe
  const stopRecording = async () => {
    try {
      if (!recording) return;
      
      setIsRecording(false);
      setIsProcessing(true);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (GOOGLE_STT_API_KEY) {
        const transcript = await transcribeAudio(uri);
        handleAnswer(transcript);
      } else {
        // Mock transcription for testing
        const mockTranscripts = [
          "I like playing games and drawing",
          "I have a mom and dad and a sister",
          "My favorite thing is playing soccer",
          "I felt proud when I learned to ride a bike",
          "I feel happy when I'm with my family"
        ];
        const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
        handleAnswer(randomTranscript);
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Could not process your voice. Please try typing instead.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle answer selection/input
  const handleAnswer = (answer) => {
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
    
    // Move to next question or section
    if (currentQuestionIndex < currentSectionData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Section complete, move to next section
      if (currentSection < totalSections) {
        setCurrentSection(currentSection + 1);
        setCurrentQuestionIndex(0);
      } else {
        // Quiz complete
        completeQuiz(newAnswers);
      }
    }
  };

  // Handle MCQ selection
  const handleMCQSelection = (optionId) => {
    const currentAnswer = answers[currentQuestion.id];
    
    if (currentQuestion.allowMultiple) {
      // Multiple selection
      const selectedOptions = Array.isArray(currentAnswer) ? currentAnswer : [];
      const newSelection = selectedOptions.includes(optionId)
        ? selectedOptions.filter(id => id !== optionId)
        : [...selectedOptions, optionId];
      
      if (newSelection.length > 0) {
        handleAnswer(newSelection);
      }
    } else {
      // Single selection
      handleAnswer(optionId);
    }
  };

  // Complete quiz and save results
  const completeQuiz = async (finalAnswers) => {
    try {
      const personalizationProfile = generatePersonalizationProfile(finalAnswers);
      await saveQuizResults(personalizationProfile);
      
      // Navigate to home screen
      navigation.replace('Home');
    } catch (error) {
      console.error('Error completing quiz:', error);
      Alert.alert('Error', 'Could not save your results. Please try again.');
    }
  };

  // Render MCQ options
  const renderMCQOptions = () => {
    return currentQuestion.options.map((option) => {
      const isSelected = currentQuestion.allowMultiple
        ? Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(option.id)
        : answers[currentQuestion.id] === option.id;

      return (
        <TouchableOpacity
          key={option.id}
          style={[styles.mcqOption, isSelected && styles.mcqOptionSelected]}
          onPress={() => handleMCQSelection(option.id)}
        >
          <Text style={[styles.mcqOptionText, isSelected && styles.mcqOptionTextSelected]}>
            {option.text}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  // Render text input
  const renderTextInput = () => {
    const hasMic = currentQuestion.micAvailable || currentQuestion.micRecommended;
    const micRecommended = currentQuestion.micRecommended;

    return (
      <View style={styles.textInputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type your answer here..."
          value={answers[currentQuestion.id] || ''}
          onChangeText={(text) => setAnswers({ ...answers, [currentQuestion.id]: text })}
          multiline
          textAlignVertical="top"
        />
        
        {hasMic && (
          <View style={styles.micContainer}>
            <Text style={styles.micLabel}>
              {micRecommended ? '🎤 Speak your answer (recommended)' : '🎤 Mic is available to speak'}
            </Text>
            
            <View style={styles.micButtonContainer}>
              {isRecording ? (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    style={styles.micButton}
                    onPress={stopRecording}
                    disabled={isProcessing}
                  >
                    <Image
                      source={require('../../assets/mic_recording.png')}
                      style={styles.micIcon}
                    />
                    <Text style={styles.micButtonText}>Stop</Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <TouchableOpacity
                  style={styles.micButton}
                  onPress={startRecording}
                  disabled={isProcessing}
                >
                  <Image
                    source={require('../../assets/mic.png')}
                    style={styles.micIcon}
                  />
                  <Text style={styles.micButtonText}>Speak</Text>
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

  // Calculate progress
  const progress = ((currentSection - 1) * 100 + (currentQuestionIndex + 1) * (100 / currentSectionData.questions.length)) / totalSections;

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
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>{currentSectionData.title}</Text>
      </View>

      {/* Question Card */}
      <ScrollView style={styles.questionContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
          
          {currentQuestion.type === 'mcq' ? (
            <View style={styles.mcqContainer}>
              {renderMCQOptions()}
            </View>
          ) : (
            renderTextInput()
          )}
        </View>
      </ScrollView>

      {/* Next Button */}
      {answers[currentQuestion.id] && (
        <View style={styles.nextButtonContainer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => {
              if (currentQuestion.type === 'text' && answers[currentQuestion.id]) {
                handleAnswer(answers[currentQuestion.id]);
              }
            }}
          >
            <Text style={styles.nextButtonText}>
              {currentSection === totalSections && currentQuestionIndex === currentSectionData.questions.length - 1
                ? 'Complete Quiz'
                : 'Next'
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff0f5',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffebee',
    borderBottomColor: 'rgba(255,107,107,0.2)',
    borderBottomWidth: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: '#e91e63',
    textAlign: 'center',
    fontWeight: '600',
  },
  progressBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ffcdd2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff6b6b',
    borderRadius: 4,
  },
  sectionTitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#d32f2f',
    textAlign: 'center',
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#ff6b6b',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffebee',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 28,
  },
  mcqContainer: {
    gap: 12,
  },
  mcqOption: {
    backgroundColor: '#ffebee',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffcdd2',
  },
  mcqOptionSelected: {
    backgroundColor: '#ff6b6b',
    borderColor: '#d32f2f',
  },
  mcqOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d32f2f',
    textAlign: 'center',
  },
  mcqOptionTextSelected: {
    color: '#ffffff',
  },
  textInputContainer: {
    gap: 16,
  },
  textInput: {
    backgroundColor: '#ffebee',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#d32f2f',
    borderWidth: 2,
    borderColor: '#ffcdd2',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  micContainer: {
    alignItems: 'center',
    gap: 12,
  },
  micLabel: {
    fontSize: 16,
    color: '#e91e63',
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
  },
  micIcon: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  micButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d32f2f',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 14,
    color: '#e91e63',
    fontWeight: '500',
  },
  nextButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  nextButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

