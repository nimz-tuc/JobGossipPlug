# Deploying JobGossipPlug (GitHub + Render), step by step

Use a NEW GitHub repository, a NEW Render Postgres database and a NEW Render web service. Do not reuse AssetWise's.

## 1. Put it on GitHub (Git Bash)
```bash
cd ~/Downloads/jobplug          # the folder that contains backend/, js/, css/, index.html
git init -b main
git add .
git status                      # must NOT list .env or node_modules
git commit -m "JobGossipPlug v1"
# create an empty repo named jobplug on github.com first, then:
git remote add origin https://github.com/YOUR-USERNAME/jobplug.git
git push -u origin main
```

## 2. Database on Render
New + > PostgreSQL > name `jobplug-db` > Create. Copy its **Internal Database URL**.

## 3. Web service on Render
New + > Web Service > pick the `jobplug` repo.
- Build Command: `cd backend && npm install`
- Start Command: `cd backend && npm start`
- Environment variables:
  - `NODE_ENV` = `production`
  - `TRUST_PROXY` = `1`
  - `JWT_SECRET` = 32+ random characters (required)
  - `DATABASE_URL` = the Internal Database URL from step 2
  - `SUPPORT_EMAIL` = your contact email (optional, shown on the privacy page)
Create. Wait for the log lines `Database connected and up to date.` and `JobGossipPlug running`.

## 4. Become admin
1. Open your site, Create account (use your own email).
2. In Render > Environment, add `ADMIN_EMAIL` = that same email. Save (it redeploys).
3. The log shows `ADMIN_EMAIL: ... is now an admin`. Then DELETE the `ADMIN_EMAIL` variable.
4. Reload the site: an **Admin** tab appears.

## 5. Add your real referral links
Admin > Edit each company > paste YOUR referral link (from that company's own referral/affiliate page) > set country rules you have verified > set "Rules last checked" > Save.
Leave the referral link empty where you have none. The "Referral link" label only appears when it is filled.

## Updating later
Replace the changed files, then `git add . && git commit -m "..." && git push origin main`. Render redeploys by itself.
