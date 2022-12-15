const mongoose = require("mongoose");
const Post = require("./Post");
const User = require("./User");

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// pre delete middleware
TagSchema.pre("deleteMany", async function (next) {
  try {
    const ids = this.getQuery()["_id"]["$in"];
    console.log(ids);

    // remove tag from posts
    const posts = await Post.updateMany(
      { tags: { $in: ids } },
      { $pull: { tags: { $in: ids } } }
    );

    // remove tag from users
    const users = await User.updateMany(
      { followingTags: { $in: ids } },
      { $pull: { followingTags: { $in: ids } } }
    );

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Tag", TagSchema);
