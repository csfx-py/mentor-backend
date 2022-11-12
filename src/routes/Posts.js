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

router.get("/get-all-files", async (req, res) => {
  try {
    // get all user ids
    const users = await User.find({}, "_id");
    const userIds = users.map((user) => user._id);

    // get all files from firebase storage id folders
    const files = await Promise.all(
      userIds.map(async (userId) => {
        const listRef = ref(storage, userId);
        const list = await listAll(listRef);
        return list.items.map((item) => {
          return {
            name: item.name,
            url: item.fullPath,
          };
        });
      })
    );

    console.log(files);

    res.status(200).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
