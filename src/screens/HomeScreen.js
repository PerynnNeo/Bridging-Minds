import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated } from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../utils/theme';

const directories = [
  { key: 'words',        title: 'Words Practice',     icon: require('../../assets/WordsPractice.png') },
  { key: 'conversation', title: 'Conversation Buddy', icon: require('../../assets/ConversationBuddy.png') },
  { key: 'translate',    title: 'Translate',          icon: require('../../assets/mic.png') },
  { key: 'aac',          title: 'AAC',                icon: require('../../assets/AAC.png') },
];

export default function HomeScreen({ navigation }) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    // Simple fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => {
        switch (item.key) {
          case 'words':
            // 👉 This route lives INSIDE HomeStack
            navigation.navigate('WordsRoot');
            break;
          case 'conversation':
            // 👉 This route lives INSIDE HomeStack
            navigation.navigate('ConversationBuddy');
            break;
          case 'translate':
            // 👉 This is a TAB sibling; navigate on the PARENT navigator
            navigation.getParent()?.navigate('Translate');
            break;
          case 'aac':
            // (use your AAC screen route if/when you add it)
            navigation.getParent()?.navigate('Profile');
            break;
        }
      }}
    >
      <View style={styles.cardIconWrap}>
        <Image source={item.icon} style={styles.cardIcon} resizeMode="contain" />
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandDot} />
          <View>
            <Text style={styles.headerTitle}>BridgingMinds</Text>
            <View style={styles.progressBarOuter}>
              <View style={styles.progressBarInner} />
            </View>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary actions */}
        {directories.map((item) => renderItem({ item }))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomColor: colors.divider, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  brandDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, marginRight: 12 },
  headerTitle: { ...typography.title, color: colors.textPrimary, marginBottom: 8 },
  progressBarOuter: { height: 8, width: 220, backgroundColor: colors.surfaceAlt, borderRadius: 25, overflow: 'hidden' },
  progressBarInner: { width: '40%', height: '100%', backgroundColor: colors.accent },

  challengeCard: {
    marginTop: 45, marginHorizontal: 16,
    backgroundColor: '#ffffff', borderRadius: 16, padding: 30,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  challengeTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  continueBtn: {
    position: 'absolute', left: 16, bottom: 6,
    backgroundColor: '#f7f7f7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  continueText: { fontWeight: '700', color: '#111827' },

  challengeCta: {
    position: 'absolute', right: 16, top: 14,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff7e6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  challengeCtaText: { color: '#fb8c00', fontWeight: '700', marginRight: 6 },
  challengeCtaIcon: { width: 44, height: 44 },

  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },

  card: {
    backgroundColor: colors.surface,
    paddingVertical: 20, paddingHorizontal: 16,
    borderRadius: radii.xl, marginBottom: 16, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: colors.divider,
  },
  cardIconWrap: {
    width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
    borderWidth: 1, borderColor: colors.divider,
  },
  cardIcon: { width: 56, height: 52 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
});
