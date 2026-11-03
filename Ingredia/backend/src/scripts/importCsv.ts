import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Recipe } from '../models/Recipe.js';
import { Ingredient } from '../models/Ingredient.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recipe_platform';

// Path to the primary Cleaned Indian Food Dataset CSV
const CANDIDATE_PATHS = [
  path.resolve(process.cwd(), '../data/Cleaned_Indian_Food_Dataset.csv'),
  path.resolve(process.cwd(), 'data/Cleaned_Indian_Food_Dataset.csv'),
  'D:/Coding/Ingredia/Ingredia/data/Cleaned_Indian_Food_Dataset.csv',
];

function findCsvPath(): string {
  for (const p of CANDIDATE_PATHS) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error(`Could not find CSV dataset in candidate paths: ${CANDIDATE_PATHS.join(', ')}`);
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur.trim());
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') {
        i++;
      }
      row.push(cur.trim());
      cur = '';
      if (row.length > 1 || row[0] !== '') {
        rows.push(row);
      }
      row = [];
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    rows.push(row);
  }
  return rows;
}

function parseInstructions(str: string): string[] {
  if (!str) return [];
  const lines = str.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines;
  }
  const sentences = str.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
  const steps = sentences.map((s) => s.trim()).filter((s) => s.length > 3);
  return steps.length ? steps : [str.trim()];
}

function parseIngredients(str: string): string[] {
  if (!str) return [];
  // Split on comma, but keep each ingredient clean
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function classifyDiet(title: string, tags: string[], ings: string[]): string {
  const tLower = title.toLowerCase();
  const allText = `${tLower} ${tags.join(' ')} ${ings.join(' ')}`.toLowerCase();

  const nonVegWords = ['chicken', 'mutton', 'lamb', 'beef', 'pork', 'fish', 'prawn', 'shrimp', 'crab', 'meat', 'egg'];
  if (nonVegWords.some((w) => allText.includes(w))) {
    if (allText.includes('egg') && !['chicken', 'mutton', 'lamb', 'beef', 'pork', 'fish', 'prawn'].some((w) => allText.includes(w))) {
      return 'egg';
    }
    return 'nonveg';
  }
  return 'veg';
}

function difficultyFromTime(minutes: number): 'easy' | 'medium' | 'hard' {
  if (minutes <= 30) return 'easy';
  if (minutes <= 60) return 'medium';
  return 'hard';
}

async function main() {
  const startTime = Date.now();
  console.log(' Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log(' Connected to MongoDB successfully.');

  const csvPath = findCsvPath();
  console.log(' Reading CSV dataset from:', csvPath);
  const rawData = fs.readFileSync(csvPath, 'utf8');

  console.log(' Parsing CSV records...');
  const rows = parseCSV(rawData);
  if (rows.length < 2) {
    console.error(' CSV is empty or missing headers.');
    process.exit(1);
  }

  const header = rows[0].map((h) => h.trim());
  console.log(' Headers found:', header);

  const titleIdx = header.indexOf('TranslatedRecipeName') !== -1 ? header.indexOf('TranslatedRecipeName') : header.indexOf('RecipeName');
  const ingsIdx = header.indexOf('TranslatedIngredients') !== -1 ? header.indexOf('TranslatedIngredients') : header.indexOf('Ingredients');
  const instIdx = header.indexOf('TranslatedInstructions') !== -1 ? header.indexOf('TranslatedInstructions') : header.indexOf('Instructions');
  const cuisineIdx = header.indexOf('Cuisine');
  const timeIdx = header.indexOf('TotalTimeInMins');
  const imgIdx = header.indexOf('image-url');
  const cleanedIngsIdx = header.indexOf('Cleaned-Ingredients');
  const urlIdx = header.indexOf('URL');

  if (titleIdx === -1 || ingsIdx === -1) {
    console.error(' Required columns (TranslatedRecipeName/RecipeName or Ingredients) missing from CSV.');
    process.exit(1);
  }

  console.log(` Processing ${rows.length - 1} recipes...`);

  // Index existing recipes by lowercase title
  const existingDocs = await Recipe.find(
    { source: 'archanas_kitchen_indian' },
    { _id: 1, title: 1, slug: 1, image_url: 1, has_real_image: 1 }
  );

  const existingMap = new Map<string, any>();
  for (const doc of existingDocs) {
    existingMap.set(doc.title.toLowerCase().trim(), doc);
  }

  console.log(` Loaded ${existingMap.size} existing Indian recipes from database.`);

  let updatedCount = 0;
  let insertedCount = 0;
  const uniqueIngredients = new Set<string>();

  const bulkOps: any[] = [];
  const BATCH_SIZE = 500;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const title = (row[titleIdx] || '').trim();
    if (!title) continue;

    const rawIngredients = row[ingsIdx] || '';
    const ingredients = parseIngredients(rawIngredients);
    if (!ingredients.length) continue;

    const rawInstructions = instIdx !== -1 ? row[instIdx] || '' : '';
    const instructions = parseInstructions(rawInstructions);

    const totalTime = timeIdx !== -1 ? parseInt(row[timeIdx], 10) || 30 : 30;
    const cookTime = totalTime;
    const prepTime = Math.max(5, Math.round(totalTime * 0.3));
    const difficulty = difficultyFromTime(totalTime);

    const rawCuisine = cuisineIdx !== -1 ? (row[cuisineIdx] || 'indian') : 'indian';
    const cuisine = rawCuisine.toLowerCase().replace(/ recipes$/i, '').trim();

    const diet = classifyDiet(title, [cuisine], ingredients);
    const tags = Array.from(new Set([cuisine, 'indian', diet, difficulty])).filter(Boolean);

    const csvImageUrl = (imgIdx !== -1 ? row[imgIdx] || '' : '').trim();
    const sourceUrl = (urlIdx !== -1 ? row[urlIdx] || '' : '').trim();

    // Collect cleaned ingredients for the Ingredient collection
    if (cleanedIngsIdx !== -1 && row[cleanedIngsIdx]) {
      const parts = row[cleanedIngsIdx].split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
      for (const p of parts) {
        uniqueIngredients.add(p);
      }
    } else {
      for (const ing of ingredients) {
        const cleanName = ing.replace(/^[\d\s\/\.\-–]+(tablespoons?|tbsp|teaspoons?|tsp|cups?|gms?|grams?|kg|ml|oz|cloves?|leaves?|pinch)?\s+/i, '').replace(/\([^)]*\)/g, '').split('-')[0].trim().toLowerCase();
        if (cleanName && cleanName.length > 2) {
          uniqueIngredients.add(cleanName);
        }
      }
    }

    const titleKey = title.toLowerCase().trim();
    const existing = existingMap.get(titleKey);

    if (existing) {
      // Keep existing working images.archanaskitchen.com CDN image if available
      let imageUrl = existing.image_url;
      if (!imageUrl || imageUrl === '') {
        imageUrl = csvImageUrl;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: existing._id },
          update: {
            $set: {
              ingredients,
              instructions: instructions.length ? instructions : undefined,
              cook_time: cookTime,
              prep_time: prepTime,
              difficulty,
              cuisine,
              tags,
              image_url: imageUrl,
              has_real_image: Boolean(imageUrl && imageUrl.startsWith('http')),
              updated_at: new Date(),
            },
          },
        },
      });
      updatedCount++;
    } else {
      const slug = `${slugify(title)}-${crypto.randomBytes(4).toString('hex')}`;
      bulkOps.push({
        insertOne: {
          document: {
            title,
            slug,
            description: `A delicious ${cuisine} recipe.`,
            ingredients,
            instructions,
            cuisine,
            tags,
            nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            cook_time: cookTime,
            prep_time: prepTime,
            servings: 4,
            difficulty,
            image_url: csvImageUrl,
            has_real_image: Boolean(csvImageUrl && csvImageUrl.startsWith('http')),
            avg_rating: 0,
            rating_count: 0,
            status: 'published',
            source: 'archanas_kitchen_indian',
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
      });
      insertedCount++;
    }

    if (bulkOps.length >= BATCH_SIZE) {
      await Recipe.bulkWrite(bulkOps);
      bulkOps.length = 0;
      process.stdout.write(` Updated/Inserted ${updatedCount + insertedCount} recipes...\r`);
    }
  }

  if (bulkOps.length > 0) {
    await Recipe.bulkWrite(bulkOps);
    bulkOps.length = 0;
  }

  console.log(`\n Recipe processing complete: ${updatedCount} updated, ${insertedCount} inserted.`);

  // Upsert canonical ingredients into the Ingredient collection
  console.log(` Ingesting ${uniqueIngredients.size} unique ingredients for autocomplete...`);
  const ingredientOps: any[] = [];
  const now = new Date();
  for (const name of uniqueIngredients) {
    ingredientOps.push({
      updateOne: {
        filter: { canonical_name: name },
        update: {
          $setOnInsert: {
            canonical_name: name,
            aliases: [name],
            category: 'Pantry',
            created_at: now,
            updated_at: now,
          },
        },
        upsert: true,
      },
    });

    if (ingredientOps.length >= BATCH_SIZE) {
      await mongoose.connection.collection('ingredients').bulkWrite(ingredientOps);
      ingredientOps.length = 0;
    }
  }

  if (ingredientOps.length > 0) {
    await mongoose.connection.collection('ingredients').bulkWrite(ingredientOps);
  }

  const totalIngredientsInDb = await Ingredient.countDocuments();
  const totalRecipesInDb = await Recipe.countDocuments();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(' Import and synchronization completed successfully!');
  console.log(` Total Recipes in Database: ${totalRecipesInDb}`);
  console.log(` Total Ingredients in Autocomplete Collection: ${totalIngredientsInDb}`);
  console.log(` Completed in ${elapsed}s.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error running import:', err);
  process.exit(1);
});
