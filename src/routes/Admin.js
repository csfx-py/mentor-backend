const router = require("express").Router();

const verifyAdmin = require("../utils/verifyAdmin");

const Tag = require("../models/Tag");
const User = require("../models/User");
const Post = require("../models/Post");

router.get("/get-users", verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .populate("followingTags")
      .populate("posts", ["description"], null, { sort: { createdAt: -1 } });
    if (!users) throw new Error("No users found");

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// get all posts
router.get("/get-all-posts", verifyAdmin, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", ["name", "avatar"])
      .populate("tags", ["name"])
      .populate("comments.user", ["name", "avatar"])
      .populate("likes", ["name", "avatar"]);

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

router.delete("/delete-users", verifyAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds) throw new Error("No users to delete");

    const deletedUsers = await User.deleteMany({ _id: { $in: userIds } });
    if (!deletedUsers) throw new Error("Users could not be deleted");
    if (deletedUsers.deletedCount !== userIds.length) {
      throw new Error("Some users were not deleted");
    }

    return res.status(200).json({
      success: true,
      message: "Users deleted successfully",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

router.put("/update-tags", verifyAdmin, async (req, res) => {
  try {
    const { removeTags, newTags } = req.body;
    console.log("removeTags", removeTags);
    console.log("newTags", newTags);

    if (removeTags) {
      const remainingTags = await Tag.deleteMany({ _id: { $in: removeTags } });
      if (!remainingTags) throw new Error("Tags could not be deleted");
      if (remainingTags.deletedCount !== removeTags.length) {
        throw new Error("Some tags were not deleted");
      }
    }

    if (newTags) {
      const addedTags = await Tag.insertMany(
        newTags.map((tag) => ({ name: tag }))
      );
      if (!addedTags) throw new Error("Tags could not be added");
      if (addedTags.length !== newTags.length) {
        throw new Error("Some tags were not added");
      }
    }

    return res.status(200).json({
      success: true,
      message: "Tags updated successfully",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
