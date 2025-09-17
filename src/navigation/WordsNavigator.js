import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WordsCategoriesScreen from '../screens/WordsCategoriesScreen';
import WordsPracticeScreen from '../screens/WordsPracticeScreen';

const Stack = createNativeStackNavigator();

export default function WordsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="Categories" component={WordsCategoriesScreen} options={{ title: 'Categories' }} />
      <Stack.Screen name="Practice" component={WordsPracticeScreen} options={{ title: 'Practice' }} />
    </Stack.Navigator>
  );
}


