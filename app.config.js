import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "vocanova-app",
  slug: "vocanova-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,

  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },

  ios: {
    supportsTablet: true,
    infoPlist: {
      NSMicrophoneUsageDescription:
        "This app needs access to your microphone to help transcribe your speech in real-time.",
    },
  },

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    permissions: ["RECORD_AUDIO"],
  },

  web: {
    favicon: "./assets/favicon.png",
  },

  extra: {
    // ONLY OpenAI needed – GoogleSTT removed
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    
    // Optional: URL of your backend (for Whisper streaming)
    BACKEND_URL: process.env.BACKEND_URL || "http://localhost:3000",
  },
});
