'use strict';

// Store sections in shopping order. Edit these lists to extend coverage; spellings
// coalesce via normalization + fuzzy matching in sections.js.
const SECTIONS = ['Produce', 'Dairy', 'Meat/Protein', 'Bakery', 'Pantry/Dry', 'Spices', 'Frozen', 'Canned', 'Other'];

// Strong multi-word phrases, highest priority first (Canned/Frozen trump base items).
const PHRASE_RULES = [
  ['Frozen', ['frozen', 'ice cream', 'ice cube', 'popsicle', 'frozen peas', 'frozen corn']],
  ['Canned', ['canned', 'diced tomato', 'crushed tomato', 'tomato paste', 'tomato sauce', 'tomato puree', 'passata', 'baked bean', 'refried bean', 'pinto bean', 'kidney bean', 'black bean', 'cannellini', 'chickpea', 'chick pea', 'garbanzo', 'in adobo', 'coconut milk', 'condensed milk', 'evaporated milk', 'green chili in', 'tuna', 'olives', 'pickle', 'capers']],
  ['Bakery', ['whole wheat', 'sandwich bread', 'burger bun', 'hot dog bun', 'pita bread', 'dinner roll']],
  ['Spices', ['bay leaf', 'bay leaves', 'taco seasoning', 'kasoori methi', 'curry powder', 'black pepper', 'red pepper flake', 'chili powder', 'chilli powder', 'star anise', 'baking powder', 'baking soda', 'vanilla extract']],
];

// Canonical single tokens per section (looked up after normalization, plural-strip + fuzzy<=1).
const TOKEN_DB = {
  Produce: ['onion', 'scallion', 'shallot', 'garlic', 'ginger', 'tomato', 'potato', 'sweetpotato', 'carrot', 'celery', 'cucumber', 'lettuce', 'spinach', 'kale', 'arugula', 'cabbage', 'cauliflower', 'broccoli', 'zucchini', 'eggplant', 'okra', 'mushroom', 'pea', 'greenbean', 'corn', 'pepper', 'jalapeno', 'serrano', 'habanero', 'poblano', 'chili', 'chilli', 'chile', 'cilantro', 'parsley', 'mint', 'basil', 'dill', 'rosemary', 'thyme', 'sage', 'curryleaf', 'lemon', 'lime', 'orange', 'apple', 'banana', 'mango', 'grape', 'berry', 'strawberry', 'blueberry', 'raspberry', 'avocado', 'pineapple', 'melon', 'watermelon', 'peach', 'plum', 'pear', 'pomegranate', 'beet', 'radish', 'turnip', 'squash', 'pumpkin', 'leek', 'fennel', 'asparagus', 'artichoke', 'herb', 'green', 'sprout', 'grapefruit'],
  Dairy: ['milk', 'butter', 'cream', 'heavycream', 'sourcream', 'yogurt', 'yoghurt', 'curd', 'cheese', 'paneer', 'ghee', 'mozzarella', 'cheddar', 'parmesan', 'feta', 'ricotta', 'buttermilk', 'margarine', 'cottagecheese', 'creamcheese', 'custard'],
  'Meat/Protein': ['chicken', 'beef', 'pork', 'lamb', 'mutton', 'turkey', 'bacon', 'sausage', 'ham', 'egg', 'fish', 'salmon', 'shrimp', 'prawn', 'crab', 'tofu', 'tempeh', 'seitan'],
  Bakery: ['bread', 'bun', 'naan', 'roti', 'paratha', 'tortilla', 'pita', 'bagel', 'baguette', 'croissant', 'muffin', 'pav', 'cracker'],
  'Pantry/Dry': ['rice', 'flour', 'maida', 'sooji', 'semolina', 'besan', 'cornstarch', 'cornflour', 'lentil', 'dal', 'sugar', 'jaggery', 'honey', 'syrup', 'oil', 'vinegar', 'pasta', 'noodle', 'spaghetti', 'macaroni', 'broth', 'stock', 'salt', 'tea', 'coffee', 'quinoa', 'oat', 'cereal', 'peanut', 'peanutbutter', 'almond', 'cashew', 'walnut', 'raisin', 'nut', 'breadcrumb', 'cocoa', 'chocolate', 'vanilla', 'cornmeal', 'tamarind', 'soysauce', 'ketchup', 'mustard', 'mayo', 'mayonnaise', 'water'],
  Spices: ['cumin', 'coriander', 'turmeric', 'garam', 'masala', 'cardamom', 'peppercorn', 'clove', 'cinnamon', 'anise', 'nutmeg', 'mace', 'saffron', 'paprika', 'cayenne', 'chaat', 'asafoetida', 'hing', 'fenugreek', 'methi', 'oregano', 'sesame', 'spice', 'seasoning', 'allspice'],
};

// Words stripped before token lookup (descriptors/prep/units). Keep lowercase.
const STOP = 'chopped diced minced grated finely fresh small large medium ground powder powdered seed seeds dried optional garnish garnishes ripe peeled sliced cubed whole boneless skinless raw cooked extra virgin toasted roasted can cans piece bark leaf leaves or and to taste of a the'.split(' ');
const UNITS = 'cup cups tbsp tsp tablespoon tablespoons teaspoon teaspoons oz ounce ounces lb lbs pound pounds g kg gram grams ml l liter litre pinch clove cloves bunch handful inch'.split(' ');

module.exports = { SECTIONS, PHRASE_RULES, TOKEN_DB, STOP, UNITS };
