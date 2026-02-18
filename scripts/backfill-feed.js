const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDatabase = require('../src/config/database');
const { backfillUserFeed, backfillAllUsers } = require('../src/modules/feed/feed.backfill');

dotenv.config();

const run = async () => {
  const target = process.argv[2];

  if (!target) {
    console.error('Usage: node scripts/backfill-feed.js <userId|all>');
    process.exit(1);
  }

  try {
    await connectDatabase();

    if (target === 'all') {
      const result = await backfillAllUsers();
      console.log(`Backfill complete. Inserted: ${result.inserted}`);
    } else {
      const result = await backfillUserFeed(target);
      console.log(`Backfill complete for ${target}. Inserted: ${result.inserted}`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
