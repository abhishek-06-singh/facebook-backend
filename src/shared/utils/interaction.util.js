const User = require('../../models/user.model');

const updateInteraction = async (userAId, userBId) => {
  if (!userAId || !userBId || userAId.toString() === userBId.toString()) {
    return;
  }

  const [userA, userB] = await Promise.all([
    User.findById(userAId),
    User.findById(userBId),
  ]);

  if (!userA || !userB) {
    return;
  }

  const now = new Date();

  if (!userA.interactionMap) {
    userA.interactionMap = new Map();
  }
  if (!userB.interactionMap) {
    userB.interactionMap = new Map();
  }

  userA.interactionMap.set(userBId.toString(), now);
  userB.interactionMap.set(userAId.toString(), now);

  await Promise.all([userA.save(), userB.save()]);
};

module.exports = {
  updateInteraction,
};
