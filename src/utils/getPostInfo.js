const User = require("../models/User");

module.exports = async (posts) => {
  const userIdNameAvatar = {};
  // add username to each post
  const postsWithUser = await Promise.all(
    posts.map(async (post) => {
      // comments find username and avatar
      const commentsWithUser = await Promise.all(
        post.comments.map(async (comment) => {
          if (userIdNameAvatar[comment.user]) {
            return {
              ...comment._doc,
              name: userIdNameAvatar[comment.user].name,
              avatar: userIdNameAvatar[comment.user].avatar,
            };
          } else {
            const user = await User.findById(comment.user);
            if (!user) throw new Error("User not found");

            userIdNameAvatar[comment.user] = {
              name: user.name,
              avatar: user.avatar,
            };
          }
          return {
            ...comment._doc,
            name: userIdNameAvatar[comment.user].name,
            avatar: userIdNameAvatar[comment.user].avatar,
          };
        })
      );

      if (userIdNameAvatar[post.user]) {
        return {
          ...post._doc,
          name: userIdNameAvatar[post.user].name,
          avatar: userIdNameAvatar[post.user].avatar,
          comments: commentsWithUser,
        };
      }

      const user = await User.findById(post.user);
      if (!user) throw new Error("No user found");

      userIdNameAvatar[post.user] = {
        name: user.name,
        avatar: user.avatar,
      };

      return {
        ...post._doc,
        name: user.name,
        avatar: user.avatar,
      };
    })
  );

  return postsWithUser;
};
