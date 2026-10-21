# BudgetBite — Complete Project Blueprint
**Version:** 1.1  
**Last updated:** 2026-10-20  
**Project type:** BS Information Technology Final Year Project (FYP)  
**Target platform:** Mobile app (Android and iOS) built with Flutter, with an optional local FastAPI backend  
**Primary pilot area:** University of Management and Technology (UMT), Johar Town, Lahore, Pakistan  
**Cost goal:** Build and test the prototype using free tools, with no required paid API, subscription, or hosting

> **Implementation note.** The first blueprint proposed a React web front end. The delivered prototype is a **native Flutter mobile app** (offline-first, data stored on the phone) plus the existing FastAPI/SQLite backend, which is optional. The progress tracker in section 21 reflects what was actually built. Items that were planned but not built stay unticked.

---

## 1. Project Overview

**BudgetBite** is a student-focused food-budget planning and restaurant-discovery application. A student enters their monthly budget and fixed expenses. BudgetBite calculates the money realistically available for food, then helps the student plan affordable meals using dish prices, restaurant locations, ratings, and price-verification dates.

The app runs on the student's phone. It is useful without a paid API or cloud service.

### One-sentence pitch
> BudgetBite helps students plan a month of affordable meals by combining their real living budget with local dish prices and restaurant information.

### Important honesty rule
BudgetBite must never invent menu prices, ratings, reviews, distances, or availability. Every displayed value should either have a recorded source and verification date or be clearly labelled as user-submitted, estimated, or unavailable.

---

## 2. Problem Statement

Students often have limited monthly funds but need to pay rent, utilities, internet, transport, and other essentials before deciding how much they can spend on food. Restaurant discovery apps may show menus or ratings, but they do not necessarily calculate a student's remaining living budget and build a practical month-long meal plan around it.

BudgetBite addresses this by:
1. Calculating the remaining food budget after fixed expenses.
2. Converting that budget into a daily and per-meal spending target.
3. Finding suitable local restaurants and dishes from the app's permitted dataset.
4. Building an adjustable meal plan.
5. Tracking actual spending against the plan.
6. Showing sources and dates so users can judge how current the information is.

---

## 3. Goals and Objectives

### Primary objectives
- Let students enter monthly income/budget and fixed expenses.
- Calculate available monthly, daily, and per-meal food budgets.
- Maintain a searchable restaurant and dish database.
- Recommend meals that fit a user's budget, distance, and preferences.
- Build and edit a 30-day lunch/dinner plan.
- Track planned and actual food spending.
- Display restaurant ratings with their source and last-checked date.
- Make the prototype usable without paid APIs or cloud hosting.

### Secondary objectives
- Allow manual admin verification and editing of menu data.
- Accept user-submitted price updates, pending review.
- Export a meal plan or spending report to CSV.
- Provide accessible, responsive, professional UI.
- Support future expansion to other universities or cities.

### Out of scope for the initial prototype
- Food ordering, delivery, payment processing, or restaurant bookings.
- Guaranteed live menu-price synchronization.
- Guaranteed access to all Google Maps ratings/reviews.
- Scraping sites in violation of their terms.
- AI-generated prices or fabricated restaurant data.
- Paid hosting or a public production deployment.

---

## 4. Target Users and Roles

### Student
- Uses the app without an account; data stays on the phone.
- Sets budget, expenses, meals per day, distance, and preferences.
- Reviews restaurant and dish recommendations.
- Creates and edits a meal plan.
- Logs actual spending.
- Submits price corrections with evidence/source, if enabled.

### Administrator / Data Verifier
- Adds and edits restaurants, dishes, prices, and source links.
- Records the date a price or rating was checked.
- Reviews user-submitted changes before publication.
- Marks information as stale, disputed, or unavailable.

### Future restaurant owner role (optional)
- Can submit menu updates for admin verification.
- Not required for the FYP prototype.

---

## 5. Core User Journey

1. Open BudgetBite on the phone.
2. Select a monthly budget preset (PKR 20,000, 25,000, 30,000, or 40,000), or choose **Custom** and type any amount.
3. Enter fixed expenses: rent, utilities, internet, transport, other essentials, and emergency reserve.
4. Choose meals per day (one, two or three) after comparing what each would cost.
5. Set optional preferences: maximum distance, dietary restrictions, minimum restaurant rating, and maximum price per meal.
6. View the calculated food budget.
7. Browse recommended dishes and inspect source links and verification dates.
8. Generate a 30-day meal plan.
9. Replace meals that are unsuitable or too expensive.
10. Log actual spending and review whether the student is on budget.

---

## 6. Example Budget Calculation

Example only — these values are illustrative, not a claim about current living costs.

| Item | Monthly amount |
|---|---:|
| Total monthly budget | PKR 25,000 |
| Room rent | PKR 8,000 |
| Utilities and internet | PKR 2,000 |
| Transport | PKR 2,000 |
| Other essentials | PKR 2,000 |
| Emergency reserve | PKR 1,000 |
| **Available for food** | **PKR 10,000** |

Food budget per day for a 30-day month:

`10,000 / 30 = PKR 333.33`

If the student plans two meals per day:

`10,000 / (30 × 2) = PKR 166.67 per meal on average`

The app should explain that the average is a target, not a guarantee that suitable meals exist at that price.

### Monthly budget selection in the app
The budget screen presents selectable options with these presets:
- PKR 20,000
- PKR 25,000
- PKR 30,000
- PKR 40,000
- **Custom amount** — user can enter any positive monthly budget, for example PKR 18,500 or PKR 35,000.

The user must select only one option. Selecting a preset fills the monthly-budget field; selecting Custom enables a numeric input. The chosen amount is the user's **total monthly budget**, not their food-only budget. The app then subtracts the fixed expenses entered by the user and calculates the amount left for food. Never assume that a person with a PKR 40,000 total budget has PKR 40,000 available for meals.

Once the student locks the starting budget it cannot be edited. More money can be added later, and each addition is recorded. Starting over requires deleting the whole budget.

Example: if the user chooses PKR 25,000 and enters PKR 15,000 in fixed expenses, the app calculates PKR 10,000 available for food. If fixed expenses are greater than or equal to the selected budget, show a clear warning and do not generate a misleading affordable plan.

### Formula
- `available_food_budget = monthly_budget - sum(fixed_expenses)`
- `daily_food_budget = available_food_budget / days_in_plan`
- `average_meal_budget = available_food_budget / (days_in_plan × meals_per_day)`
- `remaining_budget = available_food_budget - actual_food_spending`

### Validation rules
- Amounts cannot be negative.
- Fixed expenses greater than or equal to the total budget trigger a clear warning.
- If the available food budget is zero or negative, do not generate a falsely affordable plan.
- Allow 28–31 days or a custom date range in a future version.
- Show currency as PKR by default; currency configuration is a future enhancement.

---

## 7. Functional Requirements

### FR-01: Budget setup
The user can select a monthly budget preset of PKR 20,000, 25,000, 30,000, or 40,000, or choose Custom to enter any amount. The user can also set plan length and meals per day. The selected value represents the total monthly budget before expenses.

### FR-02: Fixed expense management
The user can add, edit, and remove expense categories such as rent, utilities, internet, transport, and essentials.

### FR-03: Budget calculation
The app calculates available food budget, daily target, average meal target, and remaining amount.

### FR-04: Restaurant catalogue
The app lists restaurant name, address/area, coordinates when available, source links, and verification metadata.

### FR-05: Dish catalogue
Each dish can include name, portion/size, price, currency, menu source, verification date, and availability notes.

### FR-06: Restaurant rating display
A restaurant's overall rating can be entered manually when permitted and checked against a source. Store the rating source, review count if recorded, and checked date. Do not imply that a restaurant-level rating is a rating for a specific dish.

### FR-07: Maps link
Show a link to the restaurant's public listing or map location. Opening the link lets the user verify details at the source. A link is not permission to copy all source content.

### FR-08: Distance filtering
Filter restaurants by distance from a chosen reference point such as UMT, when coordinates are available. If route distance is not calculated, label the value as straight-line distance rather than road distance.

### FR-09: Dish recommendations
Recommend dishes using budget fit, distance, data freshness, rating threshold (if selected), and dietary filters.

### FR-10: Meal plan generation
Create a 30-day lunch/dinner plan from available dishes. Allow users to swap or remove a meal.

### FR-11: Expense tracking
Record date, meal, amount spent, optional restaurant/dish, and notes. Show planned versus actual spending.

### FR-12: Data freshness
Display a clear “last verified” date and status such as Current, Needs checking, or Unverified. Define a configurable freshness period, for example 30 days, and explain that it is an app rule rather than proof the price is current.

### FR-13: User-submitted updates
Optionally let users submit price corrections and source evidence. Keep submissions pending until reviewed.

### FR-14: Administration
Allow an admin to add/edit/archive restaurants and dishes, record data sources, and review submitted updates.

### FR-15: Search and filters
Search by restaurant/dish and filter by price, distance, cuisine/category, rating, and verification status.

### FR-16: Reports and export
Export meal plan and spending history to CSV. Optional PDF export can be added later.

### FR-17: Local persistence
Save settings, restaurants, dishes, meal plans, and expenses locally. The mobile app stores the budget on the phone; the backend uses SQLite.

### FR-18: Error handling
Show useful messages for missing data, invalid values, unavailable links, and database errors.

### FR-19: Daily reminder
At 9:00 PM show a notification if the student has not recorded the day's spending. Skip it once the day is recorded or marked "did not eat".

---

## 8. Non-Functional Requirements

- **Cost:** No paid API or subscription is required for the local prototype.
- **Performance:** Common screens should load promptly with a small-to-medium local dataset.
- **Usability:** Clear labels, readable typography, keyboard-friendly forms, and consistent navigation.
- **Reliability:** Validate inputs and use database transactions for important updates.
- **Privacy:** Keep budget and expense data on the phone by default.
- **Security:** Do not run arbitrary downloaded scripts; validate inputs and use safe database queries.
- **Maintainability:** Separate UI, business logic, and data-access layers.
- **Accessibility:** Good contrast, visible focus states, meaningful labels, and no reliance on colour alone.
- **Portability:** Support Android and iOS phones, tablets, and laptops.
- **Transparency:** Mark demo data clearly and show source and freshness metadata.

---

## 9. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Code editor | Android Studio / Visual Studio Code | Development |
| Mobile app | Flutter (Dart) | Native Android and iOS UI |
| Local storage (app) | shared_preferences | Budget and records on the phone |
| Reminders | flutter_local_notifications | 9:00 PM daily notification |
| Backend (optional) | Python + FastAPI | Vendor/menu endpoints and backups |
| Database (backend) | SQLite + SQLAlchemy | Vendor and menu storage |
| Map display | Leaflet + OpenStreetMap tiles, used under their policies | Optional, future |
| Distance | Haversine calculation | Approximate straight-line distance, future |
| Version control | Git | Track changes |
| Testing | flutter_test, pytest, manual test cases | Quality assurance |

All listed tools have free usage options. Check each project's current licence and usage terms before distribution.

---

## 10. Zero-Cost Data Strategy

A zero-cost prototype is feasible, but **zero cost does not guarantee complete, current, automatically available data for every restaurant**.

### Potential data sources
1. **OpenStreetMap**: restaurant locations and coordinates where mapped. Provide required attribution and comply with the ODbL licence. Coverage is incomplete and business details can be stale.
2. **Restaurant's own public menu or website**: use information only in ways allowed by its terms; record the source URL and date checked.
3. **Restaurant menu images shared with permission**: manually transcribe prices and retain a note about the source.
4. **Restaurant owner-provided spreadsheet/menu**: obtain permission to display and update it.
5. **Student-submitted prices**: treat as unverified until reviewed; store evidence and date.
6. **Public map listings**: provide a link so users can check the original listing. Do not assume visible ratings/reviews can be scraped, bulk-copied, or stored freely.
7. **Small hand-curated pilot dataset**: start with a manageable number of restaurants and dishes. A target such as 30–50 restaurants and 5–15 dishes each is a project goal, not a claim about verified availability.

### Data fields to record
- Restaurant name
- Address/area and coordinates if available
- Source URL
- Menu source URL or permission note
- Dish name and portion
- Price and currency
- Price checked date
- Rating and rating source, if legitimately recorded
- Review count and checked date, if legitimately recorded
- Verification status
- Data-entry notes

### Avoid these mistakes
- Do not assume Google Maps content is freely reusable just because it is visible.
- Do not scrape Foodpanda or another platform unless current terms and permissions allow the intended use.
- Do not fabricate prices, ratings, reviews, or restaurant coordinates.
- Do not show a restaurant's overall rating as a dish rating.
- Do not claim a price is current without a meaningful verification process.
- Do not rely on a public tile server for unlimited production traffic; follow its usage policy or use an appropriate permitted tile source.

### Recommended initial scope
Create a small, honest dataset for the UMT/Johar Town pilot area. Show a clear message if no verified dish fits a student's budget. A truthful “not enough verified options” message is better than invented recommendations.

---

## 11. Recommendation Algorithm

### Inputs
- Available monthly food budget
- Number of days
- Meals per day
- Maximum distance
- Minimum restaurant rating (optional)
- Dietary preferences (optional)
- Dish price, source, and verification status
- Restaurant coordinates

### Initial recommendation logic
1. Calculate the daily and average meal budgets.
2. Exclude dishes that exceed the user's per-meal cap, unless the user permits occasional higher-cost meals.
3. Exclude dishes outside the distance limit if location data is available.
4. Apply dietary filters.
5. Apply a rating filter only if a verified rating exists and the user has enabled that filter.
6. Prioritise recently verified prices over stale/unverified ones.
7. Avoid repeating the same dish too often when enough alternatives exist.
8. Estimate plan cost and compare it with the available budget.
9. If no feasible plan exists, explain why and offer adjustment options rather than pretending the plan fits.

### Suggested scoring approach
Use a transparent weighted score rather than an unexplained AI model. Example factors:
- Budget fit
- Distance
- Data freshness
- Restaurant rating (optional)
- Variety / repeat penalty

The weights should be configurable and documented. Do not let a high rating compensate for a dish being unaffordable.

### Pseudocode
```text
available = monthly_budget - fixed_expenses
if available <= 0:
    show_budget_warning()
else:
    target = available / (days * meals_per_day)
    candidates = dishes_with_verified_or_disclosed_prices()
    candidates = apply_budget_distance_and_diet_filters(candidates)
    ranked = rank_by_budget_fit_freshness_distance_and_optional_rating(candidates)
    plan = build_varied_meal_plan(ranked, days, meals_per_day)
    if plan.total_cost > available:
        show_infeasible_plan_warning()
    else:
        show_plan_with_sources_and_verification_dates(plan)
```

---

## 12. Database Design

### `users` (optional for local prototype)
- `id` — primary key
- `display_name`
- `created_at`

A single-user local prototype can omit user accounts and store one settings profile.

### `budget_profiles`
- `id`
- `monthly_budget`
- `currency`
- `plan_days`
- `meals_per_day`
- `max_distance_km` (nullable)
- `min_rating` (nullable)
- `updated_at`

### `expenses_fixed`
- `id`
- `budget_profile_id`
- `category`
- `amount`
- `notes`

### `restaurants`
- `id`
- `name`
- `address_text`
- `latitude` (nullable)
- `longitude` (nullable)
- `category`
- `maps_url` (nullable)
- `source_url` (nullable)
- `rating_value` (nullable)
- `rating_scale` (e.g. 5)
- `rating_source_url` (nullable)
- `rating_review_count` (nullable)
- `rating_checked_at` (nullable)
- `created_at`
- `updated_at`
- `is_active`

### `dishes`
- `id`
- `restaurant_id` — foreign key
- `name`
- `portion_description` (nullable)
- `price`
- `currency`
- `menu_source_url` (nullable)
- `price_checked_at` (nullable)
- `verification_status` (`verified`, `unverified`, `stale`, `disputed`)
- `dietary_tags` (stored as a related table or JSON)
- `notes`
- `is_available` (nullable/unknown when not confirmed)
- `created_at`
- `updated_at`

### `meal_plans`
- `id`
- `budget_profile_id`
- `start_date`
- `end_date`
- `created_at`
- `status`

### `meal_plan_items`
- `id`
- `meal_plan_id`
- `meal_date`
- `meal_type` (`lunch`, `dinner`, or other)
- `dish_id`
- `planned_price`
- `notes`

### `spending_entries`
- `id`
- `spent_at`
- `meal_type`
- `restaurant_id` (nullable)
- `dish_id` (nullable)
- `amount`
- `notes`

### `price_submissions` (optional)
- `id`
- `restaurant_id`
- `dish_id`
- `submitted_price`
- `source_url_or_evidence_note`
- `submitted_at`
- `review_status`
- `reviewed_at`
- `admin_notes`

### Data integrity rules
- Use foreign keys and indexes where appropriate.
- Validate prices as non-negative.
- Keep the source and check date when a price or rating is changed.
- Consider a `price_history` table if tracking historical price changes is important.
- Do not store third-party review text unless permitted.

---

## 13. API / Backend Endpoint Plan

Example local endpoints for FastAPI:

- `GET /health` — application health check
- `GET /restaurants` — list/search/filter restaurants
- `POST /restaurants` — create a restaurant (admin)
- `GET /restaurants/{id}` — restaurant details
- `PATCH /restaurants/{id}` — update restaurant (admin)
- `GET /dishes` — search/filter dishes
- `POST /dishes` — create dish (admin)
- `PATCH /dishes/{id}` — update dish and verification metadata
- `POST /budget/calculate` — calculate available budget
- `POST /recommendations` — return suitable dishes
- `POST /meal-plans/generate` — generate a meal plan
- `GET /meal-plans/{id}` — read a plan
- `POST /spending` — add an expense
- `GET /reports/spending` — summary of planned versus actual spending
- `GET /export/meal-plan.csv` — export plan
- `POST /price-submissions` — optional user price submission

For the first local prototype, a minimal number of endpoints is enough. Protect admin-changing endpoints if the app is exposed beyond localhost.

---

## 14. Suggested Project Folder Structure

```text
BudgetBite/
├── README.md
├── Start-BudgetBite.bat
├── docs/
│   ├── PROJECT_SCOPE.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_DESIGN.md
│   ├── DATA_POLICY.md
│   ├── PROGRESS.md
│   ├── ROADMAP.md
│   └── MOBILE_SETUP.md
├── backend/
│   ├── requirements.txt
│   ├── app/            # FastAPI, models, schemas
│   └── tests/
├── frontend/           # web version
└── mobile/             # Flutter app
    ├── pubspec.yaml
    ├── PHASES.md
    ├── assets/icon/
    ├── lib/
    │   ├── main.dart, app.dart
    │   ├── core/        # theme, constants, formatting
    │   ├── models/      # budget plan, rules, expenses, foods
    │   ├── services/    # storage, notifications, API, export
    │   ├── controllers/ # budget controller
    │   ├── widgets/
    │   └── screens/
    ├── test/
    ├── android/
    └── ios/
```

This is a suggested structure, not a requirement to create every file at the start. Build incrementally.

---

## 15. Professional UI / UX Specification

### Navigation
- Home (daily overview)
- Add (spending)
- Calendar
- Foods
- Budget
- Settings (from the Home screen)

### Home cards
- Food money left, with the day of the 30-day plan
- Today's spending against the daily target
- Total funds, food budget, daily target, per-meal budget
- Recent spending and a link to the receipt

### Food card
- Food name and price
- Source label (illustrative, my own price, vendor and status)
- "Within budget" or "Out of budget" marker

### Design direction
- Modern, uncluttered interface.
- Consistent spacing, typography, icon style, and button hierarchy.
- Use accessible colour contrast and visible focus states.
- Include empty states, loading states, validation messages, and error states.
- Phones first; side navigation on tablets and laptops.
- Clearly distinguish verified, unverified, and stale data.
- Never use visual polish to disguise missing or uncertain data.

### Recommended screens
1. Launch screen
2. Budget and expense setup (budget, essentials, meals per day, review)
3. Home dashboard
4. Food guide
5. Add spending
6. Calendar
7. Budget (add funds, essentials)
8. Expense receipt
9. Settings, export and reminders

---

## 16. Installation and Local Development Plan

See `docs/MOBILE_SETUP.md` for the exact steps. In short:

```bash
cd mobile
flutter pub get
dart run flutter_launcher_icons
dart run flutter_native_splash:create
flutter analyze
flutter test
flutter run
```

Optional backend:

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Important
- Initial package installation requires an internet connection, but daily use need not require paid services.
- Keep the database and personal spending records out of public repositories.
- Do not expose the development server to the public internet without security hardening.

---

## 17. Testing Plan

### Budget tests
- Budget of PKR 25,000 with fixed costs totalling PKR 15,000 leaves PKR 10,000 for food.
- Fixed expenses equal to the budget leaves zero for food and should show a warning.
- Fixed expenses above the budget must not produce a positive food budget.
- Negative budget or expense inputs must be rejected.
- Daily and per-meal averages must use the configured number of days and meals.

### Recommendation tests
- Dish below the price cap is eligible.
- Dish above the cap is excluded unless user explicitly allows flexibility.
- Dish with unknown price must not be presented as affordable.
- Restaurant outside the selected distance should be excluded when coordinates are available.
- Missing coordinates should not be shown as a precise distance.
- A stale price should be labelled stale, not silently treated as current.
- A restaurant's rating must not be copied to its dishes.
- An infeasible 30-day plan must trigger a clear warning.

### Spending tests
- Adding a spending entry updates totals.
- Editing/deleting an entry updates the summary.
- Planned and actual totals are calculated separately.
- Exported CSV matches displayed data.

### Usability and reliability
- Search returns relevant records.
- Invalid forms show understandable errors.
- Missing menu/source links do not crash the application.
- Data remains after the app is closed and reopened.
- The 9:00 PM reminder arrives on a physical device.

---

## 18. FYP Documentation Deliverables

Prepare these artifacts for the university's requirements:
1. Project proposal
2. Problem statement and motivation
3. Aim and measurable objectives
4. Scope and limitations
5. Stakeholder/user analysis
6. Software Requirements Specification (SRS)
7. Use-case diagram and use-case descriptions
8. Activity diagram for budget calculation and meal planning
9. System architecture diagram
10. ER diagram / database schema
11. UI wireframes and screenshots
12. Implementation and technology rationale
13. Test plan and test results
14. Data collection and verification methodology
15. Privacy, licensing, and ethical considerations
16. User manual and installation guide
17. Final report, presentation, and demo script

Follow the university's required template and supervisor's guidance; this blueprint is not a substitute for those requirements.

---

## 19. Privacy, Safety, and Licensing

- Keep budgets and spending records on the phone by default.
- Do not collect names, phone numbers, or precise location unless genuinely needed.
- Let users choose a reference point such as UMT rather than forcing GPS.
- If a location feature is added, explain why location is needed and offer manual selection.
- Use original or permitted data and retain source metadata.
- Follow OpenStreetMap attribution and licence requirements.
- Check current terms for third-party menus, ratings, and map platforms before copying, caching, or redistributing data.
- Add a data-source note to the project documentation.
- If later publishing the app, review all dependencies' licences and the legal basis for every dataset.

---

## 20. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Menus/prices are outdated | Display check dates, freshness status, and a correction workflow |
| Not enough public menu data | Start with a small curated pilot dataset and owner/student contributions |
| Ratings cannot be copied freely | Store only permitted data; otherwise link to the original listing |
| Student budget is too low for available options | Report infeasibility honestly and show the gap |
| OpenStreetMap coverage is incomplete | Allow manual location entry and disclose missing data |
| Scope grows too large | Prioritise budget calculator, dataset, recommendations, and meal planner first |
| Reminders delayed by phone battery savers | Ask for the needed permissions and refresh the schedule on every app start |
| User-submitted data is incorrect | Keep submissions pending and require verification before publication |

---

## 21. Phased Implementation Roadmap and Progress Tracker

**How to use the green ticks:** Keep every phase unchecked until its completion criteria have been tested. When a phase is genuinely complete, change its heading from `- [ ]` to `- [x] ✅` and record the completion date. This is a Markdown checklist, so the tick is updated manually; it does not automatically detect whether code is complete.

**Status as of 2026-10-20:** items ticked below exist in the source code. They have **not** yet been run on a physical device, and `flutter analyze` / `flutter test` still have to be run. That is why no phase heading is ticked yet. Items marked *(built in the Flutter app)* describe how the plan was delivered in the mobile app.

### Phase 1 — Requirements and design
- [ ] Confirm exact FYP scope with supervisor. *(scope is recorded in `docs/PROJECT_SCOPE.md`; supervisor sign-off is still to be confirmed)*
- [ ] Create SRS, use cases, database schema, and wireframes.
- [x] Decide the initial UMT/Johar Town pilot boundary.
- [x] Design the budget screen with PKR 20,000 / 25,000 / 30,000 / 40,000 presets and a Custom option.

**Phase 1 completion test:** Requirements and wireframes are saved, the database design is reviewed, and the budget selection flow is documented.

### Phase 2 — Core budget engine
- [x] Implement the preset budget selector and Custom amount input. *(built in the Flutter app)*
- [x] Implement fixed-expense add/edit/remove controls. *(seven fixed categories; amounts can be set, edited or cleared, in setup and later in the Budget tab)*
- [x] Calculate remaining food budget, daily target, and per-meal target.
- [x] Validate negative values, blank inputs, and expenses greater than the total budget.
- [x] Add unit tests for PKR 20,000, 25,000, 30,000, 40,000, and a custom value. *(written in `mobile/test/budget_logic_test.dart`; not yet run)*

**Phase 2 completion test:** Changing the preset or custom amount updates the calculations correctly, and all budget validation tests pass.

### Phase 3 — Local data management
- [x] Create SQLite tables. *(vendors and menu items in the backend)*
- [ ] Build restaurant/dish add, view, edit, and archive screens.
- [ ] Add source URLs, verification dates, and status fields. *(vendor/menu status exists in the backend; no dates or source URLs yet)*
- [ ] Import a small, clearly documented sample dataset.
- [ ] Confirm data remains after closing and reopening the app. *(saving is implemented; needs checking on a device)*

**Phase 3 completion test:** A restaurant and dish can be saved, edited, retrieved after restart, and shown with source/freshness details.

### Phase 4 — Search and recommendations
- [x] Add dish/restaurant search and price filters. *(food guide search plus Within-budget / Out-of-budget filters)*
- [ ] Add distance calculation where coordinates exist.
- [ ] Add transparent ranking and optional dietary filters.
- [ ] Label missing, stale, and unverified data clearly. *(source labels exist: illustrative, my own price, vendor status; stale/missing handling not built)*
- [x] Ensure recommendations never exceed the selected per-meal cap unless clearly labelled as over-budget alternatives. *(over-cap foods are marked "Out of budget")*

**Phase 4 completion test:** Search and filters return expected results on a documented test dataset, with no invented prices or ratings.

### Phase 5 — Meal planning and tracking
- [ ] Generate an editable 30-day plan.
- [ ] Allow a user to swap or remove a planned meal.
- [x] Record actual spending for each meal. *(several entries per day, plus other spending)*
- [x] Show planned-versus-actual spending and remaining budget. *(daily target vs actual, calendar markers, receipt)*
- [x] Warn when available dishes cannot realistically fit the target budget. *(1/2/3-meal comparison shows Comfortable / Tight / Over budget)*

**Phase 5 completion test:** The plan can be generated and edited, spending entries change the totals correctly, and insufficient data/budget produces an honest warning.

### Phase 6 — Polish, testing, and documentation
- [x] Improve UI consistency, accessibility, and responsiveness. *(consistent theme, labels and icons beside colours, phone and tablet layouts; formal accessibility review still to do)*
- [x] Add error, empty, loading, and validation states.
- [ ] Test calculations, search, persistence, and edge cases. *(tests written, not yet run)*
- [ ] Complete screenshots, diagrams, test evidence, and presentation.
- [x] Write the installation guide and final user manual. *(installation guide: `docs/MOBILE_SETUP.md`; user manual still to write)*
- [ ] Run a complete demo from a fresh app start.

**Phase 6 completion test:** The app runs using the documented steps, the critical test cases pass, and the FYP demo and documents are ready.

### Extra features delivered in the Flutter app (not in the original plan)
- [x] Locked starting budget, "add funds" with history, and delete-everything-to-restart with typed confirmation.
- [x] Side-by-side comparison of 1, 2 and 3 meals a day with the cost of one day.
- [x] Spending calendar with month and year navigation and a 30-day plan window.
- [x] Expense receipt with running balance and CSV export.
- [x] 9:00 PM native reminder for Android and iOS, skipped once the day is recorded.
- [x] Branded five-second launch screen and a new logo.

### Overall progress
- [ ] **MVP complete:** Phases 1–4 are checked and the core budget, data, and search flow works.
- [ ] **Full prototype complete:** Phases 1–6 are checked and meal planning, spending tracking, testing, and documentation work.

### MVP priority
For the first demonstrable version, build only:
1. Budget setup, including the four preset amounts and Custom input
2. Fixed-expense management and budget calculations
3. Restaurant/dish database
4. Dish search and budget filtering
5. Basic 30-day meal plan
6. Source and price verification dates

Add maps, community submissions, advanced analytics, and installer packaging after the MVP works.

---

## 22. Definition of Done

The first version is ready to demonstrate when:
- A student can enter a monthly budget and expenses.
- The food budget is calculated correctly and tested.
- The app can search a local restaurant/dish dataset.
- Recommendations respect the selected price cap and available data.
- A meal plan can be generated and edited.
- Spending can be logged and summarised.
- Source links and price-check dates are visible.
- Missing, stale, or insufficient data is handled honestly.
- The app works locally after setup without paid API credentials.
- Documentation and demo test cases are available.

---

## 23. Cost Summary

| Item | Expected cost for local prototype |
|---|---:|
| Flutter and Dart | PKR 0 |
| Python + FastAPI (optional backend) | PKR 0 |
| SQLite | PKR 0 |
| Android Studio / VS Code / Git | PKR 0 |
| Local development and testing | PKR 0 |
| Paid APIs | Not required |
| Cloud hosting | Not required for the local prototype |
| Apple Developer / Google Play accounts | Only if publishing to the stores |
| Data collection | Can start at PKR 0 using permitted sources and manual verification |

**Important:** “PKR 0” describes the planned software/tool spend for a local prototype, not a guarantee that all data is free, complete, or legally reusable. Internet/electricity costs and any optional future hosting are outside this estimate. Running on a physical iPhone requires a Mac.

---

## 24. Official Resources

Check current documentation, terms, and licences before implementation:

- Flutter: https://flutter.dev/
- Dart: https://dart.dev/
- flutter_local_notifications: https://pub.dev/packages/flutter_local_notifications
- Python: https://www.python.org/
- FastAPI: https://fastapi.tiangolo.com/
- SQLite: https://www.sqlite.org/
- SQLAlchemy: https://www.sqlalchemy.org/
- Leaflet: https://leafletjs.com/
- OpenStreetMap copyright and licence: https://www.openstreetmap.org/copyright
- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- Visual Studio Code: https://code.visualstudio.com/
- Git: https://git-scm.com/

---

## 25. Final Recommendation

Build **BudgetBite as a local-first student budgeting and meal-planning application**, not as a clone of a restaurant directory. Its strongest practical value is calculating the student's actual food allowance after fixed expenses and producing a transparent, editable meal plan from verified local dish data.

Keep the first release small, honest, and demonstrably functional. A well-tested prototype with a small verified dataset is stronger than a large-looking app filled with unverified prices.

**Project name:** BudgetBite  
**Suggested tagline:** *Eat smarter. Spend within your budget.*  
**Primary differentiator:** Whole-month student budget calculation + dish-level affordability + source transparency + meal planning.