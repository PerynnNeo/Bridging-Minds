import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors, radii } from '../utils/theme';
import { BookOpen, MessageSquare } from 'lucide-react-native';

export default function PracticeScreen({ navigation }) {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}> 
      <View style={styles.header}>
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.subtitle}>Choose how you want to improve today</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('WordsRoot')}
          accessibilityRole="button"
          accessibilityLabel="Word practice"
        >
          <View style={styles.cardIconWrap}>
            <BookOpen size={28} color={colors.accent} />
          </View>
          <Text style={styles.cardTitle}>Word Practice</Text>
          <Text style={styles.cardSubtitle}>Improve pronunciation one word at a time</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ConversationBuddy')}
          accessibilityRole="button"
          accessibilityLabel="Scenario practice"
        >
          <View style={styles.cardIconWrap}>
            <MessageSquare size={28} color={colors.accent} />
          </View>
          <Text style={styles.cardTitle}>Scenario Practice</Text>
          <Text style={styles.cardSubtitle}>Practice real-life speaking situations</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 50, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },

  cards: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.divider, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.divider },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary },
});


