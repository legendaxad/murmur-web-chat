import axios from "axios";

const APP_ID = process.env.SENDBIRD_APP_ID;
const API_TOKEN = process.env.SENDBIRD_API_TOKEN;
const CHANNEL_URL1 = process.env.CHANNEL_URL1;
const CHANNEL_URL2 = process.env.CHANNEL_URL2;

// 👉 Put your REAL channel URLs here
const DEFAULT_CHANNELS = ["", ""];
// ✅ 1. Create user in Sendbird
export const createSendbirdUser = async (userId, nickname) => {
  try {
    await axios.post(
      `https://api-${APP_ID}.sendbird.com/v3/users`,
      {
        user_id: userId,
        nickname: nickname,
        profile_url: "https://i.pravatar.cc/150?u=" + userId,
      },
      {
        headers: {
          "Api-Token": API_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Sendbird user created:", userId);
  } catch (error) {
    if (error.response?.data?.code === 400202) {
      console.log("User already exists");
    } else {
      console.error("❌ Sendbird error:", error.response?.data);
      throw error;
    }
  }
};

// ✅ 2. Invite user to default groups
export const inviteToDefaultGroups = async (userId) => {
  for (const channelUrl of DEFAULT_CHANNELS) {
    try {
      console.log("Inviting to channel:", channelUrl);

      // 1. Invite
      await axios.post(
        `https://api-${APP_ID}.sendbird.com/v3/group_channels/${channelUrl}/invite`,
        { user_ids: [userId] },
        {
          headers: {
            "Api-Token": API_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      // 🔥 2. FORCE JOIN (THIS IS THE KEY)
      await axios.put(
        `https://api-${APP_ID}.sendbird.com/v3/group_channels/${channelUrl}/join`,
        { user_ids: [userId] },
        {
          headers: {
            "Api-Token": API_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Joined channel:", channelUrl);
    } catch (error) {
      console.error(
        `❌ Channel error ${channelUrl}`,
        error.response?.data || error.message
      );
    }
  }
};
