import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LOCAL_URI: string = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/recipe_platform';
const ATLAS_URI: string = process.env.ATLAS_URI || process.env.MONGODB_URI || '';

if (!ATLAS_URI) {
  console.error('Please define ATLAS_URI or MONGODB_URI in your environment or .env file.');
  process.exit(1);
}

const COLLECTIONS_TO_MIGRATE = [
  'recipes',
  'ingredients',
  'users',
  'reviews',
  'saved_collections',
  'pantries',
  'search_logs',
];

async function migrate() {
  const startTime = Date.now();
  console.log(' Connecting to Local MongoDB:', LOCAL_URI);
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log(' Connected to Local MongoDB.');

  console.log(' Connecting to MongoDB Atlas:', ATLAS_URI.replace(/:\w+@/, ':****@'));
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log(' Connected to MongoDB Atlas successfully.');

  const localDb = localConn.db;
  const atlasDb = atlasConn.db;

  if (!localDb || !atlasDb) {
    throw new Error('Database instance is undefined on one of the connections.');
  }

  for (const collName of COLLECTIONS_TO_MIGRATE) {
    console.log(`\n Migrating collection: ${collName}...`);
    const localColl = localDb.collection(collName);
    const atlasColl = atlasDb.collection(collName);

    const count = await localColl.countDocuments();
    console.log(` Found ${count} documents in local ${collName}.`);
    if (count === 0) continue;

    // Fetch and clone indexes (except default _id_)
    try {
      const indexes = await localColl.indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue;
        const key = idx.key;
        delete (idx as any).ns;
        delete (idx as any).v;
        console.log(`   Ensuring index on ${collName}: ${idx.name}`);
        await atlasColl.createIndex(key, idx).catch(() => {});
      }
    } catch (e: any) {
      console.log(`   Index warning: ${e.message}`);
    }

    // Stream and batch insert into Atlas
    const cursor = localColl.find();
    let batch: any[] = [];
    let inserted = 0;
    const BATCH_SIZE = 500;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;
      batch.push({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      });

      if (batch.length >= BATCH_SIZE) {
        await atlasColl.bulkWrite(batch);
        inserted += batch.length;
        process.stdout.write(`   Synced ${inserted}/${count} documents...\r`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await atlasColl.bulkWrite(batch);
      inserted += batch.length;
    }

    const atlasCount = await atlasColl.countDocuments();
    console.log(`\n Done migrating ${collName}: ${atlasCount} documents in Atlas.`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n Full Atlas migration completed in ${elapsed}s!`);

  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

