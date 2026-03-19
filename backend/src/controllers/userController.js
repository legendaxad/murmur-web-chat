import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/secret.js";
import { userModel } from "../models/userModel.js";

import {
  createSendbirdUser,
  inviteToDefaultGroups,
} from "./sendbirdService.js";

export class AuthController {
  static login = async (req, res) => {
    try {
      const { name, nickname } = req.body;

      // 1. Save user in MongoDB
      const newUser = await userModel.create({ name, nickname });

      // 2. Create user in Sendbird
      const sendbirdUserId = newUser._id.toString();

      await createSendbirdUser(sendbirdUserId, nickname);

      // 🔥 IMPORTANT FIX
      await new Promise((resolve) => setTimeout(resolve, 800));

      await inviteToDefaultGroups(sendbirdUserId);

      // 4. Create JWT
      const token = jwt.sign({ id: newUser._id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: newUser._id,
          name: newUser.name,
          nickname: newUser.nickname,
        },
        token,
      });
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  };

  static me = async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      res.status(200).json({ data: req.user });
    } catch (error) {
      res.status(500).json({ message: "Server Error" });
    }
  };
}
