// menuData.js — Komplex Cafe Menu Database
// Schema matches Firebase Firestore document structure:
//
//   availability : boolean  — true = orderable, false = grayed out
//   category     : string   — "Drink" | "Meal"
//   description  : string   — short item description
//   image_url    : string   — remote image URL (empty string = placeholder)
//   item_id      : number   — unique numeric ID
//   m_name       : string   — display name shown on menu
//   price        : number   — price in PHP (whole number)
//
// Hot/iced variants are split into separate items.
// No add-ons or dips.

export const ADD_ONS = [
  { id: "espresso_shot",   label: "Espresso Shot",   price: 45 },
  { id: "full_cream_milk", label: "Full Cream Milk", price: 20 },
  { id: "syrup",           label: "Syrup",           price: 45 },
  { id: "sauce",           label: "Sauce",           price: 20 },
  { id: "sea_salt_cream",  label: "Sea Salt Cream",  price: 40 },
];

export const DIP_TIERS = [
  {
id: "dip_base",
label: "Dip",
required: true,          // must pick one
options: [
      { id: "choco",    label: "Choco",    price: 0 },
      { id: "caramel",  label: "Caramel",  price: 0 },
    ],
  },
  {
id: "dip_topping",
label: "Topping (optional)",
required: false,          // optional tier
options: [
      { id: "none",           label: "None",           price: 0  },
      { id: "whip_cream",     label: "Whip Cream",     price: 15 },
      { id: "sea_salt_cream", label: "Sea Salt Cream", price: 15 },
    ],
  },
];

export const MENU = [

  // ── COFFEE ──────────────────────────────────────────────────────
  { item_id: 1,  m_name: "Hot Americano",           category: "Drink", price: 140, availability: true, description: "A bold espresso diluted with hot water for a clean, strong cup.", image_url: "" },
  { item_id: 2,  m_name: "Iced Americano",           category: "Drink", price: 150, availability: true, description: "Espresso shots poured over ice for a refreshing, crisp coffee.", image_url: "" },
  { item_id: 3,  m_name: "Hot Latte",                category: "Drink", price: 150, availability: true, description: "Smooth espresso blended with steamed milk and a light foam top.", image_url: "" },
  { item_id: 4,  m_name: "Iced Latte",               category: "Drink", price: 160, availability: true, description: "Espresso and cold milk poured over ice — simple and satisfying.", image_url: "" },
  { item_id: 5,  m_name: "Hot Spanish Latte",        category: "Drink", price: 160, availability: true, description: "Espresso with sweetened condensed milk, served hot and velvety.", image_url: "" },
  { item_id: 6,  m_name: "Iced Spanish Latte",       category: "Drink", price: 185, availability: true, description: "A creamy, lightly sweet espresso drink chilled over ice.", image_url: "" },
  { item_id: 7,  m_name: "Iced Oreo Latte",          category: "Drink", price: 185, availability: true, description: "Espresso meets crushed Oreos and milk over ice — a cookie lover's dream.", image_url: "" },
  { item_id: 8,  m_name: "Iced Vietnamese",          category: "Drink", price: 185, availability: true, description: "Strong drip coffee with sweetened condensed milk, served over ice.", image_url: "" },
  { item_id: 9,  m_name: "Hot Caramel Macchiato",    category: "Drink", price: 160, availability: true, description: "Layers of vanilla, steamed milk, espresso, and caramel drizzle.", image_url: "" },
  { item_id: 10, m_name: "Iced Caramel Macchiato",   category: "Drink", price: 185, availability: true, description: "Espresso and caramel layered beautifully over cold milk and ice.", image_url: "" },
  { item_id: 11, m_name: "Hot Muscovado Cinnamon",   category: "Drink", price: 160, availability: true, description: "Rich muscovado sugar and warming cinnamon in a cozy espresso drink.", image_url: "" },
  { item_id: 12, m_name: "Iced Muscovado Cinnamon",  category: "Drink", price: 185, availability: true, description: "Espresso with deep muscovado sweetness and a hint of cinnamon spice.", image_url: "" },
  { item_id: 13, m_name: "Hot Cacao Latte",          category: "Drink", price: 160, availability: true, description: "Earthy cacao blended with espresso and steamed milk.", image_url: "" },
  { item_id: 14, m_name: "Iced Cacao Latte",         category: "Drink", price: 185, availability: true, description: "A chocolatey espresso latte served cold over ice.", image_url: "" },
  { item_id: 15, m_name: "Hot White Mocha",          category: "Drink", price: 160, availability: true, description: "Espresso with creamy white chocolate sauce and steamed milk.", image_url: "" },
  { item_id: 16, m_name: "Iced White Mocha",         category: "Drink", price: 185, availability: true, description: "White chocolate espresso drink, cold and indulgent over ice.", image_url: "" },
  { item_id: 17, m_name: "Iced Seasalt Latte",       category: "Drink", price: 200, availability: true, description: "Sweet espresso latte with a savory sea salt finish, served over ice.", image_url: "" },
  { item_id: 18, m_name: "Iced Dirty Horchata",      category: "Drink", price: 200, availability: true, description: "Espresso shot poured into iced horchata — spiced, creamy, and bold.", image_url: "" },
  { item_id: 19, m_name: "Iced Biscoff Latte",       category: "Drink", price: 210, availability: true, description: "Biscoff cookie butter blended into a smooth iced espresso latte.", image_url: "" },

  // ── NON-COFFEE ──────────────────────────────────────────────────
  { item_id: 20, m_name: "Hot Matcha",               category: "Drink", price: 160, availability: true, description: "Ceremonial-grade matcha whisked with steamed milk, earthy and smooth.", image_url: "" },
  { item_id: 21, m_name: "Iced Matcha",              category: "Drink", price: 180, availability: true, description: "Vibrant matcha latte poured over ice — grassy, creamy, refreshing.", image_url: "" },
  { item_id: 22, m_name: "Iced Strawberry Milk",     category: "Drink", price: 180, availability: true, description: "Sweet strawberry syrup swirled into cold milk over ice.", image_url: "" },
  { item_id: 23, m_name: "Hot Horchata",             category: "Drink", price: 170, availability: true, description: "A warm, spiced rice milk drink with cinnamon and vanilla notes.", image_url: "" },
  { item_id: 24, m_name: "Iced Horchata",            category: "Drink", price: 190, availability: true, description: "Classic horchata served cold — creamy, sweet, and subtly spiced.", image_url: "" },
  { item_id: 25, m_name: "Iced Strawberry Matcha",   category: "Drink", price: 200, availability: true, description: "Layered strawberry milk and matcha over ice — fruity meets earthy.", image_url: "" },
  { item_id: 26, m_name: "Hot Batirol (with nuts)",  category: "Drink", price: 200, availability: true, description: "Traditional Filipino tablea hot chocolate with nuts, rich and bold.", image_url: "" },
  { item_id: 27, m_name: "Iced Batirol (with nuts)", category: "Drink", price: 220, availability: true, description: "Filipino tablea chocolate with nuts, served cold over ice.", image_url: "" },
  { item_id: 28, m_name: "Hot Choco (Ghirardelli)",  category: "Drink", price: 200, availability: true, description: "Premium Ghirardelli hot chocolate — rich, velvety, and indulgent.", image_url: "" },
  { item_id: 29, m_name: "Iced Choco (Ghirardelli)", category: "Drink", price: 220, availability: true, description: "Ghirardelli chocolate drink chilled over ice for a decadent treat.", image_url: "" },

  // ── FRAPPES ─────────────────────────────────────────────────────
  { item_id: 30, m_name: "Strawberry Kream Frappe",  category: "Drink", price: 185, availability: true, description: "Blended strawberry and cream frappe — fruity, icy, and sweet.", image_url: "" },
  { item_id: 31, m_name: "Oreo Frappe",              category: "Drink", price: 195, availability: true, description: "Cookies and cream blended into a thick, indulgent frappe.", image_url: "" },
  { item_id: 32, m_name: "Mocha Frappe",             category: "Drink", price: 200, availability: true, description: "Espresso-based mocha frappe blended smooth with chocolatey richness.", image_url: "" },
  { item_id: 33, m_name: "Karamel Frappe",           category: "Drink", price: 200, availability: true, description: "Espresso frappe swirled with caramel for a sweet, icy treat.", image_url: "" },
  { item_id: 34, m_name: "Biscoff Frappe",           category: "Drink", price: 210, availability: true, description: "Biscoff cookie butter blended into a creamy, spiced frappe.", image_url: "" },

  // ── FRUIT TEAS ──────────────────────────────────────────────────
  { item_id: 35, m_name: "Hot Peach & Passionfruit Tea",    category: "Drink", price: 100, availability: true, description: "Twinings peach and passionfruit blend, bright and aromatic.", image_url: "" },
  { item_id: 36, m_name: "Iced Peach & Passionfruit Tea",   category: "Drink", price: 160, availability: true, description: "Chilled Twinings peach and passionfruit tea over ice.", image_url: "" },
  { item_id: 37, m_name: "Hot Strawberry Mango Peach Tea",  category: "Drink", price: 100, availability: true, description: "Twinings tropical fruit blend — sweet, fruity, and warming.", image_url: "" },
  { item_id: 38, m_name: "Iced Strawberry Mango Peach Tea", category: "Drink", price: 160, availability: true, description: "Twinings tropical blend served chilled over ice.", image_url: "" },
  { item_id: 39, m_name: "Hot Passion Fruit Orange Tea",    category: "Drink", price: 100, availability: true, description: "Twinings passion fruit and orange — tangy, citrusy, and uplifting.", image_url: "" },
  { item_id: 40, m_name: "Iced Passion Fruit Orange Tea",   category: "Drink", price: 160, availability: true, description: "Tangy citrus-passion fruit Twinings tea served over ice.", image_url: "" },
  { item_id: 41, m_name: "Hot Lemon Ginger Tea",            category: "Drink", price: 100, availability: true, description: "Twinings lemon and ginger tea — zesty, warming, and soothing.", image_url: "" },
  { item_id: 42, m_name: "Iced Lemon Ginger Tea",           category: "Drink", price: 160, availability: true, description: "Refreshing Twinings lemon ginger tea chilled over ice.", image_url: "" },

  // ── PASTA ───────────────────────────────────────────────────────
  { item_id: 43, m_name: "Bacon Carbonara",          category: "Meal", price: 220, availability: true, description: "Creamy carbonara pasta loaded with smoky bacon bits.", image_url: "" },
  { item_id: 44, m_name: "Tuna Creamy Pesto",        category: "Meal", price: 220, availability: true, description: "Pesto-cream pasta tossed with savory tuna flakes.", image_url: "" },
  { item_id: 45, m_name: "Italian Hungarian",        category: "Meal", price: 220, availability: true, description: "Pasta with Hungarian sausage in a rich Italian-style tomato sauce.", image_url: "" },
  { item_id: 46, m_name: "Truffle Pasta",            category: "Meal", price: 250, availability: true, description: "Earthy truffle oil pasta — simple, elegant, and aromatic.", image_url: "" },

  // ── RICE MEALS ──────────────────────────────────────────────────
  { item_id: 47, m_name: "Hungarian Sausage Rice Meal",    category: "Meal", price: 180, availability: true, description: "Savory Hungarian sausage served with steamed rice.", image_url: "" },
  { item_id: 48, m_name: "Spam Rice Meal",                 category: "Meal", price: 180, availability: true, description: "Pan-fried Spam slices paired with a cup of steamed rice.", image_url: "" },
  { item_id: 49, m_name: "Bacon Rice Meal",                category: "Meal", price: 180, availability: true, description: "Crispy bacon strips served alongside fluffy steamed rice.", image_url: "" },
  { item_id: 50, m_name: "Corned Beef Rice Meal",          category: "Meal", price: 180, availability: true, description: "Classic Filipino corned beef sauté with steamed rice.", image_url: "" },
  { item_id: 51, m_name: "Tapa Rice Meal",                 category: "Meal", price: 220, availability: true, description: "Sweet and garlicky beef tapa served with steamed rice.", image_url: "" },
  { item_id: 52, m_name: "Fried Chicken Chops Rice Meal",  category: "Meal", price: 220, availability: true, description: "Crispy fried chicken chops served with steamed rice.", image_url: "" },
  { item_id: 53, m_name: "Chicken Parmigiana Rice Meal",   category: "Meal", price: 250, availability: true, description: "Breaded chicken in marinara and melted cheese, with steamed rice.", image_url: "" },

  // ── SNACKS ──────────────────────────────────────────────────────
  { item_id: 54, m_name: "Churros",         category: "Meal", price: 150, availability: true, description: "Golden fried churros dusted in cinnamon sugar, served with a dip.", image_url: "" },
  { item_id: 55, m_name: "Crisscut Fries",  category: "Meal", price: 150, availability: true, description: "Thick-cut crisscut fries, crispy outside and fluffy inside.", image_url: "" },
  { item_id: 56, m_name: "Cajun Fries",     category: "Meal", price: 175, availability: true, description: "Seasoned fries with a smoky Cajun spice blend.", image_url: "" },
  { item_id: 57, m_name: "Nuggets",         category: "Meal", price: 175, availability: true, description: "Tender, golden-fried chicken nuggets — a crowd-pleaser.", image_url: "" },
  { item_id: 58, m_name: "Nachos",          category: "Meal", price: 200, availability: true, description: "Tortilla chips loaded with cheese sauce and toppings.", image_url: "" },

  // ── SANDWICHES ──────────────────────────────────────────────────
  { item_id: 59, m_name: "Chicken Sandwich", category: "Meal", price: 159, availability: true, description: "Juicy chicken fillet in a soft bun with fresh toppings.", image_url: "" },
  { item_id: 60, m_name: "Spam Sandwich",    category: "Meal", price: 159, availability: true, description: "Pan-fried Spam in a toasted sandwich with your choice of toppings.", image_url: "" },
  { item_id: 61, m_name: "Bacon Sandwich",   category: "Meal", price: 159, availability: true, description: "Crispy bacon stacked in a soft toasted bun.", image_url: "" },
  { item_id: 62, m_name: "Egg Sandwich",     category: "Meal", price: 159, availability: true, description: "A classic egg sandwich — simple, filling, and satisfying.", image_url: "" },
];