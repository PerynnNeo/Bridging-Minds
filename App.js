import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Image } from 'react-native';
import { enableScreens } from 'react-native-screens';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import TranslateScreen from './src/screens/TranslateScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WordsNavigator from './src/navigation/WordsNavigator';
import ConversationBuddyScreen from './src/screens/ConversationBuddy';
import OnboardingQuiz from './src/screens/OnboardingQuiz';
import { isQuizCompleted } from './src/utils/quizStorage';

enableScreens();

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

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
    colors: { ...DefaultTheme.colors, background: '#fef7f0' },
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b6b" />
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
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#ff6b6b',
          tabBarInactiveTintColor: '#ffb3ba',
          tabBarItemStyle: { flex: 1 }, // equal width per visible tab
          tabBarStyle: {
            position: 'absolute',
            left: 12, right: 12, bottom: 10,
            height: 72, paddingBottom: 8, paddingTop: 8,
            backgroundColor: '#fff5f5',
            borderTopWidth: 0, borderRadius: 16,
            shadowColor: '#000', shadowOpacity: 0.08,
            shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
          },
          tabBarIcon: () => {
            if (route.name === 'Home') {
              return <Image source={require('./assets/home.png')} style={{ width: 34, height: 34 }} />;
            }
            if (route.name === 'Translate') {
              return <Image source={require('./assets/microphone.png')} style={{ width: 34, height: 34 }} />;
            }
            if (route.name === 'Profile') {
              return <Image source={require('./assets/setting.png')} style={{ width: 34, height: 34 }} />;
            }
            return null;
          },
        })}
      >
        {/* Exactly THREE visible tabs → spaced evenly */}
        <Tab.Screen name="Home" component={HomeStackScreen} />
        <Tab.Screen name="Translate" component={TranslateScreen} />
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
    backgroundColor: '#fff0f5',
  },
});
