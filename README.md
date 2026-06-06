# Crochet Shop

A lightweight Next.js storefront for a crochet shop.

It runs with either:

- `COMMERCE_PROVIDER=local` for built-in sample data
- `COMMERCE_PROVIDER=supabase` for your own Supabase catalog

## Run locally

```bash
pnpm install
pnpm dev
```

## Production-like run

```bash
pnpm build
NODE_ENV=production pnpm start
```

## Supabase seeding

Seeding means inserting starter rows into the database so the storefront has content to show.

This repo includes:

- `supabase/init.sql` to create tables
- `supabase/seed.sql` to add sample products, collections, pages, and menus

Run them in the Supabase SQL editor, or with the CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db query supabase/init.sql
supabase db query supabase/seed.sql
```

`supabase/init.sql` now also creates an `orders` table used by the UPI checkout flow.

## Env vars

Use `.env.local` with these values when you want Supabase:

```bash
COMMERCE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
COMMERCE_REVALIDATION_SECRET=YOUR_RANDOM_SECRET
SITE_URL=http://localhost:3000
```

If you want to skip Supabase while testing the app, set `COMMERCE_PROVIDER=local`.

## Admin dashboard

There is a minimal admin UI at `/admin` that lets you create products, collections, and pages.

Protect it by setting `ADMIN_PASSWORD` in `.env.local`. The admin page sends the password to server endpoints which validate it before writing to Supabase.

Use this workflow when testing:

```bash
# set ADMIN_PASSWORD in .env.local
pnpm dev
# open http://localhost:3000/admin
```

## UPI checkout

This project now redirects checkout to a UPI payment page at `/upi-checkout`.

Set these in `.env.local`:

```bash
UPI_VPA=yourname@bank
UPI_PAYEE_NAME="Your Shop Name"
UPI_TRANSACTION_NOTE="Order payment"
```

Flow:

- User clicks checkout in cart
- App creates a pending order in Supabase (if Supabase env is configured)
- App opens `/upi-checkout` with the cart total and order ID
- User pays via UPI app deep-link or QR

Order confirmation:

- Open `/admin`
- Click `Load data`
- In `Orders`, mark the order paid/pending/cancelled after manual verification

Note: this is a manual confirmation flow. For automatic payment verification and order status updates, add a payment gateway webhook flow later.

## Craft price estimator

There is a standalone Python script in `tools/price_estimator.py` that uses a remote Ollama server for image analysis and a web search pass for rough market context.

Install the Python dependencies on the machine where you want to run it:

```bash
pip install -r tools/requirements-price-estimator.txt
```

Set the Ollama host to your remote machine:

```bash
export OLLAMA_HOST=http://192.168.0.102:11434
```

Then run it like this:

```bash
python tools/price_estimator.py /path/to/image.jpg "12 cm tall"
```

If your remote Ollama host uses different model names, override them with `VISION_MODEL` and `TEXT_MODEL`.

## Docker for the price estimator

You can also run the estimator in Docker so you do not need to install Python packages on the host.

Build the image:

```bash
docker compose -f docker-compose.price-estimator.yml build
```

Run it against an image on your machine:

```bash
docker compose -f docker-compose.price-estimator.yml run --name price-estimator estimator /workspace/path/to/image.jpg "12 cm tall"
```

If you want to watch the output, keep the container name and follow its logs:

```bash
docker logs -f price-estimator
```

The container already points to `http://192.168.0.102:11434` for Ollama. Change `OLLAMA_HOST` in `docker-compose.price-estimator.yml` if the model server moves.
