// WordsCategoriesScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated, TextInput } from 'react-native';
import { colors, radii } from '../utils/theme';

const WORD_CATEGORIES = [
  { key: 'food', label: 'Food', icon: '🍎', color: '#FFE8E0' },
  { key: 'animals', label: 'Animals', icon: '🐾', color: '#E8F5E9' },
  { key: 'adjectives', label: 'Adjectives', icon: '✨', color: '#F3E5F5' },
  { key: 'emotions', label: 'Emotions', icon: '😊', color: '#FFF9C4' },
  { key: 'countries', label: 'Countries', icon: '🌍', color: '#E1F5FE' },
  { key: 'items', label: 'Items', icon: '📦', color: '#FFEBEE' },
];

const PHRASE_CATEGORIES = [
  { key: 'common', label: 'Common Phrases', icon: '💬', color: '#E8EAF6' },
  { key: 'daily', label: 'Daily Expressions', icon: '☀️', color: '#FFF3E0' },
  { key: 'custom', label: 'Custom Phrases', icon: '✏️', color: '#E0F2F1' },
];

export default function WordsCategoriesScreen({ navigation }) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const filterCategories = (categories) => {
    if (!searchQuery) return categories;
    return categories.filter(c => 
      c.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleCategoryPress = (item, type) => {
    setSelectedCategory(item.key);
    // Animate before navigation
    setTimeout(() => {
      navigation.navigate('Practice', { type, category: item.key });
      setSelectedCategory(null);
    }, 150);
  };

  const renderTile = (item, type) => {
    const isSelected = selectedCategory === item.key;
    
    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.tile,
          { backgroundColor: item.color },
          isSelected && styles.tileSelected
        ]}
        activeOpacity={0.7}
        onPress={() => handleCategoryPress(item, type)}
      >
        <Text style={styles.tileIcon}>{item.icon}</Text>
        <Text style={styles.tileText}>{item.label}</Text>
        {isSelected && <View style={styles.selectedBadge} />}
      </TouchableOpacity>
    );
  };

  const filteredWords = filterCategories(WORD_CATEGORIES);
  const filteredPhrases = filterCategories(PHRASE_CATEGORIES);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Compact Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.getParent()?.navigate('Translate');
          }}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Categories</Text>
          <Text style={styles.headerSubtitle}>Choose a topic to explore</Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.starIcon}>⭐</Text>
          <Text style={styles.starCount}>5</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.content}>
            {/* Words Section */}
            {filteredWords.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDivider, { backgroundColor: '#4A90E2' }]} />
                  <Text style={styles.sectionTitle}>Words</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{filteredWords.length}</Text>
                  </View>
                </View>
                <View style={styles.grid}>
                  {filteredWords.map((c) => renderTile(c, 'word'))}
                </View>
              </>
            )}

            {/* Phrases Section */}
            {filteredPhrases.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 40 }]}>
                  <View style={[styles.sectionDivider, { backgroundColor: '#9C27B0' }]} />
                  <Text style={styles.sectionTitle}>Phrases</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{filteredPhrases.length}</Text>
                  </View>
                </View>
                <View style={styles.grid}>
                  {filteredPhrases.map((c) => renderTile(c, 'phrase'))}
                </View>
              </>
            )}

            {/* No Results */}
            {filteredWords.length === 0 && filteredPhrases.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>No categories found</Text>
              </View>
            )}
          </View>
        }
        data={[]}
        renderItem={null}
        keyExtractor={() => 'x'}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerHint}>💡 Tap a category to begin</Text>
          </View>
        }
      />

      {/* Breadcrumb Progress */}
      <View style={styles.breadcrumb}>
        <Text style={styles.breadcrumbText}>Home</Text>
        <Text style={styles.breadcrumbSeparator}>›</Text>
        <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>Categories</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.divider,
  },

  backIcon: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },

  headerTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '800',
  },

  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },

  starIcon: {
    fontSize: 14,
    marginRight: 4,
  },

  starCount: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },

  sectionDivider: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },

  sectionBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },

  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 8,
  },

  tile: {
    width: '31%',
    minWidth: 100,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 6,
    position: 'relative',
  },

  tileSelected: {
    borderColor: '#4A90E2',
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0.12,
  },

  tileIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  tileText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },

  footerHint: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  breadcrumb: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  breadcrumbText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  breadcrumbSeparator: {
    fontSize: 13,
    color: colors.textSecondary,
    marginHorizontal: 8,
  },

  breadcrumbActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});