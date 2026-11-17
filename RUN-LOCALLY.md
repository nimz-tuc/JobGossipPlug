# Running JobGossipPlug on your own computer (not live yet)

Everything below is typed in Git Bash. You need Node 20+ and PostgreSQL on your computer (you already have both if AssetWise runs locally).

## 1. One-time setup
```bash
node -v                                  # should say v20 or higher
psql --version                           # PostgreSQL is installed
```
Create an empty database for JobGossipPlug (type your Postgres password when asked):
```bash
psql -U postgres -c "CREATE DATABASE jobplug;"
```
(If `psql` is not found, create a database called `jobplug` in pgAdmin instead.)

Install the project's packages:
```bash
cd ~/Downloads/jobplug/backend          # wherever you extracted the zip
npm install
```
Create your settings file:
```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # prints a long random secret: copy it
notepad .env
```
In `.env` set (leave DATABASE_URL empty):
```
PORT=5001
JWT_SECRET=<paste the long secret>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jobplug
DB_USER=postgres
DB_PASSWORD=<your postgres password>
```
`PORT=5001` avoids clashing with AssetWise, which uses 5000.

## 2. Start it
```bash
npm start
```
Wait for: `Database connected and up to date.` and `JobGossipPlug running on http://localhost:5001`.
Open **http://localhost:5001** in your browser. The tables and the three starter listings are created automatically the first time.
Stop with Ctrl+C. After changing any code, stop and run `npm start` again (or use `npm run dev`, which restarts by itself).

## 3. Make yourself admin
1. On the site, Create account with your own email.
2. Back in Git Bash (stop the server with Ctrl+C first, or open a second Git Bash window):
```bash
cd ~/Downloads/jobplug/backend
npm run make-admin -- you@example.com
```
3. Refresh the site. An **Admin** tab appears.

## 4. Things to try
- Register a "student" in Kenya, then a "skilled" user in another country (use a private window): the opportunities differ.
- Admin > Edit micro1 > put any test https:// address in "YOUR referral link". The card gets the "Referral link" label and Apply opens that address.
- Admin > Edit a listing > Country rule > "Everyone except these countries" > KE. Sign in as the Kenyan student: it moves to "Not available for your profile".

## 5. Show it on your phone (optional)
Keep `npm start` running and, in a second Git Bash window, use the same tunnel tool you used for AssetWise, pointed at port 5001, for example:
```bash
cloudflared tunnel --url http://localhost:5001
```
Open the address it prints on your phone.

## Common problems
- `JWT_SECRET is missing or too short` : the secret in `.env` must be 32+ characters, and the file must be saved as `.env` (not `.env.txt`).
- `password authentication failed` : DB_PASSWORD in `.env` is wrong.
- `database "jobplug" does not exist` : run the CREATE DATABASE command in step 1.
- `EADDRINUSE` / port already in use : change PORT in `.env` (for example 5002) and start again.
- You change a file and nothing changes : restart `npm start`, then press Ctrl+F5 in the browser.

When you decide to go live, follow DEPLOY.md.
