const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
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
TagSchema.pre("deleteOne", async function (next) {
  try {
    const tag = await this.model.findOne(this.getQuery());

    const Post = require("./Post");
    await Post.updateMany(
      {
        tags: tag._id,
      },
      {
        $pull: {
          tags: tag._id,
        },
      }
    );

    const User = require("./User");
    await User.updateMany(
      {
        followingTags: tag._id,
      },
      {
        $pull: {
          followingTags: tag._id,
        },
      }
    );

    next();
  } catch (err) {
    console.log(err);
  }
});

module.exports = mongoose.model("Tag", TagSchema);
