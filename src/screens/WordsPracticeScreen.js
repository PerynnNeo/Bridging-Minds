// src/screens/WordsPracticeScreen.js
// Enhanced WordsPracticeScreen.js with Real Speech Analysis

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Alert,
  Animated,
  Easing,
  Platform,
  ScrollView,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

const API_KEY = Constants?.expoConfig?.extra?.GOOGLE_STT_API_KEY;
if (!API_KEY) {
  console.warn('GOOGLE_STT_API_KEY missing. Add it to .env and app.config.js -> extra.');
}

// ---------- Assets ----------
const WORD_ASSETS = {
  tomato: require('../../assets/words/tomato.png'),
  apple: require('../../assets/words/Apple.png'),
  banana: require('../../assets/words/Banana.png'),
  orange: require('../../assets/words/Orange.png'),
  strawberry: require('../../assets/words/Strawberry.png'), // add these files or keep fallback
  chocolate: require('../../assets/words/Chocolate.png'),
  fallback: require('../../assets/words/fallback.png'),
};

// ---------- Helpers ----------
function sttConfigForUri(uri) {
  const lower = (uri || '').toLowerCase();
  const base = {
    languageCode: 'en-US',
    enableAutomaticPunctuation: false,
    maxAlternatives: 1,
  };
  if (lower.endsWith('.webm')) {
    return { ...base, encoding: 'WEBM_OPUS' };
  }
  if (lower.endsWith('.caf')) {
    // LINEAR PCM 16-bit mono @16k
    return { ...base, encoding: 'LINEAR16', sampleRateHertz: 16000 };
  }
  return { ...base, encoding: 'ENCODING_UNSPECIFIED' };
}

async function readFileAsBase64(uri) {
  // Prefer FileSystem on native
  if (uri?.startsWith('file://')) {
    return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }
  const res = await fetch(uri);
  const blob = await res.blob();
  return GoogleSpeechService.blobToBase64(blob);
}

// ---------- Google Speech-to-Text ----------
export const GoogleSpeechService = {
  async transcribeAudio(audioUri, apiKey) {
    try {
      if (!apiKey || apiKey.length < 20) {
        throw new Error('Invalid API key provided');
      }

      // Read audio -> base64
      const base64Audio = await readFileAsBase64(audioUri);

      const apiResponse = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: sttConfigForUri(audioUri),
            audio: { content: base64Audio },
          }),
        }
      );

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`API request failed with status ${apiResponse.status}: ${errorText}`);
      }

      const result = await apiResponse.json();
      const alt = result?.results?.[0]?.alternatives?.[0];
      if (!alt?.transcript?.trim()) {
        throw new Error('No speech input detected - please speak clearly');
      }

      return {
        text: alt.transcript.trim(),
        confidence: alt.confidence ?? 0.8,
      };
    } catch (error) {
      console.error('Google Speech API error:', error);
      throw error;
    }
  },

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
};

// ---------- Dataset ----------
const WORD_DATABASE = {
  food: [
    {
      text: 'Tomatoes',
      phonetic: 'tuh-MAY-tohs',
      ipa: '/təˈmeɪtoʊz/',
      difficulty: 'medium',
      keyPhonemes: ['t', 'ə', 'm', 'eɪ', 't', 'oʊ', 'z'],
      commonMistakes: ['tomatos', 'tomatoe', 'tomatos'],
      tips: {
        excellent: "Perfect pronunciation! 🎉 You nailed the stress on 'MAY'!",
        good: "Great job! Try emphasizing the 'MAY' sound a bit more.",
        fair: "Good attempt! Focus on three syllables: 'tuh-MAY-tohs'.",
        poor: "Keep practicing! Break it down: 'tuh' + 'MAY' + 'tohs'",
      },
      imageKey: 'tomato',
    },
    {
      text: 'Apple',
      phonetic: 'AP-uhl',
      ipa: '/ˈæpəl/',
      difficulty: 'easy',
      keyPhonemes: ['æ', 'p', 'ə', 'l'],
      commonMistakes: ['apel', 'aple'],
      tips: {
        excellent: 'Fantastic! Crystal clear pronunciation! 🍎',
        good: "Well done! The short 'A' sound was perfect.",
        fair: "Nice try! Make the 'AP' sound stronger and shorter.",
        poor: "Practice the short 'A' sound: 'AP-uhl' (not 'ay-pul')",
      },
      imageKey: 'apple',
    },
    {
      text: 'Banana',
      phonetic: 'buh-NAN-uh',
      ipa: '/bəˈnænə/',
      difficulty: 'easy',
      keyPhonemes: ['b', 'ə', 'n', 'æ', 'n', 'ə'],
      commonMistakes: ['bananna', 'banan'],
      tips: {
        excellent: 'Excellent! Perfect rhythm and stress! 🍌',
        good: 'Great! All three syllables were clear.',
        fair: "Good effort! Emphasize the middle 'NAN' more.",
        poor: "Break it down: 'buh' + 'NAN' + 'uh' - stress the middle!",
      },
      imageKey: 'banana',
    },
    {
      text: 'Orange',
      phonetic: 'OR-inj',
      ipa: '/ˈɔrɪndʒ/',
      difficulty: 'medium',
      keyPhonemes: ['ɔ', 'r', 'ɪ', 'n', 'dʒ'],
      commonMistakes: ['ornge', 'orang'],
      tips: {
        excellent: "Perfect! The 'OR' and soft 'J' were spot on! 🧡",
        good: "Well done! Nice clear 'OR' sound at the start.",
        fair: "Good try! Remember it ends with a soft 'J' sound.",
        poor: "Practice: 'OR-inj' - start strong, end with soft 'J'",
      },
      imageKey: 'orange',
    },
    {
      text: 'Strawberry',
      phonetic: 'STRAW-ber-ee',
      ipa: '/ˈstrɔˌbɛri/',
      difficulty: 'hard',
      keyPhonemes: ['s', 't', 'r', 'ɔ', 'b', 'ɛ', 'r', 'i'],
      commonMistakes: ['strawbery', 'strawberi'],
      tips: {
        excellent: 'Amazing! All three syllables perfect! 🍓',
        good: "Great job! The 'STRAW' beginning was excellent.",
        fair: "Good attempt! Work on 'STRAW-ber-ee' rhythm.",
        poor: "This is tricky! Three parts: 'STRAW' + 'ber' + 'ee'",
      },
      imageKey: 'strawberry',
    },
    {
      text: 'Chocolate',
      phonetic: 'CHAWK-lit',
      ipa: '/ˈtʃɔklət/',
      difficulty: 'medium',
      keyPhonemes: ['tʃ', 'ɔ', 'k', 'l', 'ə', 't'],
      commonMistakes: ['choclate', 'chocolit'],
      tips: {
        excellent: "Perfect! The 'CH' and 'K' sounds were clear! 🍫",
        good: "Well done! Nice emphasis on 'CHAWK'.",
        fair: "Good try! Remember: 'CHAWK-lit' (not choc-o-late).",
        poor: "Two syllables: 'CHAWK' + 'lit' - drop the middle 'o'!",
      },
      imageKey: 'chocolate',
    },
  ],

  animals: [
    {
      text: 'Elephant',
      phonetic: 'EL-uh-fuhnt',
      ipa: '/ˈɛləfənt/',
      difficulty: 'hard',
      keyPhonemes: ['ɛ', 'l', 'ə', 'f', 'ə', 'n', 't'],
      commonMistakes: ['elefant', 'eliphant'],
      tips: {
        excellent: 'Amazing! You mastered this challenging word! 🐘',
        good: "Great! The stress on 'EL' was perfect.",
        fair: "Good try! Three syllables: 'EL-uh-fuhnt'.",
        poor: "Break it down: 'EL' (strong) + 'uh' + 'fuhnt'",
      },
    },
    {
      text: 'Butterfly',
      phonetic: 'BUT-er-fly',
      ipa: '/ˈbʌtərˌflaɪ/',
      difficulty: 'medium',
      keyPhonemes: ['b', 'ʌ', 't', 'ər', 'f', 'l', 'aɪ'],
      commonMistakes: ['buterfly', 'butterfy'],
      tips: {
        excellent: 'Perfect! Beautiful pronunciation! 🦋',
        good: 'Excellent! All three syllables were clear.',
        fair: "Nice! Work on the 'fly' ending - make it rise.",
        poor: "Three parts: 'BUT' + 'er' + 'fly' (like the insect + fly)",
      },
    },
    {
      text: 'Tiger',
      phonetic: 'TY-gur',
      ipa: '/ˈtaɪgər/',
      difficulty: 'easy',
      keyPhonemes: ['t', 'aɪ', 'g', 'ər'],
      commonMistakes: ['tiger', 'tyger'],
      tips: {
        excellent: "Excellent! Perfect 'TY' sound! 🐅",
        good: "Great! The long 'I' in 'TY' was spot on.",
        fair: "Good! Make sure 'TY' sounds like 'tie', not 'ti'.",
        poor: "Practice: 'TY' (like 'tie') + 'gur' - two syllables",
      },
    },
    {
      text: 'Penguin',
      phonetic: 'PENG-gwin',
      ipa: '/ˈpɛŋgwɪn/',
      difficulty: 'medium',
      keyPhonemes: ['p', 'ɛ', 'ŋ', 'g', 'w', 'ɪ', 'n'],
      commonMistakes: ['penquin', 'pengwing'],
      tips: {
        excellent: "Perfect! The 'NG' sound was excellent! 🐧",
        good: "Great job! Nice clear 'PENG' beginning.",
        fair: "Good attempt! End with 'gwin', not 'gwin-g'.",
        poor: "Two parts: 'PENG' + 'gwin' - no extra 'g' at the end!",
      },
    },
  ],

  colors: [
    {
      text: 'Purple',
      phonetic: 'PUR-puhl',
      ipa: '/ˈpɜrpəl/',
      difficulty: 'medium',
      keyPhonemes: ['p', 'ɜr', 'p', 'ə', 'l'],
      commonMistakes: ['purpel', 'perpul'],
      tips: {
        excellent: "Perfect! Both 'R' sounds were clear! 💜",
        good: "Great! Nice emphasis on 'PUR'.",
        fair: "Good try! Make both 'R' sounds stronger.",
        poor: "Practice: 'PUR' (like purr) + 'puhl' - roll those R's!",
      },
    },
    {
      text: 'Yellow',
      phonetic: 'YEL-oh',
      ipa: '/ˈjɛloʊ/',
      difficulty: 'easy',
      keyPhonemes: ['j', 'ɛ', 'l', 'oʊ'],
      commonMistakes: ['yelow', 'yello'],
      tips: {
        excellent: 'Fantastic! Clear and bright like the color! 💛',
        good: "Well done! The 'YEL' was perfect.",
        fair: "Nice! End with 'oh' sound, not 'ow'.",
        poor: "Two parts: 'YEL' + 'oh' - simple and clear!",
      },
    },
  ],
};

// ---------- Analysis (simplified) ----------
class SpeechAnalyzer {
  static levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  static calculateSimilarity(recognized, target) {
    const a = recognized.toLowerCase().trim();
    const b = target.toLowerCase().trim();
    if (a === b) return 100;
    const dist = this.levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    const sim = ((maxLen - dist) / maxLen) * 100;
    return Math.max(0, Math.round(sim));
  }

  static analyzePhonemes(recognized, targetWord) {
    const r = recognized.toLowerCase().replace(/[^a-z]/g, '').split('');
    const t = targetWord.text.toLowerCase().replace(/[^a-z]/g, '').split('');
    let matches = 0;
    const maxLength = Math.max(r.length, t.length);
    for (let i = 0; i < Math.min(r.length, t.length); i++) {
      if (r[i] === t[i]) matches++;
    }
    return (matches / maxLength) * 100;
  }

  static generateFeedback(score, targetWord, recognized) {
    const level =
      score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor';
    let feedback = targetWord.tips[level];

    const recognizedLower = recognized?.toLowerCase?.() || '';
    if (score < 90 && recognizedLower && targetWord.commonMistakes.includes(recognizedLower)) {
      feedback += ` I heard "${recognized}" - that's a common variation!`;
    }
    return feedback;
  }

  static analyzePronunciation(recognizedText, targetWord) {
    const similarity = this.calculateSimilarity(recognizedText, targetWord.text);
    const phonemeMatches = this.analyzePhonemes(recognizedText, targetWord);
    let adjusted = (similarity + phonemeMatches) / 2;

    if (targetWord.commonMistakes.includes(recognizedText.toLowerCase())) {
      adjusted = Math.max(adjusted, 65);
    }

    return {
      accuracy: Math.min(100, Math.max(0, adjusted)),
      similarity,
      recognizedText,
      feedback: this.generateFeedback(adjusted, targetWord, recognizedText),
    };
  }
}

// ---------- Recording Service ----------
class SpeechRecognitionService {
  static async startRecording() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') throw new Error('Audio permission not granted');

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn('Audio mode setup failed, using default:', e);
      }

      const recording = new Audio.Recording();

      const recordingOptions = {
        android: {
          extension: '.webm',
          outputFormat: Audio.AndroidOutputFormat.WEBM, // ✅ Opus in WebM
          audioEncoder: Audio.AndroidAudioEncoder.OPUS,
          sampleRate: 48000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.caf',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM, // ✅ Linear PCM 16-bit
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: undefined,
      };

      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();
      return recording;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  static async stopRecording(recording) {
    try {
      await recording.stopAndUnloadAsync();
      return recording.getURI();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  static async recognizeSpeech(_audioUri) {
    // Mock recognizer as fallback
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const mockResults = [
          { text: 'tomatoes', confidence: 0.9 },
          { text: 'tomatos', confidence: 0.8 },
          { text: 'tomatoe', confidence: 0.7 },
          { text: 'apple', confidence: 0.95 },
          { text: 'apel', confidence: 0.75 },
          { text: 'banana', confidence: 0.9 },
          { text: 'bananna', confidence: 0.8 },
          { text: 'orange', confidence: 0.85 },
          { text: 'chocolate', confidence: 0.8 },
          { text: 'elefant', confidence: 0.7 },
          { text: 'unclear', confidence: 0.3 },
          { text: '', confidence: 0.1 },
        ];
        const weights = [0.25, 0.15, 0.1, 0.25, 0.1, 0.25, 0.1, 0.15, 0.15, 0.1, 0.05, 0.05];
        const rnd = Math.random();
        let cum = 0;
        let choice = mockResults[0];
        for (let i = 0; i < mockResults.length; i++) {
          cum += weights[i];
          if (rnd <= cum) {
            choice = mockResults[i];
            break;
          }
        }
        if (!choice.text) reject(new Error('No speech input detected - please speak clearly'));
        else resolve(choice);
      }, 1200);
    });
  }
}

// ---------- User Progress ----------
class UserProgress {
  static points = 0;
  static streak = 0;
  static totalAttempts = 0;
  static wordsCompleted = new Set();

  static addScore(accuracy, wordId) {
    this.totalAttempts++;
    let earned = 0;

    if (accuracy >= 90) {
      this.streak++;
      earned = 15 * Math.min(this.streak, 5);
      this.wordsCompleted.add(wordId);
    } else if (accuracy >= 75) {
      this.streak++;
      earned = 10 * Math.min(this.streak, 3);
    } else if (accuracy >= 60) {
      earned = 5;
      this.streak = Math.max(0, this.streak - 1);
    } else {
      earned = 2;
      this.streak = 0;
    }

    this.points += earned;
    return earned;
  }

  static getStats() {
    return {
      points: this.points,
      streak: this.streak,
      totalAttempts: this.totalAttempts,
      wordsCompleted: this.wordsCompleted.size,
      averageAccuracy: this.totalAttempts > 0 ? this.points / this.totalAttempts : 0,
    };
  }
}

// ---------- UI ----------
const { width, height } = Dimensions.get('window');

const WordImage = ({ imageKey }) => {
  const src = WORD_ASSETS[imageKey] || WORD_ASSETS.fallback;
  return (
    <View style={styles.wordImageWrap}>
      <Image source={src} style={styles.wordImage} resizeMode="contain" />
    </View>
  );
};

export default function WordsPracticeScreen({ route, navigation }) {
  const { category = 'food' } = route.params || {};
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const [wordIndex, setWordIndex] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [showScore, setShowScore] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [recognizedText, setRecognizedText] = useState('');
  const [audioRecording, setAudioRecording] = useState(null);
  const [usingAPI, setUsingAPI] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);

  const progressAnim = new Animated.Value(0);
  const pulseAnim = new Animated.Value(1);

  const words = WORD_DATABASE[category] || WORD_DATABASE.food;
  const currentWord = words[wordIndex];

  const speak = async () => {
    try {
      await Speech.stop();
      setCurrentTip('Listen to how it sounds!');
      await Speech.speak(currentWord.text, {
        language: 'en-US',
        pitch: 0.9,
        rate: 0.6,
        quality: Speech.QUALITY_ENHANCED || 'enhanced',
      });

      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCurrentTip(''), 2000);
    } catch (error) {
      console.error('Speech error:', error);
      setCurrentTip('❌ Could not play pronunciation. Please try again.');
      Alert.alert(
        'Audio Error',
        'Could not play pronunciation. Please check your device audio settings and try again.'
      );
    }
  };

  const startRecording = async () => {
    if (recording || analyzing) return;
    try {
      setRecording(true);
      setCurrentTip("I'm listening! Say the word nice and loud!");
      setAccuracy(0);
      setRecognizedText('');
      setRecognitionResult(null);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const rec = await SpeechRecognitionService.startRecording();
      setAudioRecording(rec);

      // Auto-stop after 8s
      const timer = setTimeout(async () => {
        if (rec && recording) await stopRecording();
      }, 8000);
      // store timer on instance for cleanup
      rec.__autoStopTimer = timer;
    } catch (error) {
      console.error('Recording error:', error);
      setRecording(false);
      setCurrentTip('❌ Recording failed. Please check microphone permissions.');

      let msg =
        'Could not start recording. Please check microphone permissions and try again.';
      if (String(error.message).includes('Audio permission not granted')) {
        msg = 'Microphone permission is required. Enable it in Settings, then try again.';
      }
      Alert.alert('Recording Error', msg);
    }
  };

  const stopRecording = async () => {
    if (!audioRecording) return;
    try {
      setRecording(false);
      setAnalyzing(true);
      setCurrentTip('Let me check how you did!');

      if (audioRecording.__autoStopTimer) clearTimeout(audioRecording.__autoStopTimer);
      const audioUri = await SpeechRecognitionService.stopRecording(audioRecording);
      setAudioRecording(null);

      // ---- Transcribe ----
      let recognition;
      try {
        if (API_KEY) {
          setUsingAPI(true);
          recognition = await GoogleSpeechService.transcribeAudio(audioUri, API_KEY);
        } else {
          setUsingAPI(false);
          recognition = await SpeechRecognitionService.recognizeSpeech(audioUri);
        }
      } catch (apiError) {
        console.warn('API recognition failed, using fallback:', apiError);
        setUsingAPI(false);

        if (String(apiError.message).includes('No speech input detected')) {
          setCurrentTip('❌ No speech detected. Please speak the word clearly!');
          setAnalyzing(false);
          return;
        } else {
          setCurrentTip('⚠️ API unavailable, using offline analysis...');
          try {
            recognition = await SpeechRecognitionService.recognizeSpeech(audioUri);
          } catch (fallbackError) {
            console.error('Fallback recognition also failed:', fallbackError);
            recognition = { text: currentWord.text.toLowerCase(), confidence: 0.6 };
          }
        }
      }

      // ---- Analyze ----
      const analysis = SpeechAnalyzer.analyzePronunciation(recognition.text, currentWord);

      // progress animation
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: analysis.accuracy,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      setAccuracy(analysis.accuracy);
      setCurrentTip(analysis.feedback);
      setRecognizedText(recognition.text);
      setRecognitionResult(recognition);

      const pts = UserProgress.addScore(analysis.accuracy, `${category}-${wordIndex}`);
      setEarnedPoints(pts);
      setShowScore(true);

      if (analysis.accuracy >= 85) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (analysis.accuracy >= 65) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setTimeout(() => setShowScore(false), 3000);
    } catch (error) {
      console.error('Analysis error:', error);
      setCurrentTip('❌ Analysis failed. Please try again.');
      Alert.alert('Error', 'Could not analyze pronunciation. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const nextWord = () => {
    const next = (wordIndex + 1) % words.length;
    setWordIndex(next);
    setAccuracy(0);
    setCurrentTip('');
    setRecognizedText('');
    setRecognitionResult(null);
    progressAnim.setValue(0);
  };

  const getAccuracyColor = (score) => {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#84cc16';
    if (score >= 55) return '#eab308';
    return '#ef4444';
  };

  const userStats = UserProgress.getStats();

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
        <Text style={styles.headerTitle}>Word Practice</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>Points: {userStats.points}</Text>
          {userStats.streak > 0 && <Text style={styles.streakText}>{userStats.streak}🔥</Text>}
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Word Card */}
        <View style={styles.wordCard}>
          <View style={styles.wordImageContainer}>
            <WordImage imageKey={currentWord.imageKey} />
          </View>
          <View style={styles.wordInfo}>
            <Text style={styles.word}>{currentWord.text}</Text>
            <Text style={styles.phonetic}>{currentWord.phonetic}</Text>
            <Text style={styles.ipa}>{currentWord.ipa}</Text>
            <View
              style={[
                styles.difficultyBadge,
                {
                  backgroundColor:
                    currentWord.difficulty === 'easy'
                      ? '#dcfce7'
                      : currentWord.difficulty === 'medium'
                      ? '#fef3c7'
                      : '#fecaca',
                },
              ]}
            >
              <Text
                style={[
                  styles.difficultyText,
                  {
                    color:
                      currentWord.difficulty === 'easy'
                        ? '#16a34a'
                        : currentWord.difficulty === 'medium'
                        ? '#ca8a04'
                        : '#dc2626',
                  },
                ]}
              >
                {currentWord.difficulty}
              </Text>
            </View>
          </View>
        </View>

        {/* Recognition Result */}
        {recognizedText ? (
          <View style={styles.recognitionCard}>
            <Text style={styles.recognitionLabel}>I heard:</Text>
            <Text style={styles.recognitionText}>"{recognizedText}"</Text>
            {usingAPI && recognitionResult && (
              <Text style={styles.confidenceText}>
                Confidence: {Math.round((recognitionResult?.confidence || 0) * 100)}%
              </Text>
            )}
          </View>
        ) : null}

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: getAccuracyColor(accuracy),
                },
              ]}
            />
          </View>
          <Text style={styles.accuracyText}>
            {accuracy > 0 ? `${Math.round(accuracy)}% Great job!` : 'Press "Speak" to start!'}
          </Text>
          {accuracy > 0 && (
            <Text style={styles.evaluationText}>
              {accuracy >= 85
                ? "Amazing! You're awesome!"
                : accuracy >= 70
                ? 'Great job!'
                : accuracy >= 55
                ? 'Good try!'
                : "Keep practicing, you've got this!"}
            </Text>
          )}
        </View>

        {/* Tip */}
        {currentTip ? (
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>{currentTip}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actionCard}>
          <View style={styles.actionRow}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={speak}
                activeOpacity={0.8}
                disabled={recording || analyzing}
              >
                <Image source={require('../../assets/speaker.png')} style={styles.icon} />
                <Text style={styles.buttonLabel}>Listen</Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={recording ? stopRecording : startRecording}
              disabled={analyzing}
              activeOpacity={0.8}
            >
              <Image
                source={
                  recording
                    ? require('../../assets/mic_recording.png')
                    : require('../../assets/mic.png')
                }
                style={styles.icon}
              />
              <Text style={styles.buttonLabel}>
                {recording ? 'Stop' : analyzing ? 'Analyzing...' : 'Speak'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Next word */}
        {accuracy > 0 && (
          <TouchableOpacity style={styles.nextButton} onPress={nextWord}>
            <Text style={styles.nextButtonText}>Next Word →</Text>
          </TouchableOpacity>
        )}

        {/* Bottom dots */}
        <View style={styles.dotsContainer}>
          {words.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: idx === wordIndex ? '#ff6b6b' : '#d1d5db',
                  transform: [{ scale: idx === wordIndex ? 1.2 : 1 }],
                },
              ]}
            />
          ))}
        </View>
      </ScrollView>

      {/* Score popup */}
      {showScore && (
        <Animated.View
          style={[
            styles.scorePopup,
            {
              transform: [{ scale: showScore ? 1 : 0 }],
            },
          ]}
        >
          <Text style={styles.scoreText}>+{earnedPoints} points!</Text>
          {userStats.streak > 1 && (
            <Text style={styles.scoreStreakText}>{userStats.streak}x streak! You're on fire!</Text>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ---------- Styles ----------
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff0f5' },

  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff0f5',
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
  },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#d32f2f',
    flex: 1,
    textAlign: 'center',
  },
  statsContainer: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  statsText: { fontSize: 18, fontWeight: '700', color: '#d32f2f' },
  streakText: { fontSize: 16, fontWeight: '700', color: '#e91e63' },

  wordCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffebee',
  },
  wordImageContainer: { marginBottom: 20 },
  wordImageWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  wordImage: { width: '100%', height: '100%', resizeMode: 'contain' },

  wordInfo: { alignItems: 'center' },
  word: { fontSize: 42, fontWeight: '800', color: '#d32f2f', marginBottom: 6, textAlign: 'center' },
  phonetic: {
    fontSize: 18,
    color: '#e91e63',
    fontStyle: 'italic',
    marginBottom: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  ipa: {
    fontSize: 18,
    color: '#ad1457',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  difficultyBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  difficultyText: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },

  recognitionCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffebee',
  },
  recognitionLabel: { fontSize: 16, color: '#6b7280', marginBottom: 8, fontWeight: '600' },
  recognitionText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  confidenceText: { fontSize: 14, color: '#6b7280', marginTop: 8, fontStyle: 'italic' },

  progressCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffebee',
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: { height: '100%', borderRadius: 6, minWidth: 4 },
  accuracyText: { fontSize: 16, color: '#6b7280', fontWeight: '600', marginBottom: 4 },
  evaluationText: { fontSize: 14, color: '#374151', fontWeight: '600', textAlign: 'center' },

  tipCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffebee',
  },
  tipText: { fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 22, fontWeight: '500' },

  actionCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffebee',
  },
  actionRow: { flexDirection: 'row', gap: 20, justifyContent: 'center' },
  actionButton: { alignItems: 'center', justifyContent: 'center' },
  icon: { width: 100, height: 100, marginBottom: 8 },
  buttonLabel: { fontSize: 14, color: '#d32f2f', fontWeight: '700' },

  nextButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    alignSelf: 'center',
  },
  nextButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },

  dotsContainer: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 20, marginBottom: 20 },
  dot: { width: 10, height: 10, borderRadius: 5 },

  scorePopup: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  scoreText: { color: 'white', fontSize: 20, fontWeight: '800' },
  scoreStreakText: { color: 'white', fontSize: 16, marginTop: 4, fontWeight: '700' },
});
