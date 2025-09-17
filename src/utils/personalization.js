// Personalization Utility
import { getQuizResults } from './quizStorage';

// Get user's personalization profile
export const getUserProfile = async () => {
  try {
    const profile = await getQuizResults();
    return profile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return getDefaultProfile();
  }
};

// Default profile for users who haven't completed quiz
export const getDefaultProfile = () => {
  return {
    name: 'Friend',
    age: 12,
    learningStyle: 'visual',
    focusDuration: '5-10',
    comfortEnvironment: 'home_alone',
    communicationPreference: 'speaking',
    socialComfort: 'okay',
    challenges: ['nervous'],
    goals: ['confidence'],
    interests: ['games'],
    excitementExpression: 'smile',
    difficultyLevel: 'intermediate',
    conversationComplexity: 'simple',
    speechPatterns: {
      hasVoiceData: false,
      clarity: 0,
      vocabulary: 'basic',
      responseTime: 'normal'
    },
    textResponses: {
      fun_activities: '',
      family_description: '',
      favorite_activity: '',
      proud_moment: '',
      happy_safe: ''
    }
  };
};

// Get personalized greeting based on user profile
export const getPersonalizedGreeting = (profile) => {
  const timeOfDay = new Date().getHours();
  let greeting = '';
  
  if (timeOfDay < 12) {
    greeting = 'Good morning';
  } else if (timeOfDay < 17) {
    greeting = 'Good afternoon';
  } else {
    greeting = 'Good evening';
  }
  
  return `${greeting}, ${profile.name}! Ready for some fun learning?`;
};

// Get appropriate difficulty level for words practice
export const getWordDifficulty = (profile) => {
  if (profile.age <= 8) return 'easy';
  if (profile.age <= 12) return 'medium';
  if (profile.age <= 16) return 'medium';
  return 'hard';
};

// Get appropriate session length based on focus duration
export const getSessionLength = (profile) => {
  switch (profile.focusDuration) {
    case '2-5': return 3; // 3 minutes
    case '5-10': return 7; // 7 minutes
    case '10-15': return 12; // 12 minutes
    case '15+': return 15; // 15 minutes
    default: return 7;
  }
};

// Get conversation complexity for Conversation Buddy
export const getConversationComplexity = (profile) => {
  if (profile.socialComfort === 'love' || profile.socialComfort === 'okay') {
    return 'medium';
  }
  return 'simple';
};

// Get appropriate AI response style
export const getAIResponseStyle = (profile) => {
  if (profile.age <= 10) {
    return 'encouraging_simple';
  } else if (profile.age <= 16) {
    return 'encouraging_detailed';
  }
  return 'encouraging_detailed';
};

// Get personalized tips based on challenges
export const getPersonalizedTips = (profile) => {
  const tips = [];
  
  if (profile.challenges.includes('nervous')) {
    tips.push("Take deep breaths - you're doing great!");
  }
  
  if (profile.challenges.includes('sounds')) {
    tips.push("Practice makes perfect - keep trying!");
  }
  
  if (profile.challenges.includes('words')) {
    tips.push("It's okay to take your time finding the right words.");
  }
  
  if (profile.challenges.includes('eye_contact')) {
    tips.push("You don't have to look at people if it feels uncomfortable.");
  }
  
  return tips;
};

// Get appropriate reward system based on goals
export const getRewardSystem = (profile) => {
  if (profile.goals.includes('confidence')) {
    return {
      type: 'confidence_building',
      messages: [
        "You're getting more confident every day!",
        "I'm so proud of your progress!",
        "You're doing amazing!"
      ]
    };
  }
  
  if (profile.goals.includes('speaking_clearly')) {
    return {
      type: 'pronunciation_focus',
      messages: [
        "Great pronunciation!",
        "Your speech is getting clearer!",
        "Perfect! Keep practicing!"
      ]
    };
  }
  
  return {
    type: 'general',
    messages: [
      "Great job!",
      "You're doing well!",
      "Keep it up!"
    ]
  };
};

// Get personalized conversation starters
export const getConversationStarters = (profile) => {
  const starters = [];
  
  if (profile.interests.includes('games')) {
    starters.push("Tell me about your favorite game!");
  }
  
  if (profile.interests.includes('drawing')) {
    starters.push("What do you like to draw?");
  }
  
  if (profile.interests.includes('sports')) {
    starters.push("What sports do you enjoy?");
  }
  
  if (profile.interests.includes('music')) {
    starters.push("What kind of music do you like?");
  }
  
  if (profile.interests.includes('books')) {
    starters.push("What's your favorite book?");
  }
  
  // Fallback starters
  if (starters.length === 0) {
    starters.push("What did you do today?");
    starters.push("What makes you happy?");
  }
  
  return starters;
};

// Get appropriate visual support level
export const getVisualSupportLevel = (profile) => {
  if (profile.learningStyle === 'visual') {
    return 'high';
  } else if (profile.learningStyle === 'kinesthetic') {
    return 'medium';
  }
  return 'low';
};

// Get personalized encouragement messages
export const getEncouragementMessages = (profile) => {
  const messages = [];
  
  if (profile.excitementExpression === 'smile') {
    messages.push("I can see you're happy! 😊");
  }
  
  if (profile.excitementExpression === 'talk_more') {
    messages.push("I love hearing you talk more!");
  }
  
  if (profile.excitementExpression === 'move_around') {
    messages.push("I can see you're excited!");
  }
  
  if (profile.excitementExpression === 'clap_jump') {
    messages.push("Your excitement is contagious! 🎉");
  }
  
  // General encouragement
  messages.push("You're doing great!");
  messages.push("I'm proud of you!");
  messages.push("Keep up the good work!");
  
  return messages;
};

// Get appropriate feedback frequency
export const getFeedbackFrequency = (profile) => {
  if (profile.focusDuration === '2-5') {
    return 'frequent'; // More frequent feedback for shorter attention span
  } else if (profile.focusDuration === '15+') {
    return 'detailed'; // More detailed feedback for longer attention span
  }
  return 'moderate';
};

// Get personalized difficulty progression
export const getDifficultyProgression = (profile) => {
  const baseDifficulty = profile.difficultyLevel;
  
  return {
    start: baseDifficulty,
    progression: profile.socialComfort === 'love' ? 'fast' : 'gradual',
    maxDifficulty: profile.age >= 16 ? 'advanced' : 'intermediate'
  };
};

