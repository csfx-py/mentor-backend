module.exports = (userDoc) => {
  return {
    _id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    followingTags: userDoc.followingTags,
    posts: userDoc.posts,
    avatar: userDoc.avatar,
    role: userDoc.role,
    paidForPosts: userDoc.paidForPosts,
    following: userDoc.following,
  };
};
