const router = require("express").Router();
const app = require("../config/firebase_config");
const {
  getStorage,
  ref,
  listAll,
  uploadBytes,
  getDownloadURL,
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
router.get("/tags", async (req, res) => {
  try {
    const tags = await Tag.find();
    if (!tags) throw Error("No tags found");

    const tagNames = tags.map((tag) => tag.name);
    if (!tagNames) throw Error("No tags found");

    res.status(200).json({
      success: true,
      tags: tagNames,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// get all posts
router.get("/get-all-posts", async (req, res) => {
  try {
    const { followingTags } = req.query;
    const tagIds = JSON.parse(followingTags);

    const tags = await Tag.find({
      _id: {
        $in: tagIds,
      },
    });

    const tagNames = tags.map((tag) => tag.name);

    const posts = await Post.find({ tags: { $in: tagNames } });
    if (!posts) throw new Error("No posts found");

    // add username to each post
    const postsWithUser = await Promise.all(
      posts.map(async (post) => {
        const user = await User.findById(post.user);
        if (!user) throw new Error("User not found");

        return {
          ...post._doc,
          name: user.name,
        };
      })
    );

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

// Create a post with multiple pdf files
router.post("/create", upload.array("files"), async (req, res) => {
  try {
    const { description, tags, user } = req.body;
    const files = req.files;

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

    // add the post to the user's posts
    userDoc.posts.push(savedPost._id);
    const savedUser = await userDoc.save();
    if (!savedUser)
      throw new Error("Something went wrong saving post to the user");

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

// route to add comment
router.post("/add-comment", async (req, res) => {
  try {
    const { postId, text, user, name, avatar, date } = req.body;

    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");

    const newComment = {
      text,
      user,
      name,
      avatar,
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

module.exports = router;
