import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ScrollView, Animated } from 'react-native';

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
          <Image source={require('../../assets/home.png')} style={styles.mascot} />
          <View>
            <Text style={styles.headerTitle}>Fun Learning Time</Text>
            <View style={styles.progressBarOuter}>
              <View style={styles.progressBarInner} />
            </View>
          </View>
        </View>
        <View style={styles.currency}>
          <Image source={require('../../assets/flower.png')} style={styles.currencyIcon} />
          <Text style={styles.currencyText}>5</Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Directories */}
        {directories.map((item) => renderItem({ item }))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff0f5' },

  header: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    backgroundColor: '#ffebee',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomColor: 'rgba(255,107,107,0.2)', borderBottomWidth: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  mascot: { width: 66, height: 66, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#d32f2f', marginBottom: 8 },
  progressBarOuter: { height: 16, width: 240, backgroundColor: '#ffcdd2', borderRadius: 25, overflow: 'hidden' },
  progressBarInner: { width: '30%', height: '100%', backgroundColor: '#ff6b6b' },

  currency: { flexDirection: 'row', alignItems: 'center' },
  currencyIcon: { width: 77, height: 44, marginRight: 6 },
  currencyText: { fontSize: 36, fontWeight: '800', color: '#d32f2f' },

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
    backgroundColor: '#ffffff',
    paddingVertical: 24, paddingHorizontal: 20,
    borderRadius: 24, marginBottom: 20, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#ff6b6b', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12, elevation: 6, borderWidth: 2, borderColor: '#ffebee',
  },
  cardIconWrap: {
    width: 60, height: 60, borderRadius: 16, backgroundColor: '#ffebee',
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
    borderWidth: 2, borderColor: '#ffcdd2',
  },
  cardIcon: { width: 70, height: 68 },
  cardTitle: { fontSize: 28, fontWeight: '700', color: '#d32f2f' },
});
