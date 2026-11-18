# JobGossipPlug

Matches visitors to AI-training and expert-work opportunities (Mercor, micro1, AfterQuery to start) based on their country and
experience, and sends them out through a tracked Apply button. Where YOU have a personal referral link from a company, the card is
clearly labelled "Referral link" and the visitor is told you may earn a reward.

## How it works
- Sign-up asks: country, "student / starting out" or "skilled", and fields of interest.
- Student profiles see the approved starter opportunities: the undergrad opportunity, AI Conversation Evaluator, micro1 Generalist, and Mercor Application Users roles. Skilled profiles can see both entry-level and skilled roles, subject to country rules.
- Press Apply: the server re-checks the rules, counts the click, and returns your referral link (or the company's normal page if you have none).
- Referral links never appear in the page source; visitors only get one when they press Apply.

## Run it on your computer
See RUN-LOCALLY.md (step by step for Git Bash).

## Deploy on Render
See DEPLOY.md (use a NEW Postgres database and a NEW web service, separate from AssetWise).
Environment variables: `JWT_SECRET`, `DATABASE_URL`, `NODE_ENV=production`, `TRUST_PROXY=1`, optional `SUPPORT_EMAIL`.

## Before you go live
- Add YOUR referral link to each company in Admin (only where the company gave you one). Leave it empty otherwise.
- Read each company's referral terms (several require a clear disclosure, ban paid ads, or forbid calling it "employment").
- Check each company's country rules and set them in Admin. The starter data has none, on purpose: do not guess.
