import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Image } from 'react-native';
import { enableScreens } from 'react-native-screens';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Mic, MessageSquare, Settings, BookOpen } from 'lucide-react-native';
import { colors } from './src/utils/theme';

import HomeScreen from './src/screens/HomeScreen';
import TranslateScreen from './src/screens/TranslateScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WordsNavigator from './src/navigation/WordsNavigator';
import ConversationBuddyScreen from './src/screens/ConversationBuddy';
import ChatbotScreen from './src/screens/ChatbotScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import OnboardingQuiz from './src/screens/OnboardingQuiz';
import { isQuizCompleted } from './src/utils/quizStorage';

enableScreens();

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const PracticeStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      {/* Hidden-from-tab pages live inside HomeStack */}
      <HomeStack.Screen name="ConversationBuddy" component={ConversationBuddyScreen} />
      <HomeStack.Screen name="WordsRoot" component={WordsNavigator} />
    </HomeStack.Navigator>
  );
}

function PracticeStackScreen() {
  return (
    <PracticeStack.Navigator screenOptions={{ headerShown: false }}>
      <PracticeStack.Screen name="PracticeMain" component={PracticeScreen} />
      <PracticeStack.Screen name="ConversationBuddy" component={ConversationBuddyScreen} />
      <PracticeStack.Screen name="WordsRoot" component={WordsNavigator} />
    </PracticeStack.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    checkQuizStatus();
  }, [refreshKey]);

  const checkQuizStatus = async () => {
    try {
      const quizCompleted = await isQuizCompleted();
      setShowQuiz(!quizCompleted);
    } catch (error) {
      console.error('Error checking quiz status:', error);
      setShowQuiz(true); // Show quiz if there's an error
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh quiz status (called from ProfileScreen)
  const refreshQuizStatus = () => {
    setRefreshKey(prev => prev + 1);
  };

  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: colors.background },
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (showQuiz) {
    return (
      <NavigationContainer theme={theme}>
        <StatusBar style="dark" />
        <OnboardingQuiz navigation={{ replace: (screen) => setShowQuiz(false) }} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="dark" />
      <Tab.Navigator
        initialRouteName="Translate"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarItemStyle: { flex: 1 }, // equal width per visible tab
          tabBarStyle: {
            position: 'absolute',
            left: 12, right: 12, bottom: 10,
            height: 72, paddingBottom: 8, paddingTop: 8,
            backgroundColor: colors.surface,
            borderTopWidth: 0, borderRadius: 16,
            shadowColor: '#000', shadowOpacity: 0.06,
            shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
          },
          tabBarIcon: ({ color }) => {
            if (route.name === 'Translate') {
              return <Mic size={26} color={color} />;
            }
            if (route.name === 'Chat') {
              return <MessageSquare size={26} color={color} />;
            }
            if (route.name === 'Practice') {
              return <BookOpen size={26} color={color} />;
            }
            if (route.name === 'Profile') {
              return <Settings size={26} color={color} />;
            }
            return null;
          },
        })}
      >
        {/* Exactly THREE visible tabs → spaced evenly */}
        <Tab.Screen name="Translate" component={TranslateScreen} />
        <Tab.Screen name="Practice" component={PracticeStackScreen} />
        <Tab.Screen name="Chat" component={ChatbotScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
