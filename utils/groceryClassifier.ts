/**
 * groceryClassifier.ts
 *
 * Zero-dependency, on-device, near-instant grocery item classifier.
 */

// ─── CATEGORY REGISTRY ───────────────────────────────────────────────────────

export type GroceryCategory =
    | 'Dairy & Eggs' | 'Produce' | 'Meat & Seafood' | 'Bakery & Bread'
    | 'Pantry & Dry Goods' | 'Frozen Foods' | 'Snacks' | 'Beverages'
    | 'Breakfast' | 'Condiments & Sauces' | 'Spices & Seasonings'
    | 'Baking' | 'Canned & Jarred' | 'Household' | 'Cleaning'
    | 'Baby & Kids' | 'Health & Beauty' | 'Pet' | 'Paper & Plastics'
    | 'Pharmacy' | 'Deli & Prepared' | 'Alcohol' | 'Other';

export const CATEGORY_COLORS: Record<GroceryCategory, string> = {
    'Dairy & Eggs': '#3B82F6', 'Produce': '#10B981', 'Meat & Seafood': '#EF4444',
    'Bakery & Bread': '#F59E0B', 'Pantry & Dry Goods': '#8B5CF6',
    'Frozen Foods': '#06B6D4', 'Snacks': '#EC4899', 'Beverages': '#0EA5E9',
    'Breakfast': '#F97316', 'Condiments & Sauces': '#EAB308',
    'Spices & Seasonings': '#A16207', 'Baking': '#D946EF',
    'Canned & Jarred': '#6366F1', 'Household': '#64748B',
    'Cleaning': '#0D9488', 'Baby & Kids': '#F472B6',
    'Health & Beauty': '#7C3AED', 'Pet': '#84CC16',
    'Paper & Plastics': '#475569', 'Pharmacy': '#DC2626',
    'Deli & Prepared': '#C2410C', 'Alcohol': '#7E22CE', 'Other': '#94A3B8',
};

// ─── MASTER DICTIONARY ───────────────────────────────────────────────────────
// ALL KEYS MUST BE LOWERCASE FOR CONSISTENT MATCHING
const DICTIONARY: Record<string, GroceryCategory> = {
    // --- DAIRY & EGGS ---
    'milk': 'Dairy & Eggs', 'whole milk': 'Dairy & Eggs', 'skim milk': 'Dairy & Eggs', '2% milk': 'Dairy & Eggs',
    'heavy cream': 'Dairy & Eggs', 'half and half': 'Dairy & Eggs', 'whipping cream': 'Dairy & Eggs',
    'butter': 'Dairy & Eggs', 'salted butter': 'Dairy & Eggs', 'unsalted butter': 'Dairy & Eggs', 'ghee': 'Dairy & Eggs',
    'eggs': 'Dairy & Eggs', 'large eggs': 'Dairy & Eggs', 'organic eggs': 'Dairy & Eggs', 'quail eggs': 'Dairy & Eggs',
    'cheese': 'Dairy & Eggs', 'cheddar': 'Dairy & Eggs', 'mozzarella': 'Dairy & Eggs', 'parmesan': 'Dairy & Eggs',
    'swiss cheese': 'Dairy & Eggs', 'brie': 'Dairy & Eggs', 'camembert': 'Dairy & Eggs', 'blue cheese': 'Dairy & Eggs',
    'feta': 'Dairy & Eggs', 'goat cheese': 'Dairy & Eggs', 'ricotta': 'Dairy & Eggs', 'cottage cheese': 'Dairy & Eggs',
    'yogurt': 'Dairy & Eggs', 'greek yogurt': 'Dairy & Eggs', 'kefir': 'Dairy & Eggs', 'sour cream': 'Dairy & Eggs',
    'cream cheese': 'Dairy & Eggs', 'mascarpone': 'Dairy & Eggs', 'burrata': 'Dairy & Eggs',
    'tofu': 'Dairy & Eggs', 'firm tofu': 'Dairy & Eggs', 'silken tofu': 'Dairy & Eggs', 'tempeh': 'Dairy & Eggs',
    'oat milk': 'Dairy & Eggs', 'almond milk': 'Dairy & Eggs', 'soy milk': 'Dairy & Eggs', 'cashew milk': 'Dairy & Eggs',
    'margarine': 'Dairy & Eggs', 'provolone': 'Dairy & Eggs', 'gouda': 'Dairy & Eggs',

    // --- PRODUCE ---
    'apple': 'Produce', 'apples': 'Produce', 'fuji apple': 'Produce', 'gala apple': 'Produce', 'granny smith': 'Produce',
    'banana': 'Produce', 'bananas': 'Produce', 'orange': 'Produce', 'oranges': 'Produce', 'clementine': 'Produce',
    'lemon': 'Produce', 'lemons': 'Produce', 'lime': 'Produce', 'limes': 'Produce', 'grapefruit': 'Produce',
    'strawberries': 'Produce', 'blueberries': 'Produce', 'raspberries': 'Produce', 'blackberries': 'Produce',
    'grapes': 'Produce', 'red grapes': 'Produce', 'green grapes': 'Produce', 'watermelon': 'Produce',
    'pineapple': 'Produce', 'mango': 'Produce', 'papaya': 'Produce', 'kiwi': 'Produce', 'peaches': 'Produce',
    'cherries': 'Produce', 'pomegranate': 'Produce', 'dragon fruit': 'Produce', 'lychee': 'Produce', 'durian': 'Produce',
    'lettuce': 'Produce', 'romaine': 'Produce', 'iceberg': 'Produce', 'spinach': 'Produce', 'kale': 'Produce',
    'arugula': 'Produce', 'cabbage': 'Produce', 'napa cabbage': 'Produce', 'red cabbage': 'Produce',
    'broccoli': 'Produce', 'cauliflower': 'Produce', 'brussels sprouts': 'Produce', 'carrots': 'Produce',
    'potatoes': 'Produce', 'russet potatoes': 'Produce', 'red potatoes': 'Produce', 'sweet potatoes': 'Produce', 'yam': 'Produce',
    'onions': 'Produce', 'red onion': 'Produce', 'white onion': 'Produce', 'shallots': 'Produce',
    'garlic': 'Produce', 'ginger': 'Produce', 'scallions': 'Produce', 'green onions': 'Produce', 'leeks': 'Produce',
    'tomatoes': 'Produce', 'cherry tomatoes': 'Produce', 'roma tomatoes': 'Produce',
    'avocado': 'Produce', 'hass avocado': 'Produce', 'cucumber': 'Produce', 'english cucumber': 'Produce',
    'bell peppers': 'Produce', 'red pepper': 'Produce', 'green pepper': 'Produce',
    'jalapeno': 'Produce', 'serrano': 'Produce', 'habanero': 'Produce', 'thai chili': 'Produce',
    'zucchini': 'Produce', 'eggplant': 'Produce', 'squash': 'Produce', 'butternut squash': 'Produce', 'pumpkin': 'Produce',
    'asparagus': 'Produce', 'celery': 'Produce', 'mushrooms': 'Produce', 'shiitake': 'Produce', 'oyster mushroom': 'Produce',
    'king oyster mushroom': 'Produce', 'enoki mushroom': 'Produce', 'wood ear mushroom': 'Produce',
    'bok choy': 'Produce', 'baby bok choy': 'Produce', 'choy sum': 'Produce', 'gai lan': 'Produce',
    'daikon': 'Produce', 'radish': 'Produce', 'lotus root': 'Produce', 'bamboo shoots': 'Produce',
    'cilantro': 'Produce', 'parsley': 'Produce', 'basil': 'Produce', 'thai basil': 'Produce', 'mint': 'Produce',
    'rosemary': 'Produce', 'thyme': 'Produce', 'oregano': 'Produce', 'dill': 'Produce', 'chives': 'Produce',
    'corn': 'Produce', 'peas': 'Produce', 'green beans': 'Produce', 'okra': 'Produce', 'artichoke': 'Produce',
    'kimchi': 'Produce', 'baechu kimchi': 'Produce', 'kkakdugi': 'Produce', 'oi sobagi': 'Produce', 'white kimchi': 'Produce',
    'natto': 'Produce', 'pickled ginger': 'Produce', 'danmuji': 'Produce', 'edamame': 'Produce', 'shishito peppers': 'Produce',
    'burdock root': 'Produce', 'gobo': 'Produce', 'taro': 'Produce', 'cassava': 'Produce',

    // --- MEAT & SEAFOOD ---
    'chicken': 'Meat & Seafood', 'chicken breast': 'Meat & Seafood', 'chicken thighs': 'Meat & Seafood', 'wings': 'Meat & Seafood',
    'ground chicken': 'Meat & Seafood', 'whole chicken': 'Meat & Seafood',
    'beef': 'Meat & Seafood', 'ground beef': 'Meat & Seafood', 'steak': 'Meat & Seafood', 'ribeye': 'Meat & Seafood',
    'beef short ribs': 'Meat & Seafood', 'brisket': 'Meat & Seafood', 'bulgogi': 'Meat & Seafood', 'galbi': 'Meat & Seafood',
    'pork': 'Meat & Seafood', 'pork chops': 'Meat & Seafood', 'pork belly': 'Meat & Seafood', 'ground pork': 'Meat & Seafood',
    'bacon': 'Meat & Seafood', 'ham': 'Meat & Seafood', 'prosciutto': 'Meat & Seafood', 'salami': 'Meat & Seafood',
    'turkey': 'Meat & Seafood', 'ground turkey': 'Meat & Seafood', 'lamb': 'Meat & Seafood', 'lamb chops': 'Meat & Seafood',
    'sausage': 'Meat & Seafood', 'italian sausage': 'Meat & Seafood', 'chorizo': 'Meat & Seafood', 'bratwurst': 'Meat & Seafood',
    'salmon': 'Meat & Seafood', 'atlantic salmon': 'Meat & Seafood', 'smoked salmon': 'Meat & Seafood',
    'shrimp': 'Meat & Seafood', 'prawns': 'Meat & Seafood', 'tiger shrimp': 'Meat & Seafood',
    'tuna': 'Meat & Seafood', 'ahi tuna': 'Meat & Seafood', 'cod': 'Meat & Seafood', 'tilapia': 'Meat & Seafood',
    'crab': 'Meat & Seafood', 'lobster': 'Meat & Seafood', 'scallops': 'Meat & Seafood', 'mussels': 'Meat & Seafood', 'clams': 'Meat & Seafood',
    'duck': 'Meat & Seafood', 'venison': 'Meat & Seafood', 'hot dogs': 'Meat & Seafood', 'pepperoni': 'Meat & Seafood',

    // --- BAKERY & BREAD ---
    'bread': 'Bakery & Bread', 'white bread': 'Bakery & Bread', 'whole wheat bread': 'Bakery & Bread', 'sourdough': 'Bakery & Bread',
    'baguette': 'Bakery & Bread', 'bagels': 'Bakery & Bread', 'english muffins': 'Bakery & Bread', 'croissants': 'Bakery & Bread',
    'tortillas': 'Bakery & Bread', 'corn tortillas': 'Bakery & Bread', 'flour tortillas': 'Bakery & Bread',
    'pita': 'Bakery & Bread', 'naan': 'Bakery & Bread', 'roti': 'Bakery & Bread', 'paratha': 'Bakery & Bread',
    'buns': 'Bakery & Bread', 'hamburger buns': 'Bakery & Bread', 'hot dog buns': 'Bakery & Bread', 'brioche': 'Bakery & Bread',
    'muffins': 'Bakery & Bread', 'donuts': 'Bakery & Bread', 'pastries': 'Bakery & Bread', 'pizza dough': 'Bakery & Bread',
    'bao buns': 'Bakery & Bread', 'mantou': 'Bakery & Bread', 'shokupan': 'Bakery & Bread',

    // --- PANTRY & DRY GOODS ---
    'pasta': 'Pantry & Dry Goods', 'spaghetti': 'Pantry & Dry Goods', 'penne': 'Pantry & Dry Goods', 'fusilli': 'Pantry & Dry Goods',
    'macaroni': 'Pantry & Dry Goods', 'egg noodles': 'Pantry & Dry Goods',
    'rice': 'Pantry & Dry Goods', 'white rice': 'Pantry & Dry Goods', 'brown rice': 'Pantry & Dry Goods', 'basmati rice': 'Pantry & Dry Goods',
    'jasmine rice': 'Pantry & Dry Goods', 'arborio rice': 'Pantry & Dry Goods', 'sushi rice': 'Pantry & Dry Goods', 'glutinous rice': 'Pantry & Dry Goods',
    'ramen': 'Pantry & Dry Goods', 'udon': 'Pantry & Dry Goods', 'soba': 'Pantry & Dry Goods', 'rice noodles': 'Pantry & Dry Goods',
    'vermicelli': 'Pantry & Dry Goods', 'glass noodles': 'Pantry & Dry Goods', 'shirataki': 'Pantry & Dry Goods',
    'flour': 'Baking', 'all purpose flour': 'Baking', 'bread flour': 'Baking', 'cake flour': 'Baking', 'almond flour': 'Baking',
    'sugar': 'Baking', 'brown sugar': 'Baking', 'powdered sugar': 'Baking', 'stevia': 'Baking',
    'olive oil': 'Pantry & Dry Goods', 'extra virgin olive oil': 'Pantry & Dry Goods', 'vegetable oil': 'Pantry & Dry Goods',
    'sesame oil': 'Pantry & Dry Goods', 'perilla oil': 'Pantry & Dry Goods', 'coconut oil': 'Pantry & Dry Goods',
    'vinegar': 'Pantry & Dry Goods', 'apple cider vinegar': 'Pantry & Dry Goods', 'balsamic vinegar': 'Pantry & Dry Goods',
    'rice vinegar': 'Pantry & Dry Goods', 'white vinegar': 'Pantry & Dry Goods', 'black vinegar': 'Pantry & Dry Goods',
    'soy sauce': 'Condiments & Sauces', 'tamari': 'Condiments & Sauces', 'fish sauce': 'Condiments & Sauces', 'oyster sauce': 'Condiments & Sauces',
    'honey': 'Pantry & Dry Goods', 'maple syrup': 'Pantry & Dry Goods', 'peanut butter': 'Pantry & Dry Goods', 'almond butter': 'Pantry & Dry Goods',
    'quinoa': 'Pantry & Dry Goods', 'couscous': 'Pantry & Dry Goods', 'lentils': 'Pantry & Dry Goods', 'chickpeas': 'Pantry & Dry Goods',
    'black beans': 'Pantry & Dry Goods', 'kidney beans': 'Pantry & Dry Goods', 'kombu': 'Pantry & Dry Goods', 'wakame': 'Pantry & Dry Goods',
    'nori': 'Pantry & Dry Goods', 'gim': 'Pantry & Dry Goods', 'bonito flakes': 'Pantry & Dry Goods', 'dashi': 'Pantry & Dry Goods',
    'miso': 'Pantry & Dry Goods', 'white miso': 'Pantry & Dry Goods', 'red miso': 'Pantry & Dry Goods', 'doenjang': 'Pantry & Dry Goods',

    // --- CONDIMENTS & SAUCES ---
    'ketchup': 'Condiments & Sauces', 'mustard': 'Condiments & Sauces', 'dijon mustard': 'Condiments & Sauces', 'mayo': 'Condiments & Sauces',
    'mayonnaise': 'Condiments & Sauces', 'kewpie mayo': 'Condiments & Sauces', 'bbq sauce': 'Condiments & Sauces',
    'hot sauce': 'Condiments & Sauces', 'sriracha': 'Condiments & Sauces', 'salsa': 'Condiments & Sauces', 'guacamole': 'Deli & Prepared',
    'hummus': 'Deli & Prepared', 'pesto': 'Condiments & Sauces', 'marinara': 'Condiments & Sauces', 'pasta sauce': 'Condiments & Sauces',
    'teriyaki': 'Condiments & Sauces', 'hoisin': 'Condiments & Sauces', 'gochujang': 'Condiments & Sauces', 'ssamjang': 'Condiments & Sauces',
    'tonkatsu sauce': 'Condiments & Sauces', 'ponzu': 'Condiments & Sauces', 'mirin': 'Pantry & Dry Goods',
    'chili crisp': 'Condiments & Sauces', 'lao gan ma': 'Condiments & Sauces', 'sambal oelek': 'Condiments & Sauces',
    'gochugaru': 'Spices & Seasonings', 'furikake': 'Spices & Seasonings', 'wasabi': 'Condiments & Sauces',

    // --- SPICES & SEASONINGS ---
    'salt': 'Spices & Seasonings', 'black pepper': 'Spices & Seasonings', 'sea salt': 'Spices & Seasonings', 'cinnamon': 'Spices & Seasonings',
    'paprika': 'Spices & Seasonings', 'smoked paprika': 'Spices & Seasonings', 'cumin': 'Spices & Seasonings',
    'garlic powder': 'Spices & Seasonings', 'onion powder': 'Spices & Seasonings', 'turmeric': 'Spices & Seasonings',
    'chili powder': 'Spices & Seasonings', 'oregano dry': 'Spices & Seasonings', 'coriander': 'Spices & Seasonings', 'cardamom': 'Spices & Seasonings',
    'star anise': 'Spices & Seasonings', 'sichuan peppercorn': 'Spices & Seasonings', 'five spice': 'Spices & Seasonings',
    'vanilla extract': 'Baking', 'baking powder': 'Baking', 'baking soda': 'Baking', 'yeast': 'Baking',

    // --- SNACKS & BEVERAGES ---
    'chips': 'Snacks', 'tortilla chips': 'Snacks', 'pretzels': 'Snacks', 'popcorn': 'Snacks', 'mixed nuts': 'Snacks',
    'chocolate': 'Snacks', 'cookies': 'Snacks', 'oreos': 'Snacks', 'pocky': 'Snacks', 'shrimp chips': 'Snacks', 'mochi': 'Snacks',
    'water': 'Beverages', 'sparkling water': 'Beverages', 'soda': 'Beverages', 'coke': 'Beverages', 'juice': 'Beverages',
    'coffee': 'Beverages', 'coffee beans': 'Beverages', 'tea': 'Beverages', 'green tea': 'Beverages', 'matcha': 'Beverages',
    'energy drink': 'Beverages', 'beer': 'Alcohol', 'wine': 'Alcohol', 'soju': 'Alcohol', 'sake': 'Alcohol', 'makgeolli': 'Alcohol',

    // --- FROZEN & CANNED ---
    'ice cream': 'Frozen Foods', 'frozen pizza': 'Frozen Foods', 'frozen vegetables': 'Frozen Foods', 'frozen dumplings': 'Frozen Foods',
    'mandu': 'Frozen Foods', 'gyoza': 'Frozen Foods', 'potstickers': 'Frozen Foods', 'waffles': 'Breakfast', 'frozen waffles': 'Breakfast',
    'canned beans': 'Canned & Jarred', 'canned tomatoes': 'Canned & Jarred', 'tomato paste': 'Canned & Jarred',
    'canned soup': 'Canned & Jarred', 'chicken broth': 'Canned & Jarred', 'beef broth': 'Canned & Jarred', 'stock': 'Canned & Jarred',
    'canned tuna': 'Canned & Jarred', 'pickles': 'Canned & Jarred', 'olives': 'Canned & Jarred',

    // --- HOUSEHOLD & CLEANING ---
    'toilet paper': 'Paper & Plastics', 'paper towels': 'Paper & Plastics', 'trash bags': 'Paper & Plastics',
    'dish soap': 'Cleaning', 'dishwasher detergent': 'Cleaning', 'laundry detergent': 'Cleaning', 'bleach': 'Cleaning',
    'all purpose cleaner': 'Cleaning', 'glass cleaner': 'Cleaning', 'sponges': 'Cleaning',
    'batteries': 'Household', 'aa batteries': 'Household', 'aaa batteries': 'Household', 'light bulbs': 'Household',

    // --- HEALTH & PERSONAL ---
    'toothpaste': 'Health & Beauty', 'toothbrush': 'Health & Beauty', 'shampoo': 'Health & Beauty', 'conditioner': 'Health & Beauty',
    'soap': 'Health & Beauty', 'deodorant': 'Health & Beauty', 'razors': 'Health & Beauty', 'lotion': 'Health & Beauty',
    'advil': 'Pharmacy', 'tylenol': 'Pharmacy', 'ibuprofen': 'Pharmacy', 'bandages': 'Pharmacy', 'vitamins': 'Pharmacy',
    'diapers': 'Baby & Kids', 'baby wipes': 'Baby & Kids', 'dog food': 'Pet', 'cat food': 'Pet', 'cat litter': 'Pet',
};

// ─── NORMALIZER (Force Lowercase, Trim, Single Spaces) ────────────────────────
function normalize(input: string): string {
    if (!input) return '';
    return input.toLowerCase().trim().replace(/\s+/g, ' ');
}

export type FuzzySuggestion = { name: string; category: GroceryCategory; distance: number; };

// ─── SEARCH LOGIC ────────────────────────────────────────────────────────────

export function searchSuggestions(input: string, limit = 8): FuzzySuggestion[] {
    const normSearch = normalize(input);
    if (!normSearch) return [];

    const results: FuzzySuggestion[] = [];
    // Prioritize Prefix Matches
    for (const [key, cat] of Object.entries(DICTIONARY)) {
        if (key.startsWith(normSearch)) {
            results.push({ name: key, category: cat as GroceryCategory, distance: 0 });
        } else if (key.includes(normSearch)) {
            results.push({ name: key, category: cat as GroceryCategory, distance: 1 });
        }
        if (results.length >= limit * 3) break;
    }

    return results
        .sort((a, b) => a.distance - b.distance || a.name.length - b.name.length)
        .slice(0, limit);
}

// Minimal Levenshtein for fuzzy
function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    let row = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
        let prev = i;
        for (let j = 1; j <= n; j++) {
            const val = a[i - 1] === b[j - 1] ? row[j - 1] : 1 + Math.min(row[j - 1], row[j], prev);
            row[j - 1] = prev;
            prev = val;
        }
        row[n] = prev;
    }
    return row[n];
}

export function classify(input: string): { category: GroceryCategory; isExact: boolean; suggestions: FuzzySuggestion[]; } {
    const norm = normalize(input);
    if (!norm) return { category: 'Other', isExact: false, suggestions: [] };

    // 1. Exact Match Check (Case-Insensitive due to normalize)
    const exactCat = DICTIONARY[norm];

    // 2. Token Matching (e.g. "Green Apples" matches "Apples")
    let tokenCat: GroceryCategory | undefined;
    if (!exactCat) {
        const words = norm.split(' ');
        for (const word of words) {
            if (word.length < 3) continue;
            if (DICTIONARY[word]) {
                tokenCat = DICTIONARY[word];
                break;
            }
        }
    }

    // 3. Gather Suggestions (Always, so they don't disappear while typing)
    const suggestions = searchSuggestions(input, 6);

    // 4. Return combined result
    return {
        category: exactCat || tokenCat || 'Other',
        isExact: !!exactCat,
        suggestions: suggestions
    };
}
