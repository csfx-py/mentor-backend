const mongoose = require("mongoose");

// Post Schema
const PostSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  tags: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tag",
    },
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  files: [
    {
      url: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      fileName: {
        type: String,
        required: true,
      },
    },
  ],
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      text: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// pre delete middleware remove refs from User
PostSchema.pre("deleteOne", async function (next) {
  const post = await this.model.findOne(this.getQuery());
  const User = require("./User");
  await User.updateOne({ _id: post.user }, { $pull: { posts: post._id } });
  next();
});

// pre save middleware save new refs to User
PostSchema.pre("save", async function (next) {
  const User = require("./User");
  await User.updateOne({ _id: this.user }, { $addToSet: { posts: this._id } });
  next();
});

// post update middleware if post has no tags then delete document
PostSchema.post("updateMany", async function (next) {
  const post = await this.model.findOne(this.getQuery());

  if (post.tags.length === 0) {
    await this.model.deleteOne({ _id: post._id });
  }
});

module.exports = mongoose.model("Post", PostSchema);
