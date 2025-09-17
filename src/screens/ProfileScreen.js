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
        {/* Main Content */}
        <View style={styles.mainContent}>
          <TouchableOpacity onPress={handleTitlePress}>
            <Text style={styles.text}>Your amazing progress will show up here!</Text>
          </TouchableOpacity>
          
          {userProfile && (
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>
                Welcome back, {userProfile.name}! 👋
              </Text>
              <Text style={styles.ageText}>Age: {userProfile.age}</Text>
              
              {/* Quick Reset Button for Testing */}
              <TouchableOpacity style={styles.resetButton} onPress={clearData}>
                <Text style={styles.resetButtonText}>🔄 Reset Quiz (Testing)</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#fff0f5',
  },
  scrollContainer: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  text: {
    fontSize: 24,
    color: '#d32f2f',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  userInfo: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    color: '#e91e63',
    fontWeight: '600',
    marginBottom: 8,
  },
  ageText: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '500',
    marginBottom: 16,
  },
  resetButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  adminSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#ff6b6b',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#ffebee',
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffebee',
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d32f2f',
  },
  hideButton: {
    backgroundColor: '#ff6b6b',
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
    backgroundColor: '#ffebee',
    borderRadius: 12,
  },
  debugSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d32f2f',
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
    backgroundColor: '#ef4444',
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
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});


