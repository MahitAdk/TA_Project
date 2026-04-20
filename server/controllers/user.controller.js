import { getUserById } from "../services/user.service.js";

export const getHomeData = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};
