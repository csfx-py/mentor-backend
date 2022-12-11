const router = require("express").Router();
const jwt = require("jsonwebtoken");
const app = require("../config/firebase_config");
const {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} = require("firebase/storage");

const storage = getStorage(app);
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
});

const User = require("../models/User");
const verifyUser = require("../utils/verifyUser");
const getUserReturnInfo = require("../utils/getUserReturnInfo");

router.get("/user", verifyUser, async (req, res) => {
  try {
    const user = await User.findById(req.reqUser._id).populate("followingTags");
    if (!user) throw Error("User does not exist");

    res.status(200).json({
      success: true,
      user: getUserReturnInfo(user._doc),
      message: "User fetch successfully",
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

router.post(
  "/avatar",
  verifyUser,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) throw Error("No file found");
      const extension = file.originalname.split(".").pop();

      const storageRef = ref(
        storage,
        `avatars/${req.reqUser._id}.${extension}`
      );

      const uploadTask = uploadBytes(storageRef, file.buffer);

      const snapshot = await uploadTask;
      const downloadURL = await getDownloadURL(snapshot.ref);
      if (!downloadURL) throw Error("Failed to get download URL");

      // update user avatar
      const user = await User.findOneAndUpdate(
        { _id: req.reqUser._id },
        { avatar: downloadURL },
        { new: true }
      ).populate("followingTags");
      if (!user) throw Error("User does not exist");

      res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        user: getUserReturnInfo(user._doc),
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }
);

router.put("/user", verifyUser, async (req, res) => {
  try {
    const { name, email, followingTags } = req.body.details;

    const user = await User.findOneAndUpdate(
      { _id: req.reqUser._id },
      { name, email, followingTags },
      { new: true }
    ).populate("followingTags");
    if (!user) throw Error("User does not exist");

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: getUserReturnInfo(user._doc),
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
