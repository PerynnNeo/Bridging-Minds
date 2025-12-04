// Quiz Storage Utility
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUIZ_STORAGE_KEY = 'vocanova_quiz_results';
const QUIZ_COMPLETED_KEY = 'vocanova_quiz_completed';

// Quiz Questions Data
export const QUIZ_QUESTIONS = {
  section1: {
    title: "About You",
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
        id: 'gender',
        text: "What is your gender?",
        type: 'mcq',
        options: [
          { id: 'male', text: 'Male' },
          { id: 'female', text: 'Female' },
          { id: 'nonbinary', text: 'Non-binary' },
          { id: 'prefer_not', text: 'Prefer not to say' }
        ]
      },
      {
        id: 'interests',
        text: "What do you like to do for fun?",
        type: 'mcq',
        allowMultiple: true,
        options: [
          { id: 'games', text: 'Play games' },
          { id: 'books', text: 'Read books' },
          { id: 'drawing', text: 'Draw or create' },
          { id: 'sports', text: 'Play sports' },
          { id: 'music', text: 'Listen to music' },
          { id: 'apps', text: 'Use apps' },
          { id: 'other', text: 'Other' }
        ]
      },
      {
        id: 'social_comfort',
        text: "How do you feel about talking to new people?",
        type: 'mcq',
        options: [
          { id: 'love', text: 'I enjoy it' },
          { id: 'okay', text: "It's okay" },
          { id: 'nervous', text: "I feel nervous" },
          { id: 'hard', text: "It's difficult" },
          { id: 'avoid', text: 'I avoid it' }
        ]
      }
    ]
  },

  section2: {
    title: "Your Voice",
    questions: [
      {
        id: 'voice_volume',
        text: "How would you describe the loudness of your voice?",
        type: 'mcq',
        options: [
          { id: 'soft', text: 'Soft' },
          { id: 'normal', text: 'Normal' },
          { id: 'loud', text: 'Loud' }
        ]
      },
      {
        id: 'voice_pitch',
        text: "How would you describe the pitch of your voice?",
        type: 'mcq',
        options: [
          { id: 'low', text: 'Low pitch' },
          { id: 'medium', text: 'Medium pitch' },
          { id: 'high', text: 'High pitch' }
        ]
      },
      {
        id: 'voice_speed',
        text: "How fast do you usually speak?",
        type: 'mcq',
        options: [
          { id: 'slow', text: 'Slow' },
          { id: 'normal', text: 'Normal' },
          { id: 'fast', text: 'Fast' }
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
          { id: 'speaking', text: 'Speaking out loud' },
          { id: 'writing', text: 'Writing or typing' },
          { id: 'gestures', text: 'Using gestures' },
          { id: 'apps', text: 'Using apps or devices' },
          { id: 'drawing', text: 'Drawing or pictures' }
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
          { id: 'smile', text: 'I smile' },
          { id: 'talk_more', text: 'I talk more' },
          { id: 'move_around', text: 'I move around' },
          { id: 'clap_jump', text: 'I clap or jump' },
          { id: 'stay_calm', text: 'I stay calm' },
          { id: 'other', text: 'Other' }
        ]
      }
    ]
  },

  section4: {
    title: "Challenges & Goals",
    questions: [
      {
        id: 'communication_challenges',
        text: "What is hardest for you when talking to people?",
        type: 'mcq',
        allowMultiple: true,
        options: [
          { id: 'nervous', text: 'Feeling nervous' },
          { id: 'sounds', text: 'Making sounds clearly' },
          { id: 'words', text: 'Finding the right words' },
          { id: 'eye_contact', text: 'Looking at people' },
          { id: 'thinking_time', text: 'Taking time to think' },
          { id: 'other', text: 'Other' }
        ]
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
        allowMultiple: true,
        options: [
          { id: 'speaking_clearly', text: 'Speaking clearly' },
          { id: 'conversations', text: 'Having conversations' },
          { id: 'confidence', text: 'Feeling confident' },
          { id: 'new_people', text: 'Talking to new people' },
          { id: 'new_words', text: 'Learning new words' },
          { id: 'other', text: 'Other' }
        ]
      }
    ]
  },

  section5: {
    title: "Your Experiences",
    questions: [
      {
        id: 'favorite_activity',
        text: "Tell me about your favorite thing to do.",
        type: 'text',
        micRecommended: true
      },
      {
        id: 'proud_moment',
        text: "Describe a time when you felt proud.",
        type: 'text',
        micRecommended: true
      },
      {
        id: 'happy_safe',
        text: "What makes you feel happy or safe?",
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
  } catch (error) {
    console.error('Error saving quiz results:', error);
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
    name: quizResults.name || 'Friend',
    age: parseInt(quizResults.age) || 10,

    gender: quizResults.gender || 'prefer_not',

    // NEW voice profile fields
    voice: {
      volume: quizResults.voice_volume || 'normal',
      pitch: quizResults.voice_pitch || 'medium',
      speed: quizResults.voice_speed || 'normal'
    },

    // Communication Profile
    communicationPreference: quizResults.communication_preference || 'speaking',
    socialComfort: quizResults.social_comfort || 'okay',

    challenges: Array.isArray(quizResults.communication_challenges)
      ? quizResults.communication_challenges
      : [quizResults.communication_challenges].filter(Boolean),

    goals: Array.isArray(quizResults.improvement_goals)
      ? quizResults.improvement_goals
      : [quizResults.improvement_goals].filter(Boolean),

    // Interests
    interests: Array.isArray(quizResults.interests)
      ? quizResults.interests
      : [quizResults.interests].filter(Boolean),

    excitementExpression: quizResults.excitement_expression || 'smile',

    // Text Responses
    textResponses: {
      fun_activities: quizResults.fun_activities || '',
      family_description: quizResults.family_description || '',
      favorite_activity: quizResults.favorite_activity || '',
      proud_moment: quizResults.proud_moment || '',
      happy_safe: quizResults.happy_safe || ''
    }
  };

  return profile;
};

// Future AI Integration Placeholder
export const analyzeTextResponses = async (textResponses) => {
  return {
    vocabularyLevel: 'intermediate',
    grammarAccuracy: 85,
    emotionalTone: 'positive',
    communicationClarity: 'good'
  };
};
