// WordsCategoriesScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Animated } from 'react-native';

const WORD_CATEGORIES = [
  { key: 'food', label: 'Food' },
  { key: 'animals', label: 'Animals' },
  { key: 'adjectives', label: 'Adjectives' },
  { key: 'emotions', label: 'Emotions' },
  { key: 'countries', label: 'Countries' },
  { key: 'items', label: 'Items' },
];

const PHRASE_CATEGORIES = [
  { key: 'common', label: 'Common Phrases' },
  { key: 'items', label: 'Items' },
  { key: 'custom', label: 'Add own phrases' },
];

export default function WordsCategoriesScreen({ navigation }) {
  const [fadeAnim] = useState(new Animated.Value(0));

  // Ensure header is disabled
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Simple fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const renderTile = (item, type) => (
    <TouchableOpacity
      key={item.key}
      style={styles.tile}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Practice', { type, category: item.key })}
    >
      <Text style={styles.tileText}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.getParent()?.navigate('Home');
          }}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.headerRight}>
          <Image
            source={require('../../assets/flower.png')}
            style={styles.headerIcon}
          />
          <Text style={styles.starCount}>5</Text>
        </View>
      </View>

      <FlatList
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Words</Text>
            <View style={styles.grid}>
              {WORD_CATEGORIES.map((c) => renderTile(c, 'word'))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Phrases</Text>
            <View style={styles.grid}>
              {PHRASE_CATEGORIES.map((c) => renderTile(c, 'phrase'))}
            </View>
          </View>
        }
        data={[]}
        renderItem={null}
        keyExtractor={() => 'x'}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff0f5',
  },

  /* Header layout: three columns (left/back, center/title, right/currency) */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
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
    marginRight: 16,
  },
  backText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  headerTitle: {
    fontSize: 28,
    color: '#d32f2f',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },

  headerIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 6,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },

  starCount: {
    fontSize: 18,
    color: '#d32f2f',
    fontWeight: '700',
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#d32f2f',
    marginBottom: 16,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },

  tile: {
    width: '31%',
    minWidth: 100,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 12,
  },

  tileText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d32f2f',
    textAlign: 'center',
  },
});
