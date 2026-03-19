import { App, SendBirdProvider } from "@sendbird/uikit-react";
import "@sendbird/uikit-react/dist/index.css";

type User = {
  id: string;
  name: string;
  token: string;
  nickname: string;
};

const APP_ID = process.env.REACT_APP_SENDBIRD_APP_ID;
const CHANNEL_URL1 = process.env.REACT_APP_CHANNEL_URL1_ID;
const CHANNEL_URL2 = process.env.REACT_APP_CHANNEL_URL2_ID;

console.log("APP_ID:", APP_ID);
if (!APP_ID) {
  throw new Error("❌ REACT_APP_SENDBIRD_APP_ID is missing in .env");
}
const TelegramStyleApp = ({ user }: { user: User }) => {
  // Telegram-style theme
  const telegramColors = {
    "--sendbird-light-primary-500": "#0088cc", // main blue
    "--sendbird-light-primary-400": "#00aaff",
    "--sendbird-light-primary-300": "#66cfff",
    "--sendbird-light-primary-200": "#b3e5ff",
    "--sendbird-light-primary-100": "#e6f7ff",
    "--sendbird-light-background": "#f4f6f8", // app background
    "--sendbird-light-on-background-01": "#111", // text color
    "--sendbird-light-on-background-02": "#555",
    "--sendbird-light-on-background-03": "#888",
    "--sendbird-light-border": "#eee",
    "--sendbird-light-chat-background": "#ffffff", // chat panel bg
    "--sendbird-light-chat-bubble-background-01": "#dcf8c6", // sent msg bubble (Telegram green)
    "--sendbird-light-chat-bubble-background-02": "#fff", // received msg bubble
  };

  // UIKit options: enable voice messages & apply colors
  const uikitOptions = {
    groupChannel: {
      enableVoiceMessage: true,
      enableReaction: true,
      enableFileMessage: true,
    },
    colors: telegramColors,
    dateLocale: "en-US",
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <App
        appId={APP_ID}
        userId={user.id}
        nickname={user.nickname}
        accessToken={user.token}
        uikitOptions={uikitOptions}
        allowProfileEdit={false}
        disableUserProfile={false}
      />
    </div>
  );
};

export default TelegramStyleApp;
