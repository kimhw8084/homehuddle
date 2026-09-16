import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Action, Editor, Field, Panel, planningStyles as s } from '../../components/ui/PlanningUI';
import { MealPlan, planningApi, RecipeRecord } from '../planning/api';
import { addDays, startOfWeek } from '../planning/dates';
import { useSharedData } from '../planning/use-shared-data';
import { useHuddleStore } from '../../store/huddleStore';

const TABLES = ['recipes', 'meal_plans'] as const;
type RecipeDraft = Omit<RecipeRecord, 'household_id'>;
type MealDraft = Omit<MealPlan, 'id' | 'household_id'>;

export function MealPlanner() {
  const [week, setWeek] = useState(() => startOfWeek());
  const load = useCallback((householdId: string) => planningApi.meals(householdId, week, addDays(week, 6)), [week]);
  const shared = useSharedData(TABLES, load);
  const members = useHuddleStore(state => state.familyMembers);
  const [recipeDraft, setRecipeDraft] = useState<RecipeDraft | null>(null);
  const [ingredients, setIngredients] = useState('');
  const [mealDraft, setMealDraft] = useState<MealDraft | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const recipes = shared.data?.recipes ?? [];
  const plans = shared.data?.plans ?? [];
  const visibleRecipes = recipes.filter(recipe => recipe.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 30);

  async function run(action: (householdId: string) => Promise<string>) {
    if (lock.current || !shared.householdId) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { setNotice(await action(shared.householdId)); shared.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Your change was not saved. Please try again.'); shared.refresh(); }
    finally { lock.current = false; setBusy(false); }
  }
  function moveWeek(days: number) { setWeek(value => addDays(value, days)); setMealDraft(null); setNotice(''); setError(''); }

  return <View style={{ gap: 16 }}>
    <View style={s.row}><Text accessibilityRole="header" style={[s.heading, { flex: 1 }]}>Dinner, decided</Text><Action label="Refresh meals" secondary onPress={shared.refresh} /></View>
    <Text style={s.muted}>Plan together, reuse a week, and send recipe ingredients to your shared shopping list.</Text>
    <View style={[s.row, { justifyContent: 'space-between' }]}><Action label="Previous week" secondary disabled={busy} onPress={() => moveWeek(-7)} /><Text style={s.text}>{week}</Text><Action label="Next week" secondary disabled={busy} onPress={() => moveWeek(7)} /></View>
    {shared.loading && <Text style={s.muted}>Loading your meal plan…</Text>}
    {!!shared.error && <Text accessibilityRole="alert" style={s.error}>{shared.error}</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
    {Array.from({ length: 7 }, (_, index) => addDays(week, index)).map(date => {
      const plan = plans.find(item => item.meal_date === date);
      return <Panel key={date}>
        <Text style={s.muted}>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
        <Text style={s.heading}>{plan?.title ?? 'Nothing planned yet'}</Text>
        {plan?.cook_id && <Text style={s.muted}>Cooking: {members.find(member => member.id === plan.cook_id)?.name ?? 'Former member'}</Text>}
        <Action label={plan ? 'Change dinner' : 'Plan dinner'} secondary disabled={busy || shared.loading} onPress={() => {
          setMealDraft(plan ? { ...plan } : { meal_date: date, recipe_id: null, title: '', cook_id: null, version: 0 }); setError('');
        }} />
      </Panel>;
    })}
    {mealDraft && <Editor busy={busy} onClose={() => setMealDraft(null)}><Panel>
      <Text accessibilityRole="header" style={s.heading}>Dinner for {mealDraft.meal_date}</Text>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Field label="Dinner plan" value={mealDraft.title} maxLength={120} editable={!busy} onChangeText={title => setMealDraft(old => old ? { ...old, title, recipe_id: null } : null)} placeholder="Choose a recipe below, or type Takeout…" />
      <Field label="Find a recipe" value={search} onChangeText={setSearch} />
      <View style={s.row}>{visibleRecipes.map(recipe => <Action key={recipe.id} label={recipe.name} secondary={mealDraft.recipe_id !== recipe.id} disabled={busy}
        onPress={() => setMealDraft(old => old ? { ...old, recipe_id: recipe.id, title: recipe.name } : null)} />)}</View>
      <Text style={s.muted}>Who is cooking?</Text>
      <View style={s.row}><Action label="Decide later" secondary={mealDraft.cook_id !== null} onPress={() => setMealDraft(old => old ? { ...old, cook_id: null } : null)} />
        {members.filter(member => member.id).map(member => <Action key={member.id} label={member.name} secondary={mealDraft.cook_id !== member.id}
          onPress={() => setMealDraft(old => old ? { ...old, cook_id: member.id! } : null)} />)}</View>
      <Action label="Save dinner" busy={busy} disabled={!mealDraft.title.trim()} onPress={() => { void run(async householdId => { await planningApi.saveMeal(householdId, mealDraft); setMealDraft(null); return 'Dinner saved for everyone.'; }); }} />
      <Action label="Cancel dinner edit" secondary disabled={busy} onPress={() => setMealDraft(null)} />
    </Panel></Editor>}
    <Panel>
      <Text style={s.heading}>Save next week’s planning time</Text>
      <Text style={s.muted}>Copy fills empty days only. Your existing dinners stay unchanged. Ingredient additions are deduplicated per planned meal.</Text>
      <Action label="Reuse last week’s dinners" secondary busy={busy} onPress={() => { void run(async householdId => `${await planningApi.copyWeek(householdId, addDays(week, -7), week)} dinners copied. Existing plans were kept.`); }} />
      <Action label="Add this week’s ingredients to shopping" disabled={busy || !plans.some(plan => plan.recipe_id)} onPress={() => { void run(async householdId => `${await planningApi.addIngredients(householdId, week)} ingredients added to Shopping. Check your pantry before buying.`); }} />
    </Panel>
    <Panel>
      <Text accessibilityRole="header" style={s.heading}>Your recipe book</Text>
      <Field label="Search saved recipes" value={search} onChangeText={setSearch} />
      {!recipes.length && <Text style={s.muted}>Save a household favorite once. Reuse it in any week.</Text>}
      {visibleRecipes.map(recipe => <View key={recipe.id} style={s.row}><Text style={[s.text, { flex: 1 }]}>{recipe.name} · {recipe.ingredients.length} ingredients</Text><Action label={`Edit ${recipe.name}`} secondary disabled={busy} onPress={() => { setRecipeDraft(recipe); setIngredients(recipe.ingredients.join('\n')); }} /></View>)}
      {recipes.length > 30 && <Text style={s.muted}>Showing up to 30 matching recipes. Search to narrow the list.</Text>}
      <Action label="Add a recipe" secondary disabled={busy} onPress={() => { setRecipeDraft({ id: randomUUID(), name: '', ingredients: [], instructions: '', version: 0 }); setIngredients(''); setError(''); }} />
    </Panel>
    {recipeDraft && <Editor busy={busy} onClose={() => setRecipeDraft(null)}><Panel>
      <Text accessibilityRole="header" style={s.heading}>{recipeDraft.version ? 'Edit recipe' : 'Save a favorite'}</Text>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Field label="Recipe name" value={recipeDraft.name} maxLength={120} editable={!busy} onChangeText={name => setRecipeDraft(old => old ? { ...old, name } : null)} />
      <Field label="Ingredients (one per line, include amounts)" value={ingredients} onChangeText={setIngredients} multiline maxLength={16100} editable={!busy} style={{ minHeight: 120 }} placeholder={'2 tomatoes\n500 g pasta\nOlive oil'} />
      <Field label="Instructions (optional)" value={recipeDraft.instructions} multiline maxLength={10000} editable={!busy} onChangeText={instructions => setRecipeDraft(old => old ? { ...old, instructions } : null)} style={{ minHeight: 100 }} />
      <Action label="Save recipe" busy={busy} disabled={!recipeDraft.name.trim()} onPress={() => { void run(async householdId => {
        await planningApi.saveRecipe(householdId, { ...recipeDraft, ingredients: ingredients.split('\n').map(value => value.trim()).filter(Boolean) });
        setRecipeDraft(null); return 'Recipe saved to your household.';
      }); }} />
      <Action label="Cancel recipe edit" secondary disabled={busy} onPress={() => setRecipeDraft(null)} />
    </Panel></Editor>}
  </View>;
}
