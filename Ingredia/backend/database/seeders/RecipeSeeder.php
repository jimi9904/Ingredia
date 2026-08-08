<?php

namespace Database\Seeders;

use App\Models\Ingredient;
use App\Models\Recipe;
use App\Models\User;
use App\Services\IngredientNormalisationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class RecipeSeeder extends Seeder
{
    public function __construct(protected IngredientNormalisationService $normaliser) {}

    public function run(): void
    {
        // 1. Seed Ingredients collection
        $this->seedIngredients();

        // 2. Fetch from TheMealDB and seed recipes
        $categories = ['Chicken', 'Beef', 'Seafood', 'Vegetarian', 'Pasta', 'Dessert'];
        $recipeCount = 0;

        foreach ($categories as $category) {
            $response = Http::get("https://www.themealdb.com/api/json/v1/1/filter.php?c={$category}");
            if (!$response->successful()) continue;

            $meals = $response->json('meals') ?? [];
            $mealsToProcess = array_slice($meals, 0, 10); // Limit to 10 per category for speed

            foreach ($mealsToProcess as $meal) {
                $detailResp = Http::get("https://www.themealdb.com/api/json/v1/1/lookup.php?i={$meal['idMeal']}");
                if (!$detailResp->successful()) continue;

                $detail = $detailResp->json('meals')[0] ?? null;
                if (!$detail) continue;

                // Parse ingredients
                $ingredients = [];
                for ($i = 1; $i <= 20; $i++) {
                    $ingName = $detail["strIngredient{$i}"] ?? '';
                    $ingMeasure = $detail["strMeasure{$i}"] ?? '';

                    if (!empty(trim($ingName))) {
                        $ingredients[] = [
                            'name'       => trim($ingName),
                            'quantity'   => trim($ingMeasure),
                            'unit'       => '', // TheMealDB usually puts unit in measure
                            'normalized' => $this->normaliser->normalize(trim($ingName)),
                        ];
                    }
                }

                // Determine tags
                $tags = [];
                if ($category === 'Vegetarian') $tags[] = 'vegetarian';
                if ($detail['strTags']) {
                    $tags = array_merge($tags, explode(',', $detail['strTags']));
                }

                // Create Recipe
                $adminUser = User::where('email', 'admin@recipe.com')->first();

                // Estimate nutrition based on category
                $nutritionBase = match($category) {
                    'Chicken'    => ['calories' => rand(280, 480), 'protein' => rand(25, 45), 'carbs' => rand(10, 35), 'fat' => rand(8, 20)],
                    'Beef'       => ['calories' => rand(350, 600), 'protein' => rand(28, 48), 'carbs' => rand(5, 30), 'fat' => rand(15, 35)],
                    'Seafood'    => ['calories' => rand(180, 380), 'protein' => rand(20, 40), 'carbs' => rand(5, 25), 'fat' => rand(5, 18)],
                    'Vegetarian' => ['calories' => rand(150, 380), 'protein' => rand(8, 20), 'carbs' => rand(30, 65), 'fat' => rand(5, 20)],
                    'Pasta'      => ['calories' => rand(320, 560), 'protein' => rand(12, 25), 'carbs' => rand(50, 80), 'fat' => rand(8, 25)],
                    'Dessert'    => ['calories' => rand(280, 550), 'protein' => rand(4, 12), 'carbs' => rand(40, 75), 'fat' => rand(10, 30)],
                    default      => ['calories' => rand(200, 500), 'protein' => rand(10, 30), 'carbs' => rand(20, 60), 'fat' => rand(8, 25)],
                };

                Recipe::create([
                    'title'        => $detail['strMeal'],
                    'slug'         => Str::slug($detail['strMeal']) . '-' . rand(100, 999),
                    'description'  => "A delicious {$detail['strArea']} {$category} dish.",
                    'ingredients'  => $ingredients,
                    'instructions' => array_filter(explode("\r\n", $detail['strInstructions'])),
                    'cuisine'      => $detail['strArea'],
                    'tags'         => array_filter($tags),
                    'cook_time'    => rand(15, 60),
                    'prep_time'    => rand(5, 30),
                    'servings'     => rand(2, 6),
                    'difficulty'   => collect(['easy', 'medium', 'hard'])->random(),
                    'image_url'    => $detail['strMealThumb'],
                    'avg_rating'   => round(rand(35, 50) / 10, 1),
                    'rating_count' => rand(10, 200),
                    'nutrition'    => $nutritionBase,
                    'source'       => 'admin',
                    'status'       => 'published',
                    'created_by'   => $adminUser ? (string) $adminUser->_id : null,
                ]);

                $recipeCount++;
            }
        }

        $this->command->info("Seeded {$recipeCount} recipes from TheMealDB.");
    }

    private function seedIngredients(): void
    {
        $ingredients = [
            // Vegetables
            ['canonical_name' => 'onion', 'aliases' => ['spring onion', 'green onion', 'shallot'], 'category' => 'vegetable'],
            ['canonical_name' => 'garlic', 'aliases' => ['garlic clove', 'garlic cloves'], 'category' => 'vegetable'],
            ['canonical_name' => 'tomato', 'aliases' => ['tomatoes', 'cherry tomatoes'], 'category' => 'vegetable'],
            ['canonical_name' => 'potato', 'aliases' => ['potatoes', 'sweet potato'], 'category' => 'vegetable'],
            ['canonical_name' => 'carrot', 'aliases' => ['carrots'], 'category' => 'vegetable'],
            ['canonical_name' => 'spinach', 'aliases' => ['baby spinach'], 'category' => 'vegetable'],
            ['canonical_name' => 'bell pepper', 'aliases' => ['capsicum', 'red bell pepper', 'green bell pepper'], 'category' => 'vegetable'],
            ['canonical_name' => 'mushroom', 'aliases' => ['mushrooms', 'button mushrooms'], 'category' => 'vegetable'],
            ['canonical_name' => 'cucumber', 'aliases' => ['cucumbers'], 'category' => 'vegetable'],
            ['canonical_name' => 'broccoli', 'aliases' => [], 'category' => 'vegetable'],

            // Proteins
            ['canonical_name' => 'chicken', 'aliases' => ['chicken breast', 'chicken thighs', 'chicken stock'], 'category' => 'protein'],
            ['canonical_name' => 'beef', 'aliases' => ['ground beef', 'minced beef', 'beef stock'], 'category' => 'protein'],
            ['canonical_name' => 'pork', 'aliases' => ['pork chops', 'ground pork'], 'category' => 'protein'],
            ['canonical_name' => 'lamb', 'aliases' => ['lamb chops', 'ground lamb'], 'category' => 'protein'],
            ['canonical_name' => 'fish', 'aliases' => ['white fish', 'salmon', 'tuna'], 'category' => 'protein'],
            ['canonical_name' => 'shrimp', 'aliases' => ['prawn', 'prawns', 'shrimps'], 'category' => 'protein'],
            ['canonical_name' => 'egg', 'aliases' => ['eggs'], 'category' => 'protein'],
            ['canonical_name' => 'tofu', 'aliases' => ['firm tofu', 'silken tofu'], 'category' => 'protein'],
            ['canonical_name' => 'paneer', 'aliases' => [], 'category' => 'protein'],

            // Dairy
            ['canonical_name' => 'milk', 'aliases' => ['whole milk', 'skim milk'], 'category' => 'dairy'],
            ['canonical_name' => 'butter', 'aliases' => ['unsalted butter', 'salted butter'], 'category' => 'dairy'],
            ['canonical_name' => 'cream', 'aliases' => ['heavy cream', 'double cream'], 'category' => 'dairy'],
            ['canonical_name' => 'cheese', 'aliases' => ['cheddar', 'mozzarella', 'parmesan', 'parmesan cheese'], 'category' => 'dairy'],
            ['canonical_name' => 'yogurt', 'aliases' => ['curd', 'greek yogurt', 'yoghurt'], 'category' => 'dairy'],

            // Grains
            ['canonical_name' => 'rice', 'aliases' => ['basmati rice', 'white rice', 'brown rice'], 'category' => 'grain'],
            ['canonical_name' => 'pasta', 'aliases' => ['penne', 'spaghetti', 'macaroni'], 'category' => 'grain'],
            ['canonical_name' => 'flour', 'aliases' => ['plain flour', 'all-purpose flour'], 'category' => 'grain'],
            ['canonical_name' => 'bread', 'aliases' => ['bread crumbs'], 'category' => 'grain'],
            ['canonical_name' => 'oats', 'aliases' => ['rolled oats'], 'category' => 'grain'],
            ['canonical_name' => 'noodles', 'aliases' => ['egg noodles', 'rice noodles'], 'category' => 'grain'],

            // Spices
            ['canonical_name' => 'salt', 'aliases' => ['sea salt', 'kosher salt'], 'category' => 'spice'],
            ['canonical_name' => 'pepper', 'aliases' => ['black pepper'], 'category' => 'spice'],
            ['canonical_name' => 'cumin', 'aliases' => ['ground cumin', 'cumin seeds'], 'category' => 'spice'],
            ['canonical_name' => 'turmeric', 'aliases' => ['ground turmeric'], 'category' => 'spice'],
            ['canonical_name' => 'chili powder', 'aliases' => ['chilli powder', 'red chili powder'], 'category' => 'spice'],
            ['canonical_name' => 'coriander', 'aliases' => ['cilantro', 'ground coriander'], 'category' => 'spice'],
            ['canonical_name' => 'garam masala', 'aliases' => [], 'category' => 'spice'],
            ['canonical_name' => 'oregano', 'aliases' => ['dried oregano'], 'category' => 'spice'],
            ['canonical_name' => 'basil', 'aliases' => ['fresh basil', 'dried basil'], 'category' => 'spice'],
            ['canonical_name' => 'thyme', 'aliases' => ['fresh thyme', 'dried thyme'], 'category' => 'spice'],

            // Condiments
            ['canonical_name' => 'olive oil', 'aliases' => ['extra virgin olive oil', 'oil'], 'category' => 'condiment'],
            ['canonical_name' => 'soy sauce', 'aliases' => ['light soy sauce', 'dark soy sauce'], 'category' => 'condiment'],
            ['canonical_name' => 'vinegar', 'aliases' => ['white vinegar', 'apple cider vinegar'], 'category' => 'condiment'],
            ['canonical_name' => 'tomato sauce', 'aliases' => ['ketchup', 'tomato puree', 'tomato paste'], 'category' => 'condiment'],
            ['canonical_name' => 'mustard', 'aliases' => ['dijon mustard', 'mustard seeds'], 'category' => 'condiment'],
            
            // Other common
            ['canonical_name' => 'water', 'aliases' => [], 'category' => 'other'],
            ['canonical_name' => 'sugar', 'aliases' => ['brown sugar', 'caster sugar'], 'category' => 'other'],
        ];

        foreach ($ingredients as $ing) {
            Ingredient::updateOrCreate(
                ['canonical_name' => $ing['canonical_name']],
                $ing
            );
        }

        $this->command->info('Seeded common ingredients.');
    }
}
