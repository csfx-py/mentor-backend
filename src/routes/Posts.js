const router = require("express").Router();
const app = require("../config/firebase_config");
const {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} = require("firebase/storage");
const stripe = require("stripe")(process.env.STRIPE_KEY);

const storage = getStorage(app);
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
});

const User = require("../models/User");
const Post = require("../models/Post");
const Tag = require("../models/Tag");

const verifyUser = require("../utils/verifyUser");

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

    const user = await User.findById(req.reqUser._id);
    if (!user) throw Error("User not found");

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
        {
          // posts by user's following list
          user: { $in: user.following },
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

router.post("/purchase", verifyUser, async (req, res) => {
  try {
    const { postId } = req.body;

    const post = await Post.findById(postId);
    if (!post) throw Error("Post not found");

    const { title, price } = post;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: title,
            },
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:3000/success/${postId}/{CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/cancel`,
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.post("/verify-payment", verifyUser, async (req, res) => {
  try {
    const { sessionId, postId } = req.body;
    console.log(sessionId, postId);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) throw Error("Session not found");

    const { payment_status } = session;
    if (payment_status !== "paid") throw Error("Payment not successful");

    const post = await Post.findById(postId);
    if (!post) throw Error("Post not found");

    const user = req.reqUser._id;
    const added = await User.findByIdAndUpdate(user, {
      $addToSet: {
        paidForPosts: postId,
      },
    });
    if (!added) throw Error("Something went wrong adding the post to user");

    res.status(200).json({
      success: true,
      message: "Payment successful",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Create a post with multiple pdf files
router.post("/create", verifyUser, upload.array("files"), async (req, res) => {
  try {
    const { title, description, tags, user, isPaid, price } = req.body;

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
          fileName: `${user}/${t}-${file.originalname}`,
          t,
        };
      })
    );

    // create a new post in mongodb
    const post = new Post({
      title,
      description,
      tags,
      user,
      files: downloadUrls,
      isPaid,
      price,
    });

    console.log(post);

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
    const { postId, text, user } = req.body;

    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");

    const newComment = {
      text,
      user,
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

router.patch("/like-or-dislike", verifyUser, async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.reqUser._id;
    console.log(postId, userId);

    // find and update the post
    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");

    // check if the post is already liked by the user
    if (post.likes.filter((like) => like.toString() === userId).length > 0) {
      post.likes = post.likes.filter((like) => like.toString() !== userId);
    } else {
      post.likes.unshift(userId);
    }

    const savedPost = await post.save();
    if (!savedPost) throw new Error("Something went wrong saving the post");

    res.status(200).json({
      success: true,
      message: "Post liked successfully",
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

    const matchingUsers =
      (await User.find({
        name: { $regex: query, $options: "i" },
      }).select(["name"])) || [];

    const matchingTags =
      (await Tag.find({
        name: { $regex: query, $options: "i" },
      }).select(["name"])) || [];

    const posts = await Post.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { tags: { $in: matchingTags } },
        { user: { $in: matchingUsers } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("user", ["name", "avatar"])
      .populate("comments.user", ["name", "avatar"])
      .populate("likes.user", ["name", "avatar"])
      .populate("tags", ["name"]);
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

    console.log(userId);

    const user = await User.findById(userId).populate({
      path: "posts",
      populate: [
        { path: "user", select: ["name", "avatar"] },
        { path: "comments.user", select: ["name", "avatar"] },
        { path: "likes.user", select: ["name", "avatar"] },
        { path: "tags", select: ["name"] },
      ],
    });
    if (!user) throw new Error("Posts not found");

    res.status(200).json({
      success: true,
      user,
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
