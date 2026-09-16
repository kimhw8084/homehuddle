import { supabase } from '../../lib/supabase';

export type ShoppingItem = { id: string; household_id: string; name: string; quantity: number; unit: string; category: string; completed: boolean; archived: boolean; version: number; created_at: string };
export type RecipeRecord = { id: string; household_id: string; name: string; ingredients: string[]; instructions: string; version: number };
export type MealPlan = { id: string; household_id: string; meal_date: string; recipe_id: string | null; title: string; cook_id: string | null; version: number };

function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

export const planningApi = {
  async shopping(householdId: string) {
    return unwrap(await supabase.from('shopping_items').select('id,household_id,name,quantity,unit,category,completed,archived,version,created_at')
      .eq('household_id', householdId).eq('archived', false).order('created_at', { ascending: false }).limit(1000)) as ShoppingItem[];
  },
  async saveItem(householdId: string, item: Omit<ShoppingItem, 'household_id' | 'created_at'>) {
    return unwrap(await supabase.rpc('save_shopping_item', { target_household: householdId, item_id: item.id, item_name: item.name.trim(), quantity_value: item.quantity,
      unit_value: item.unit.trim(), category_value: item.category, completed_value: item.completed, archived_value: item.archived, expected_version: item.version })) as ShoppingItem;
  },
  async meals(householdId: string, start: string, end: string) {
    const [recipes, plans] = await Promise.all([
      supabase.from('recipes').select('id,household_id,name,ingredients,instructions,version').eq('household_id', householdId).is('archived_at', null).order('name').limit(1000),
      supabase.from('meal_plans').select('id,household_id,meal_date,recipe_id,title,cook_id,version').eq('household_id', householdId).gte('meal_date', start).lte('meal_date', end).order('meal_date'),
    ]);
    return { recipes: unwrap(recipes) as RecipeRecord[], plans: unwrap(plans) as MealPlan[] };
  },
  async saveRecipe(householdId: string, recipe: Omit<RecipeRecord, 'household_id'>) {
    return unwrap(await supabase.rpc('save_recipe', { target_household: householdId, recipe_id_value: recipe.id, recipe_name: recipe.name.trim(),
      ingredient_values: recipe.ingredients, instruction_value: recipe.instructions, expected_version: recipe.version })) as RecipeRecord;
  },
  async saveMeal(householdId: string, plan: Omit<MealPlan, 'id' | 'household_id'>) {
    return unwrap(await supabase.rpc('save_meal_plan', { target_household: householdId, date_value: plan.meal_date, recipe_id_value: plan.recipe_id,
      title_value: plan.title.trim(), cook_id_value: plan.cook_id, expected_version: plan.version })) as MealPlan;
  },
  async copyWeek(householdId: string, source: string, destination: string) {
    return unwrap(await supabase.rpc('copy_meal_week', { target_household: householdId, source_start: source, destination_start: destination })) as number;
  },
  async addIngredients(householdId: string, week: string) {
    return unwrap(await supabase.rpc('add_meal_ingredients', { target_household: householdId, week_start: week })) as number;
  },
};
