const router = require("express").Router();
const verifyUser = require("../utils/verifyUser");
const app = require("../config/firebase_config");
const {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} = require("firebase/storage");

const storage = getStorage(app);
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
});

const User = require("../models/User");
const Post = require("../models/Post");
const Tag = require("../models/Tag");

// get all tags
router.get("/tags", verifyUser, async (req, res) => {
  try {
    const tags = await Tag.find();
    if (!tags) throw Error("No tags found");

    res.status(200).json({
      success: true,
      tags,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// get all posts
router.get("/get-all-posts", verifyUser, async (req, res) => {
  try {
    const followingTags = JSON.parse(req.query.followingTags);
    if (!followingTags) throw Error("No tags found");

    const posts = await Post.find({
      $or: [
        {
          user: req.reqUser._id,
        },
        {
          tags: {
            $in: followingTags,
          },
        },
      ],
    })
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

// Create a post with multiple pdf files
router.post("/create", verifyUser, upload.array("files"), async (req, res) => {
  try {
    const { description, tags, user } = req.body;
    const files = req.files;

    // check if files has only image and pdf
    const isImageOrPdf = files.every((file) => {
      // check mime type
      const isImage = file.mimetype.startsWith("image/");
      const isPdf = file.mimetype === "application/pdf";
      return isImage || isPdf;
    });
    if (!isImageOrPdf) throw new Error("Only image and pdf files are allowed");

    const userDoc = await User.findById(user);
    if (!userDoc) throw new Error("User not found");

    // upload files to firebase storage and get the download urls
    const downloadUrls = await Promise.all(
      files.map(async (file) => {
        const t = new Date().getTime();
        const storageRef = ref(storage, `${user}/${t}-${file.originalname}`);
        await uploadBytes(storageRef, file.buffer);
        const downloadUrl = await getDownloadURL(storageRef);
        return {
          name: file.originalname,
          url: downloadUrl,
          fileName: `${user}/${t}-${file.originalname}`,
          t,
        };
      })
    );

    // create a new post in mongodb
    const post = new Post({
      description,
      tags,
      user,
      files: downloadUrls,
    });

    // save the post
    const savedPost = await post.save();
    if (!savedPost) throw new Error("Something went wrong saving the post");

    res.status(200).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

router.delete("/delete", verifyUser, async (req, res) => {
  try {
    const { postId } = req.body;

    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");

    // delete the files from firebase storage
    await Promise.all(
      post.files.map(async (file) => {
        const storageRef = ref(storage, `${file.fileName}`);
        if (storageRef) {
          await deleteObject(storageRef);
        } else {
          throw new Error("File not found");
        }
      })
    );

    // delete the post from mongodb
    const deletedPost = await Post.deleteOne({ _id: postId });
    if (!deletedPost) throw new Error("Something went wrong deleting the post");

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// route to add comment
router.post("/add-comment", verifyUser, async (req, res) => {
  try {
    const { postId, text, user, name, avatar, date } = req.body;

    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");

    const newComment = {
      text,
      user,
      date,
    };

    post.comments.unshift(newComment);

    const savedPost = await post.save();
    if (!savedPost) throw new Error("Something went wrong saving the post");

    res.status(200).json({
      success: true,
      message: "Comment added successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

router.delete("/delete-comment", verifyUser, async (req, res) => {
  try {
    const { postId, commentId } = req.body;

    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");

    post.comments = post.comments.filter(
      (comment) => comment._id.toString() !== commentId
    );

    const savedPost = await post.save();
    if (!savedPost) throw new Error("Something went wrong saving the post");

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/search", verifyUser, async (req, res) => {
  try {
    const { query } = req.query;

    const posts = await Post.find({
      $or: [
        { description: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("user", ["name", "avatar"])
      .populate("comments.user", ["name", "avatar"])
      .populate("likes.user", ["name", "avatar"]);
    if (!posts) throw new Error("Posts not found");

    res.status(200).json({
      success: true,
      posts: postsWithUser,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/get-my-posts", verifyUser, async (req, res) => {
  try {
    const user = req.reqUser._id;

    const posts = await Post.find({ user })
      .sort({ createdAt: -1 })
      .populate("user", ["name", "avatar"])
      .populate("comments.user", ["name", "avatar"])
      .populate("tags", ["name"])
      .populate("likes.user", ["name", "avatar"]);
    if (!posts) throw new Error("Posts not found");

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

router.get("/get-user-posts", verifyUser, async (req, res) => {
  try {
    const { userId } = req.query;

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user", ["name", "avatar"])
      .populate("comments.user", ["name", "avatar"])
      .populate("likes.user", ["name", "avatar"]);
    if (!posts) throw new Error("Posts not found");

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

router.get("/get-post", verifyUser, async (req, res) => {
  try {
    const { postId } = req.query;

    const post = await Post.findById(postId)
      .populate("user", ["name", "avatar"])
      .populate("tags", ["name"])
      .populate("comments.user", ["name", "avatar"])
      .populate("likes.user", ["name", "avatar"]);
    if (!post) throw new Error("Post not found");

    res.status(200).json({
      success: true,
      post,
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
