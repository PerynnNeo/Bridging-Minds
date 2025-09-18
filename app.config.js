import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  expo: {
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
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSMicrophoneUsageDescription: "We use the microphone to analyze your pronunciation."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      permissions: ["RECORD_AUDIO"]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      GOOGLE_STT_API_KEY: process.env.GOOGLE_STT_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    }
  }
});
