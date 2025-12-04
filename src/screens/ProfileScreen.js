import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  BackHandler
} from 'react-native';
import { colors, radii } from '../utils/theme';
import { getQuizResults, clearQuizResults } from '../utils/quizStorage';

export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const profile = await getQuizResults();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleTitlePress = () => {
    setTapCount(tapCount + 1);
    if (tapCount >= 4) { // 5 taps to activate admin
      setShowAdmin(true);
      setTapCount(0);
      Alert.alert('Admin Mode', 'Admin debug mode activated!');
    }
  };

  const clearData = () => {
    Alert.alert(
      'Clear Quiz Data',
      'This will delete all stored quiz answers and restart the app. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Restart',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearQuizResults();
              setUserProfile(null);
              Alert.alert(
                'Success', 
                'Quiz data cleared! Please close and reopen the app to see the quiz again.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Force close the app (works on some platforms)
                      BackHandler.exitApp();
                    }
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Could not clear data');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}> 
          <TouchableOpacity onPress={handleTitlePress}>
            <Text style={styles.headerTitle}>Profile & Personalization</Text>
          </TouchableOpacity>
          <Text style={styles.headerSubtitle}>Manage voice, avatar, and languages</Text>
        </View>

        {/* Dashboard */}
        <View style={styles.dashboardRow}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Usage</Text>
            <Text style={styles.cardMetric}>42 min</Text>
            <Text style={styles.cardHint}>This week</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Conversations</Text>
            <Text style={styles.cardMetric}>18</Text>
            <Text style={styles.cardHint}>Completed</Text>
          </View>
        </View>
        <View style={styles.cardWide}>
          <Text style={styles.cardTitle}>Emotion Analytics</Text>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsPill}><Text style={styles.pillText}>Calm 68%</Text></View>
            <View style={styles.analyticsPill}><Text style={styles.pillText}>Focused 22%</Text></View>
            <View style={styles.analyticsPill}><Text style={styles.pillText}>Tense 10%</Text></View>
          </View>
        </View>

        {/* User */}
        <View style={styles.cardWide}>
          <Text style={styles.sectionTitle}>Personalization</Text>
          {userProfile ? (
            <View>
              <Text style={styles.infoRow}>Name: <Text style={styles.infoValue}>{userProfile.name}</Text></Text>
              <Text style={styles.infoRow}>Age: <Text style={styles.infoValue}>{userProfile.age}</Text></Text>
              <Text style={styles.infoRow}>Learning Style: <Text style={styles.infoValue}>{userProfile.learningStyle || '—'}</Text></Text>
              <Text style={styles.infoRow}>Goals: <Text style={styles.infoValue}>{Array.isArray(userProfile.goals)? userProfile.goals.join(', ') : (userProfile.goals || '—')}</Text></Text>
              <TouchableOpacity style={styles.resetButton} onPress={clearData}>
                <Text style={styles.resetButtonText}>Reset onboarding</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.infoEmpty}>Complete the onboarding quiz to personalize your experience.</Text>
          )}
        </View>

        {/* Admin Debug Section */}
        {showAdmin && (
          <View style={styles.adminSection}>
            <View style={styles.adminHeader}>
              <Text style={styles.adminTitle}>🔧 Admin Debug Mode</Text>
              <TouchableOpacity style={styles.hideButton} onPress={() => setShowAdmin(false)}>
                <Text style={styles.hideButtonText}>Hide</Text>
              </TouchableOpacity>
            </View>

            {userProfile ? (
              <View style={styles.debugContent}>
                {/* Basic Info */}
                <View style={styles.debugSection}>
                  <Text style={styles.debugSectionTitle}>👤 Basic Information</Text>
                  <Text style={styles.debugText}>Name: {userProfile.name || 'Not provided'}</Text>
                  <Text style={styles.debugText}>Age: {userProfile.age || 'Not provided'}</Text>
                  <Text style={styles.debugText}>
                    Interests: {Array.isArray(userProfile.interests) 
                      ? userProfile.interests.join(', ') 
                      : userProfile.interests || 'Not provided'
                    }
                  </Text>
                  <Text style={styles.debugText}>Social Comfort: {userProfile.socialComfort || 'Not provided'}</Text>
                </View>

                {/* Learning Preferences */}
                <View style={styles.debugSection}>
                  <Text style={styles.debugSectionTitle}>🎓 Learning Preferences</Text>
                  <Text style={styles.debugText}>Learning Style: {userProfile.learningStyle || 'Not provided'}</Text>
                  <Text style={styles.debugText}>Focus Duration: {userProfile.focusDuration || 'Not provided'}</Text>
                  <Text style={styles.debugText}>Comfort Environment: {userProfile.comfortEnvironment || 'Not provided'}</Text>
                </View>

                {/* Communication Profile */}
                <View style={styles.debugSection}>
                  <Text style={styles.debugSectionTitle}>💬 Communication Profile</Text>
                  <Text style={styles.debugText}>Communication Preference: {userProfile.communicationPreference || 'Not provided'}</Text>
                  <Text style={styles.debugText}>
                    Challenges: {Array.isArray(userProfile.challenges) 
                      ? userProfile.challenges.join(', ') 
                      : userProfile.challenges || 'Not provided'
                    }
                  </Text>
                  <Text style={styles.debugText}>
                    Goals: {Array.isArray(userProfile.goals) 
                      ? userProfile.goals.join(', ') 
                      : userProfile.goals || 'Not provided'
                    }
                  </Text>
                </View>

                {/* Text Responses */}
                <View style={styles.debugSection}>
                  <Text style={styles.debugSectionTitle}>📝 Text Responses</Text>
                  <Text style={styles.debugText}>Fun Activities: {userProfile.textResponses?.fun_activities || 'Not provided'}</Text>
                  <Text style={styles.debugText}>Family Description: {userProfile.textResponses?.family_description || 'Not provided'}</Text>
                  <Text style={styles.debugText}>Favorite Activity: {userProfile.textResponses?.favorite_activity || 'Not provided'}</Text>
                  <Text style={styles.debugText}>Proud Moment: {userProfile.textResponses?.proud_moment || 'Not provided'}</Text>
                  <Text style={styles.debugText}>Happy & Safe: {userProfile.textResponses?.happy_safe || 'Not provided'}</Text>
                </View>

                {/* Personalization Settings */}
                <View style={styles.debugSection}>
                  <Text style={styles.debugSectionTitle}>⚙️ Personalization Settings</Text>
                  <Text style={styles.debugText}>Difficulty Level: {userProfile.difficultyLevel || 'Not set'}</Text>
                  <Text style={styles.debugText}>Conversation Complexity: {userProfile.conversationComplexity || 'Not set'}</Text>
                  <Text style={styles.debugText}>Excitement Expression: {userProfile.excitementExpression || 'Not provided'}</Text>
                </View>

                {/* Raw Data */}
                <View style={styles.debugSection}>
                  <Text style={styles.debugSectionTitle}>📊 Raw Data (JSON)</Text>
                  <Text style={styles.rawDataText}>
                    {JSON.stringify(userProfile, null, 2)}
                  </Text>
                </View>

                {/* Admin Actions */}
                <View style={styles.adminActions}>
                  <TouchableOpacity style={styles.clearButton} onPress={clearData}>
                    <Text style={styles.clearButtonText}>🗑️ Clear All Data</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.noDataText}>No quiz data found</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardWide: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  cardMetric: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 6,
  },
  cardHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  analyticsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  analyticsPill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  pillText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  userInfo: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  infoRow: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  infoValue: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  resetButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  adminSection: {
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  hideButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hideButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  debugContent: {
    padding: 16,
  },
  debugSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  debugSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 20,
  },
  rawDataText: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  adminActions: {
    marginTop: 16,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});


