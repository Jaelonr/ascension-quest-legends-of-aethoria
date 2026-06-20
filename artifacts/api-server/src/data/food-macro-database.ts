export type FoodMacroSource = "guild_compendium" | "open_food_facts";

export interface FoodMacroItem {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  source: FoodMacroSource;
  calories100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g?: number;
  sugar100g?: number;
  sodiumMg100g?: number;
  servingSize: string | null;
  servingGrams: number | null;
}

export const FOOD_MACRO_DATABASE: FoodMacroItem[] = [
  { id: "guild_chicken_breast", name: "Chicken breast, cooked", aliases: ["grilled chicken", "chicken", "lean chicken"], category: "Protein", source: "guild_compendium", calories100g: 165, protein100g: 31, carbs100g: 0, fat100g: 3.6, sodiumMg100g: 74, servingSize: "1 medium breast", servingGrams: 172 },
  { id: "guild_chicken_thigh", name: "Chicken thigh, cooked", aliases: ["dark meat chicken"], category: "Protein", source: "guild_compendium", calories100g: 209, protein100g: 26, carbs100g: 0, fat100g: 10.9, sodiumMg100g: 84, servingSize: "1 thigh", servingGrams: 116 },
  { id: "guild_ground_beef_90", name: "Ground beef, 90% lean, cooked", aliases: ["lean beef", "hamburger meat"], category: "Protein", source: "guild_compendium", calories100g: 217, protein100g: 26, carbs100g: 0, fat100g: 12, servingSize: "3 oz cooked", servingGrams: 85 },
  { id: "guild_salmon", name: "Salmon, cooked", aliases: ["fish", "atlantic salmon"], category: "Protein", source: "guild_compendium", calories100g: 206, protein100g: 22, carbs100g: 0, fat100g: 12.4, servingSize: "1 fillet", servingGrams: 154 },
  { id: "guild_tuna", name: "Tuna, canned in water", aliases: ["canned tuna"], category: "Protein", source: "guild_compendium", calories100g: 116, protein100g: 26, carbs100g: 0, fat100g: 0.8, servingSize: "1 can drained", servingGrams: 113 },
  { id: "guild_eggs", name: "Eggs, whole", aliases: ["egg", "whole egg"], category: "Protein", source: "guild_compendium", calories100g: 143, protein100g: 12.6, carbs100g: 0.7, fat100g: 9.5, servingSize: "1 large egg", servingGrams: 50 },
  { id: "guild_egg_whites", name: "Egg whites", aliases: ["liquid egg whites"], category: "Protein", source: "guild_compendium", calories100g: 52, protein100g: 10.9, carbs100g: 0.7, fat100g: 0.2, servingSize: "3 whites", servingGrams: 100 },
  { id: "guild_greek_yogurt", name: "Greek yogurt, nonfat plain", aliases: ["plain greek yogurt", "yogurt"], category: "Dairy", source: "guild_compendium", calories100g: 59, protein100g: 10.3, carbs100g: 3.6, fat100g: 0.4, sugar100g: 3.2, servingSize: "1 cup", servingGrams: 227 },
  { id: "guild_cottage_cheese", name: "Cottage cheese, low fat", aliases: ["cottage cheese"], category: "Dairy", source: "guild_compendium", calories100g: 82, protein100g: 11, carbs100g: 3.4, fat100g: 2.3, sodiumMg100g: 321, servingSize: "1/2 cup", servingGrams: 113 },
  { id: "guild_whey", name: "Whey protein powder", aliases: ["protein shake", "protein powder"], category: "Supplement", source: "guild_compendium", calories100g: 400, protein100g: 80, carbs100g: 8, fat100g: 6, servingSize: "1 scoop", servingGrams: 30 },
  { id: "guild_tofu", name: "Tofu, firm", aliases: ["bean curd"], category: "Plant Protein", source: "guild_compendium", calories100g: 144, protein100g: 15.7, carbs100g: 3.9, fat100g: 8.7, servingSize: "1/2 block", servingGrams: 126 },
  { id: "guild_black_beans", name: "Black beans, cooked", aliases: ["beans"], category: "Plant Protein", source: "guild_compendium", calories100g: 132, protein100g: 8.9, carbs100g: 23.7, fat100g: 0.5, fiber100g: 8.7, servingSize: "1/2 cup", servingGrams: 86 },
  { id: "guild_lentils", name: "Lentils, cooked", aliases: ["dal"], category: "Plant Protein", source: "guild_compendium", calories100g: 116, protein100g: 9, carbs100g: 20, fat100g: 0.4, fiber100g: 7.9, servingSize: "1/2 cup", servingGrams: 99 },
  { id: "guild_white_rice", name: "White rice, cooked", aliases: ["rice", "steamed rice"], category: "Carb", source: "guild_compendium", calories100g: 130, protein100g: 2.7, carbs100g: 28, fat100g: 0.3, servingSize: "1 cup cooked", servingGrams: 158 },
  { id: "guild_brown_rice", name: "Brown rice, cooked", aliases: ["rice"], category: "Carb", source: "guild_compendium", calories100g: 123, protein100g: 2.7, carbs100g: 25.6, fat100g: 1, fiber100g: 1.8, servingSize: "1 cup cooked", servingGrams: 195 },
  { id: "guild_oatmeal", name: "Oatmeal, cooked", aliases: ["oats", "porridge"], category: "Carb", source: "guild_compendium", calories100g: 71, protein100g: 2.5, carbs100g: 12, fat100g: 1.5, fiber100g: 1.7, servingSize: "1 cup cooked", servingGrams: 234 },
  { id: "guild_pasta", name: "Pasta, cooked", aliases: ["spaghetti", "noodles"], category: "Carb", source: "guild_compendium", calories100g: 158, protein100g: 5.8, carbs100g: 30.9, fat100g: 0.9, servingSize: "1 cup cooked", servingGrams: 140 },
  { id: "guild_potato", name: "Potato, baked", aliases: ["baked potato"], category: "Carb", source: "guild_compendium", calories100g: 93, protein100g: 2.5, carbs100g: 21.2, fat100g: 0.1, fiber100g: 2.2, servingSize: "1 medium", servingGrams: 173 },
  { id: "guild_sweet_potato", name: "Sweet potato, baked", aliases: ["yam"], category: "Carb", source: "guild_compendium", calories100g: 90, protein100g: 2, carbs100g: 20.7, fat100g: 0.2, fiber100g: 3.3, servingSize: "1 medium", servingGrams: 130 },
  { id: "guild_whole_wheat_bread", name: "Whole wheat bread", aliases: ["bread", "toast"], category: "Carb", source: "guild_compendium", calories100g: 247, protein100g: 13, carbs100g: 41, fat100g: 4.2, fiber100g: 7, servingSize: "1 slice", servingGrams: 38 },
  { id: "guild_tortilla", name: "Flour tortilla", aliases: ["wrap"], category: "Carb", source: "guild_compendium", calories100g: 312, protein100g: 8.2, carbs100g: 52, fat100g: 7.9, servingSize: "1 medium tortilla", servingGrams: 49 },
  { id: "guild_banana", name: "Banana", aliases: ["fruit"], category: "Fruit", source: "guild_compendium", calories100g: 89, protein100g: 1.1, carbs100g: 22.8, fat100g: 0.3, fiber100g: 2.6, sugar100g: 12.2, servingSize: "1 medium", servingGrams: 118 },
  { id: "guild_apple", name: "Apple", aliases: ["fruit"], category: "Fruit", source: "guild_compendium", calories100g: 52, protein100g: 0.3, carbs100g: 13.8, fat100g: 0.2, fiber100g: 2.4, sugar100g: 10.4, servingSize: "1 medium", servingGrams: 182 },
  { id: "guild_blueberries", name: "Blueberries", aliases: ["berries"], category: "Fruit", source: "guild_compendium", calories100g: 57, protein100g: 0.7, carbs100g: 14.5, fat100g: 0.3, fiber100g: 2.4, sugar100g: 10, servingSize: "1 cup", servingGrams: 148 },
  { id: "guild_broccoli", name: "Broccoli, cooked", aliases: ["vegetable"], category: "Vegetable", source: "guild_compendium", calories100g: 35, protein100g: 2.4, carbs100g: 7.2, fat100g: 0.4, fiber100g: 3.3, servingSize: "1 cup chopped", servingGrams: 156 },
  { id: "guild_spinach", name: "Spinach, raw", aliases: ["greens"], category: "Vegetable", source: "guild_compendium", calories100g: 23, protein100g: 2.9, carbs100g: 3.6, fat100g: 0.4, fiber100g: 2.2, servingSize: "2 cups", servingGrams: 60 },
  { id: "guild_avocado", name: "Avocado", aliases: ["healthy fat"], category: "Fat", source: "guild_compendium", calories100g: 160, protein100g: 2, carbs100g: 8.5, fat100g: 14.7, fiber100g: 6.7, servingSize: "1/2 avocado", servingGrams: 100 },
  { id: "guild_peanut_butter", name: "Peanut butter", aliases: ["pb"], category: "Fat", source: "guild_compendium", calories100g: 588, protein100g: 25, carbs100g: 20, fat100g: 50, fiber100g: 6, servingSize: "2 tbsp", servingGrams: 32 },
  { id: "guild_olive_oil", name: "Olive oil", aliases: ["oil"], category: "Fat", source: "guild_compendium", calories100g: 884, protein100g: 0, carbs100g: 0, fat100g: 100, servingSize: "1 tbsp", servingGrams: 14 },
  { id: "guild_almonds", name: "Almonds", aliases: ["nuts"], category: "Fat", source: "guild_compendium", calories100g: 579, protein100g: 21, carbs100g: 21.6, fat100g: 49.9, fiber100g: 12.5, servingSize: "1 oz", servingGrams: 28 },
  { id: "guild_chicken_rice_bowl", name: "Chicken and rice bowl", aliases: ["chicken rice", "meal prep chicken rice"], category: "Meal", source: "guild_compendium", calories100g: 156, protein100g: 14.5, carbs100g: 18, fat100g: 3.2, servingSize: "1 bowl", servingGrams: 450 },
  { id: "guild_steak_burrito", name: "Steak burrito", aliases: ["burrito", "beef burrito"], category: "Meal", source: "guild_compendium", calories100g: 205, protein100g: 10.5, carbs100g: 24, fat100g: 7.4, fiber100g: 3.2, servingSize: "1 burrito", servingGrams: 380 },
  { id: "guild_turkey_sandwich", name: "Turkey sandwich", aliases: ["sandwich", "turkey sub"], category: "Meal", source: "guild_compendium", calories100g: 188, protein100g: 13, carbs100g: 23, fat100g: 4.5, servingSize: "1 sandwich", servingGrams: 220 },
  { id: "guild_cheeseburger", name: "Cheeseburger", aliases: ["burger"], category: "Meal", source: "guild_compendium", calories100g: 263, protein100g: 14, carbs100g: 23, fat100g: 13, servingSize: "1 burger", servingGrams: 180 },
  { id: "guild_pepperoni_pizza", name: "Pepperoni pizza", aliases: ["pizza"], category: "Meal", source: "guild_compendium", calories100g: 298, protein100g: 12, carbs100g: 33, fat100g: 13, servingSize: "1 slice", servingGrams: 107 },
  { id: "guild_chicken_caesar", name: "Chicken Caesar salad", aliases: ["caesar salad", "salad"], category: "Meal", source: "guild_compendium", calories100g: 165, protein100g: 12, carbs100g: 6, fat100g: 10, servingSize: "1 salad", servingGrams: 350 },
  { id: "guild_chili", name: "Beef chili with beans", aliases: ["chili"], category: "Meal", source: "guild_compendium", calories100g: 118, protein100g: 8.5, carbs100g: 12, fat100g: 4.2, fiber100g: 3.4, servingSize: "1 bowl", servingGrams: 300 },
  { id: "guild_spaghetti_meat_sauce", name: "Spaghetti with meat sauce", aliases: ["spaghetti", "pasta dinner"], category: "Meal", source: "guild_compendium", calories100g: 157, protein100g: 7.2, carbs100g: 22, fat100g: 4.4, servingSize: "1 plate", servingGrams: 400 },
  { id: "guild_tacos", name: "Beef tacos", aliases: ["taco", "tacos"], category: "Meal", source: "guild_compendium", calories100g: 226, protein100g: 11, carbs100g: 20, fat100g: 11.5, servingSize: "2 tacos", servingGrams: 180 },
  { id: "guild_sushi_roll", name: "Sushi roll, salmon avocado", aliases: ["sushi", "roll"], category: "Meal", source: "guild_compendium", calories100g: 145, protein100g: 5.8, carbs100g: 20, fat100g: 4.8, servingSize: "8 pieces", servingGrams: 220 },
  { id: "guild_pad_thai", name: "Pad Thai with chicken", aliases: ["pad thai", "thai noodles"], category: "Meal", source: "guild_compendium", calories100g: 190, protein100g: 9, carbs100g: 24, fat100g: 6.5, servingSize: "1 entree", servingGrams: 450 },
  { id: "guild_chicken_tikka", name: "Chicken tikka masala with rice", aliases: ["tikka masala", "indian chicken"], category: "Meal", source: "guild_compendium", calories100g: 171, protein100g: 8.5, carbs100g: 19, fat100g: 6.5, servingSize: "1 bowl", servingGrams: 450 },
  { id: "guild_ramen", name: "Ramen with egg and pork", aliases: ["ramen", "noodle soup"], category: "Meal", source: "guild_compendium", calories100g: 96, protein100g: 4.8, carbs100g: 11.5, fat100g: 3.4, sodiumMg100g: 520, servingSize: "1 bowl", servingGrams: 650 },
  { id: "guild_protein_smoothie", name: "Protein smoothie", aliases: ["smoothie", "protein shake banana"], category: "Meal", source: "guild_compendium", calories100g: 106, protein100g: 8, carbs100g: 13, fat100g: 2.2, servingSize: "1 large smoothie", servingGrams: 450 },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

export function searchFoodMacroDatabase(query: string, limit = 16): FoodMacroItem[] {
  const q = normalize(query);
  if (!q) return [];
  const terms = q.split(" ").filter(Boolean);

  return FOOD_MACRO_DATABASE
    .map(item => {
      const haystack = normalize([item.name, item.category, ...item.aliases].join(" "));
      const exactName = normalize(item.name) === q ? 80 : 0;
      const starts = normalize(item.name).startsWith(q) ? 50 : 0;
      const includes = haystack.includes(q) ? 30 : 0;
      const termScore = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 8 : 0), 0);
      return { item, score: exactName + starts + includes + termScore };
    })
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map(row => row.item);
}
