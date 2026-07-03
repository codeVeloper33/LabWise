# LabWise — Virtual Physics Laboratory

A complete virtual physics laboratory for Nigerian secondary school
students preparing for WAEC and NECO practical examinations.

---

## Project Structure

```
labwise3/
├── backend/
│   ├── app/
│   │   ├── core/         config.py, security.py
│   │   ├── database/     base.py, connection.py
│   │   ├── models/       user, verification, experiment, session, reading, subscription
│   │   ├── physics/      formulas.py (error simulation + calculations)
│   │   ├── services/     tier, question, session, report, flutterwave
│   │   ├── routers/      auth, experiments, sessions, users, subscriptions
│   │   ├── mail/         mailer.py
│   │   ├── utils/        helpers.py
│   │   └── main.py       app factory + experiment seed data
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── pages/            all HTML pages
│   ├── css/              all stylesheets
│   └── js/
│       ├── utils/        storage.js, validator.js, router.js
│       ├── api/          authApi.js, experimentApi.js, userApi.js, subscriptionApi.js
│       ├── experiments/  pendulum.js, hookesLaw.js, moments.js
│       └── ui/           sidebar.js, dashboard.js, experiments.js, results.js,
│                         account.js, settings.js, upgrade.js,
│                         create-experiment.js, lab.js, graph.js, report.js
└── database/
    └── schema.sql
```

---

## Setup

### 1. PostgreSQL

Install PostgreSQL (any version). Open psql and run:

```sql
CREATE DATABASE labwise3;
\q
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Edit `.env` with your credentials:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/labwise3
JWT_SECRET_KEY=any-long-random-string

# Gmail (create an App Password at myaccount.google.com/apppasswords)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com

# Flutterwave (get test keys from dashboard.flutterwave.com → Settings → API)
FLW_SECRET_KEY=FLWSECK_TEST-...
FLW_PUBLIC_KEY=FLWPUBK_TEST-...
FLW_WEBHOOK_HASH=choose-any-secret-string-here
```

Start the server:

```bash
python -m app.main
```

You should see:
```
✅ Database tables created
✅ Experiments seeded
 * Running on http://127.0.0.1:5000
```

Test it:
```
http://localhost:5000
→ {"status": "LabWise API v3 ✅", "version": "3.0.0"}
```

### 3. Frontend

Open a second terminal:

```bash
cd frontend
python -m http.server 3000
```

Open your browser:
```
http://localhost:3000/pages/index.html
```

---

## Full User Flow

| Step | Page | What happens |
|---|---|---|
| 1 | `index.html` | Landing page — sign up |
| 2 | `signup.html` | Create account |
| 3 | `verify.html` | Enter 6-digit email code |
| 4 | `dashboard.html` | Home — see experiments |
| 5 | `create-experiment.html` | Choose experiment, set parameters |
| 6 | `create-experiment.html` | Review auto-generated WAEC question |
| 7 | `lab.html` | Run the experiment — simulation + data table |
| 8 | `graph.html` | Auto-plotted graph with best-fit line |
| 9 | `report.html` | Full WAEC-style report (paid tiers only) |

---

## Tier Limits

| Feature | Free | Tier 1 ₦500 | Tier 2 ₦1500 | Tier 3 ₦3000 |
|---|---|---|---|---|
| Experiments | Pendulum only | All 3 | All 3 | All 3 |
| Max length | 50 cm | 100 cm | 150 cm | 200 cm |
| Max mass | 50 g | 200 g | 350 g | 500 g |
| Trials | 3 | 5 | 8 | Unlimited |
| Sessions/month | 2 | 10 | 30 | Unlimited |
| Report | ❌ | ✅ | ✅ | ✅ |
| PDF export | ❌ | ❌ | ❌ | ✅ |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/signup | No | Register |
| POST | /api/auth/verify | No | Verify email |
| POST | /api/auth/login | No | Login |
| GET | /api/experiments/ | Yes | List experiments |
| POST | /api/sessions/ | Yes | Start session |
| POST | /api/sessions/:id/readings | Yes | Record reading |
| DELETE | /api/sessions/:id/readings/last | Yes | Undo |
| POST | /api/sessions/:id/finalize | Yes | Compute result |
| GET | /api/users/me | Yes | Profile + tier |
| GET | /api/subscriptions/plans | No | Pricing |
| POST | /api/subscriptions/initialize | Yes | Start payment |
| GET | /api/subscriptions/verify/:ref | Yes | Confirm payment |

---

## Deploying Online

**Backend → Render.com (free)**
1. Push `backend/` to GitHub
2. Create a Web Service on render.com
3. Build command: `pip install -r requirements.txt`
4. Start command: `python -m app.main`
5. Add a PostgreSQL database on Render, copy the `DATABASE_URL`
6. Add all other env vars in Render's dashboard

**Frontend → Netlify (free)**
1. In all `js/api/*.js` files, change:
   ```js
   const BASE = 'http://localhost:5000/api/...';
   ```
   to your Render URL:
   ```js
   const BASE = 'https://labwise-api.onrender.com/api/...';
   ```
2. Drag and drop the `frontend/` folder to netlify.com/drop

---

## Built for WAEC & NECO Students 🇳🇬
