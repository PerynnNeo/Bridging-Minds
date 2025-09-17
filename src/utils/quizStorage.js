// Quiz Storage Utility
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUIZ_STORAGE_KEY = 'vocanova_quiz_results';
const QUIZ_COMPLETED_KEY = 'vocanova_quiz_completed';

// Quiz Questions Data
export const QUIZ_QUESTIONS = {
  section1: {
    title: "Let's Get to Know You",
    questions: [
      {
        id: 'name',
        text: "What's your name?",
        type: 'text',
        required: true
      },
      {
        id: 'age',
        text: "How old are you?",
        type: 'text',
        required: true
      },
      {
        id: 'interests',
        text: "What do you like to do for fun?",
        type: 'mcq',
        options: [
          { id: 'games', text: '🎮 Play games', emoji: '🎮' },
          { id: 'books', text: '📚 Read books', emoji: '📚' },
          { id: 'drawing', text: '🎨 Draw or create', emoji: '🎨' },
          { id: 'sports', text: '🏃 Play sports', emoji: '🏃' },
          { id: 'music', text: '🎵 Listen to music', emoji: '🎵' },
          { id: 'apps', text: '📱 Use apps', emoji: '📱' },
          { id: 'other', text: 'Other', emoji: '✏️' }
        ],
        allowMultiple: true
      },
      {
        id: 'social_comfort',
        text: "How do you feel about talking to new people?",
        type: 'mcq',
        options: [
          { id: 'love', text: '😊 I love it!', emoji: '😊' },
          { id: 'okay', text: '👍 It\'s okay', emoji: '👍' },
          { id: 'nervous', text: '😐 I\'m nervous', emoji: '😐' },
          { id: 'hard', text: '😰 It\'s hard', emoji: '😰' },
          { id: 'avoid', text: '🙈 I avoid it', emoji: '🙈' }
        ]
      }
    ]
  },
  section2: {
    title: "How You Learn Best",
    questions: [
      {
        id: 'learning_style',
        text: "How do you learn best?",
        type: 'mcq',
        options: [
          { id: 'visual', text: '👀 By seeing pictures', emoji: '👀' },
          { id: 'audio', text: '👂 By listening', emoji: '👂' },
          { id: 'kinesthetic', text: '✋ By doing things', emoji: '✋' },
          { id: 'writing', text: '✏️ By writing', emoji: '✏️' },
          { id: 'talking', text: '🗣️ By talking', emoji: '🗣️' }
        ]
      },
      {
        id: 'focus_duration',
        text: "How long can you focus on one activity?",
        type: 'mcq',
        options: [
          { id: '2-5', text: '⏰ 2-5 minutes', emoji: '⏰' },
          { id: '5-10', text: '⏰ 5-10 minutes', emoji: '⏰' },
          { id: '10-15', text: '⏰ 10-15 minutes', emoji: '⏰' },
          { id: '15+', text: '⏰ 15+ minutes', emoji: '⏰' },
          { id: 'depends', text: '⏰ It depends on the activity', emoji: '⏰' }
        ]
      },
      {
        id: 'comfort_environment',
        text: "What makes you feel most comfortable when learning?",
        type: 'mcq',
        options: [
          { id: 'home_alone', text: '🏠 At home, alone', emoji: '🏠' },
          { id: 'one_person', text: '👤 With one person', emoji: '👤' },
          { id: 'small_group', text: '👥 With a small group', emoji: '👥' },
          { id: 'classroom', text: '🏫 In a classroom', emoji: '🏫' },
          { id: 'outside', text: '🌳 Outside', emoji: '🌳' }
        ]
      }
    ]
  },
  section3: {
    title: "Your Communication Style",
    questions: [
      {
        id: 'communication_preference',
        text: "How do you prefer to communicate?",
        type: 'mcq',
        options: [
          { id: 'speaking', text: '🗣️ Speaking out loud', emoji: '🗣️' },
          { id: 'writing', text: '✏️ Writing or typing', emoji: '✏️' },
          { id: 'gestures', text: '👋 Using gestures', emoji: '👋' },
          { id: 'apps', text: '📱 Using apps or devices', emoji: '📱' },
          { id: 'drawing', text: '🎨 Drawing or pictures', emoji: '🎨' }
        ]
      },
      {
        id: 'fun_activities',
        text: "What do you like to do for fun?",
        type: 'text',
        micAvailable: true
      },
      {
        id: 'excitement_expression',
        text: "When you're excited about something, how do you show it?",
        type: 'mcq',
        options: [
          { id: 'smile', text: '😊 I smile a lot', emoji: '😊' },
          { id: 'talk_more', text: '💬 I talk more', emoji: '💬' },
          { id: 'move_around', text: '🏃 I move around', emoji: '🏃' },
          { id: 'clap_jump', text: '👏 I clap or jump', emoji: '👏' },
          { id: 'stay_calm', text: '😐 I stay calm', emoji: '😐' },
          { id: 'other', text: 'Other', emoji: '✏️' }
        ]
      }
    ]
  },
  section4: {
    title: "Challenges & Goals",
    questions: [
      {
        id: 'communication_challenges',
        text: "What's hardest for you when talking to people?",
        type: 'mcq',
        options: [
          { id: 'nervous', text: '😰 Feeling nervous', emoji: '😰' },
          { id: 'sounds', text: '🗣️ Making sounds clearly', emoji: '🗣️' },
          { id: 'words', text: '🧠 Finding the right words', emoji: '🧠' },
          { id: 'eye_contact', text: '👀 Looking at people', emoji: '👀' },
          { id: 'thinking_time', text: '⏰ Taking time to think', emoji: '⏰' },
          { id: 'other', text: 'Other', emoji: '✏️' }
        ],
        allowMultiple: true
      },
      {
        id: 'family_description',
        text: "Tell me about your family.",
        type: 'text',
        micAvailable: true
      },
      {
        id: 'improvement_goals',
        text: "What would you like to get better at?",
        type: 'mcq',
        options: [
          { id: 'speaking_clearly', text: '🗣️ Speaking clearly', emoji: '🗣️' },
          { id: 'conversations', text: '💬 Having conversations', emoji: '💬' },
          { id: 'confidence', text: '😊 Feeling confident', emoji: '😊' },
          { id: 'new_people', text: '👋 Talking to new people', emoji: '👋' },
          { id: 'new_words', text: '📚 Learning new words', emoji: '📚' },
          { id: 'other', text: 'Other', emoji: '✏️' }
        ],
        allowMultiple: true
      }
    ]
  },
  section5: {
    title: "Advanced Communication",
    questions: [
      {
        id: 'favorite_activity',
        text: "Can you tell me about your favorite thing to do?",
        type: 'text',
        micRecommended: true
      },
      {
        id: 'proud_moment',
        text: "Describe a time when you felt really proud of yourself.",
        type: 'text',
        micRecommended: true
      },
      {
        id: 'happy_safe',
        text: "What makes you feel happy and safe?",
        type: 'text',
        micRecommended: true
      }
    ]
  }
};

// Storage Functions
export const saveQuizResults = async (results) => {
  try {
    await AsyncStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(results));
    await AsyncStorage.setItem(QUIZ_COMPLETED_KEY, 'true');
    console.log('Quiz results saved successfully');
  } catch (error) {
    console.error('Error saving quiz results:', error);
    throw error;
  }
};

export const getQuizResults = async () => {
  try {
    const results = await AsyncStorage.getItem(QUIZ_STORAGE_KEY);
    return results ? JSON.parse(results) : null;
  } catch (error) {
    console.error('Error getting quiz results:', error);
    return null;
  }
};

export const isQuizCompleted = async () => {
  try {
    const completed = await AsyncStorage.getItem(QUIZ_COMPLETED_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('Error checking quiz completion:', error);
    return false;
  }
};

export const clearQuizResults = async () => {
  try {
    await AsyncStorage.removeItem(QUIZ_STORAGE_KEY);
    await AsyncStorage.removeItem(QUIZ_COMPLETED_KEY);
    console.log('Quiz results cleared');
    
    // Force app refresh by reloading
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  } catch (error) {
    console.error('Error clearing quiz results:', error);
  }
};

// Personalization Logic
export const generatePersonalizationProfile = (quizResults) => {
  const profile = {
    // Basic Info
    name: quizResults.name || 'Friend',
    age: parseInt(quizResults.age) || 10,
    
    // Learning Preferences
    learningStyle: quizResults.learning_style || 'visual',
    focusDuration: quizResults.focus_duration || '5-10',
    comfortEnvironment: quizResults.comfort_environment || 'home_alone',
    
    // Communication Profile
    communicationPreference: quizResults.communication_preference || 'speaking',
    socialComfort: quizResults.social_comfort || 'okay',
    challenges: Array.isArray(quizResults.communication_challenges) 
      ? quizResults.communication_challenges 
      : [quizResults.communication_challenges].filter(Boolean),
    goals: Array.isArray(quizResults.improvement_goals) 
      ? quizResults.improvement_goals 
      : [quizResults.improvement_goals].filter(Boolean),
    
    // Interests & Personality
    interests: Array.isArray(quizResults.interests) 
      ? quizResults.interests 
      : [quizResults.interests].filter(Boolean),
    excitementExpression: quizResults.excitement_expression || 'smile',
    
    // Speech Assessment (if available)
    speechPatterns: {
      hasVoiceData: false,
      clarity: 0,
      vocabulary: 'basic',
      responseTime: 'normal'
    },
    
    // Text Responses for Future AI Analysis
    textResponses: {
      fun_activities: quizResults.fun_activities || '',
      family_description: quizResults.family_description || '',
      favorite_activity: quizResults.favorite_activity || '',
      proud_moment: quizResults.proud_moment || '',
      happy_safe: quizResults.happy_safe || ''
    }
  };

  // Determine difficulty level based on age and responses
  if (profile.age <= 10) {
    profile.difficultyLevel = 'beginner';
  } else if (profile.age <= 16) {
    profile.difficultyLevel = 'intermediate';
  } else {
    profile.difficultyLevel = 'advanced';
  }

  // Adjust based on social comfort
  if (profile.socialComfort === 'love' || profile.socialComfort === 'okay') {
    profile.conversationComplexity = 'medium';
  } else {
    profile.conversationComplexity = 'simple';
  }

  return profile;
};

// Future AI Integration Placeholder
export const analyzeTextResponses = async (textResponses) => {
  // This will be implemented when OpenAI API is working
  // For now, return basic analysis
  return {
    vocabularyLevel: 'intermediate',
    grammarAccuracy: 85,
    emotionalTone: 'positive',
    communicationClarity: 'good'
  };
};
