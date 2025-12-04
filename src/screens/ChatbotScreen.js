import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { colors, radii } from '../utils/theme';
import { Send, Trash2, Mic, Keyboard } from 'lucide-react-native';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { OPENAI_API_KEY, GOOGLE_STT_API_KEY } = (Constants.expoConfig?.extra ?? Constants?.manifestExtra ?? {});

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 72;
  const TAB_BAR_BOTTOM_OFFSET = 10;
  const extraBottom = insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET;
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your AI assistant. Ask me anything.' },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'voice'
  const recordingRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 450, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isRecording, pulseAnim]);

  const transcribeAudio = async (uri) => {
    if (!GOOGLE_STT_API_KEY) {
      throw new Error('Google STT key missing. Add GOOGLE_STT_API_KEY to your .env and app.config.js.');
    }
    let base64;
    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      if (blob.size < 1000) throw new Error('No speech detected');
      const reader = new FileReader();
      base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('Recording file was not created');
      if (fileInfo.size < 1000) throw new Error('Recording is too short. Please speak longer.');
      base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    }
    const apiRes = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_STT_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: { languageCode: 'en-US', enableAutomaticPunctuation: true, model: Platform.OS === 'web' ? 'latest_short' : 'phone_call', useEnhanced: Platform.OS !== 'web' },
        audio: { content: base64 },
      }),
    });
    if (!apiRes.ok) {
      const txt = await apiRes.text();
      throw new Error(`STT failed: ${txt}`);
    }
    const json = await apiRes.json();
    const alt = json?.results?.[0]?.alternatives?.[0];
    return alt?.transcript?.trim() || '';
  };

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
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: { extension: '.m4a', outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4, audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC, sampleRate: 16000, numberOfChannels: 1, bitRate: 64000 },
        ios: { extension: '.m4a', outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC, audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH, sampleRate: 16000, numberOfChannels: 1, bitRate: 64000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
      });
      await rec.startAsync();
      recordingRef.current = rec;
      setIsRecording(true);
      setTimeout(() => {
        if (recordingRef.current) stopRecording();
      }, 10000);
    } catch (e) {
      console.error('Recording error:', e);
      setIsRecording(false);
      recordingRef.current = null;
      Alert.alert('Recording Error', `Could not start recording: ${e.message}`);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      const transcript = await transcribeAudio(uri);
      if (transcript) {
        setInput(transcript);
        setInputMode('text');
        send(transcript);
      } else {
        Alert.alert('No Speech', 'No speech detected. Please try again.');
      }
    } catch (e) {
      console.error('Recording/transcription error:', e);
      setIsRecording(false);
      recordingRef.current = null;
      Alert.alert('Processing Error', e.message || 'Could not process your voice.');
    }
  };

  const send = async (textOverride = null) => {
    const text = (textOverride || input).trim();
    if (!text || isSending) return;
    setInput('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setIsSending(true);
    try {
      if (!OPENAI_API_KEY) {
        // Fallback: echo with slight variation
        setTimeout(() => {
          setMessages((m) => [...m, { role: 'assistant', content: `You said: "${text}"` }]);
          setIsSending(false);
        }, 400);
        return;
      }

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.7,
          max_tokens: 300,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      const answer = data?.choices?.[0]?.message?.content?.trim() || '…';
      setMessages((m) => [...m, { role: 'assistant', content: answer }]);
    } catch (e) {
      console.error('Chat error:', e);
      Alert.alert('Chat Error', e.message || 'Could not get a reply.');
    } finally {
      setIsSending(false);
    }
  };

  const clear = () => setMessages([{ role: 'assistant', content: 'Conversation cleared. Ask me anything.' }]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>Chatbot</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={clear} accessibilityLabel="Clear chat">
          <Trash2 size={18} color={'white'} />
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={[styles.chatContent, { paddingBottom: extraBottom + 80 }]} showsVerticalScrollIndicator={false}>
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.me : styles.them]}>
            <Text style={[styles.text, m.role === 'user' ? styles.meText : styles.themText]}>{m.content}</Text>
          </View>
        ))}
        {isSending && (
          <View style={[styles.bubble, styles.them]}>
            <Text style={styles.themText}>Thinking…</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: 12 + insets.bottom, bottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET }] }>
        <TouchableOpacity
          style={[styles.modeBtn, inputMode === 'text' && styles.modeBtnActive]}
          onPress={() => setInputMode('text')}
          accessibilityLabel="Text input mode"
        >
          <Keyboard size={18} color={inputMode === 'text' ? 'white' : colors.textSecondary} />
        </TouchableOpacity>

        {inputMode === 'text' ? (
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message"
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
        ) : (
          <View style={styles.voiceContainer}>
            <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
              <TouchableOpacity
                style={[styles.voiceBtn, isRecording && styles.voiceBtnRecording]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isSending}
                accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <Mic size={24} color={isRecording ? 'white' : colors.accent} />
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.voiceHint}>{isRecording ? 'Recording... Tap to stop' : 'Tap to record'}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.modeBtn, inputMode === 'voice' && styles.modeBtnActive]}
          onPress={() => setInputMode('voice')}
          accessibilityLabel="Voice input mode"
        >
          <Mic size={18} color={inputMode === 'voice' ? 'white' : colors.textSecondary} />
        </TouchableOpacity>

        {inputMode === 'text' && (
          <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={isSending} accessibilityLabel="Send message">
            <Send size={18} color={'white'} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 50, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  clearBtn: { backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },

  chat: { flex: 1, backgroundColor: colors.background },
  chatContent: { padding: 16, paddingBottom: 24 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginVertical: 6, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  me: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  them: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider },
  text: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  meText: { color: 'white' },
  themText: { color: colors.textPrimary },

  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface, position: 'absolute', left: 0, right: 0 },
  modeBtn: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.divider, marginRight: 8 },
  modeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  input: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.divider, color: colors.textPrimary },
  voiceContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  voiceBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.accent },
  voiceBtnRecording: { backgroundColor: colors.accent, borderColor: colors.accent },
  voiceHint: { fontSize: 12, color: colors.textTertiary, marginTop: 6, fontWeight: '600' },
  sendBtn: { marginLeft: 10, backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
});


