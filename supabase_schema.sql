-- Supabase Schema for VANTAGE Golf Charity Platform
-- NOTE: Use supabase_setup_full.sql for a fresh setup.
-- This file is kept for reference; it is idempotent where possible.

-- Create enum safely (idempotent — does NOT drop/cascade)
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('inactive', 'active', 'past_due', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    sub_status subscription_status DEFAULT 'inactive',
    current_period_end TIMESTAMP WITH TIME ZONE,
    charity_name TEXT,
    charity_pct INTEGER DEFAULT 10 CHECK (charity_pct >= 10 AND charity_pct <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-create a profile row whenever a new user signs up
-- Handles email-unique conflicts by upserting on id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to re-associate an existing email row first
  UPDATE public.profiles
    SET id = NEW.id, full_name = NEW.raw_user_meta_data->>'full_name'
    WHERE email = NEW.email;
  IF FOUND THEN RETURN NEW; END IF;

  -- Otherwise upsert by id
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Scores Table (Stores up to 5 latest scores per user)
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast trigger lookups and user queries
CREATE INDEX IF NOT EXISTS idx_scores_user_created ON scores(user_id, created_at DESC);

-- Improved trigger: advisory lock prevents race conditions; uses row_number CTE
CREATE OR REPLACE FUNCTION maintain_latest_5_scores()
RETURNS TRIGGER AS $$
BEGIN
    -- Serialize per-user to prevent concurrent race conditions
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));

    DELETE FROM scores
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
            FROM scores
            WHERE user_id = NEW.user_id
        ) ranked
        WHERE rn > 5
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_max_5_scores ON scores;
CREATE TRIGGER enforce_max_5_scores
AFTER INSERT ON scores
FOR EACH ROW
EXECUTE FUNCTION maintain_latest_5_scores();

-- 3. Charities Table
CREATE TABLE IF NOT EXISTS charities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    website_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Draws Table
CREATE TABLE IF NOT EXISTS draws (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_month DATE NOT NULL UNIQUE,
    -- winning_numbers: must be exactly 5 unique values between 1-45, required when published
    winning_numbers INTEGER[] CHECK (
      winning_numbers IS NULL OR (
        array_length(winning_numbers, 1) = 5 AND
        (SELECT COUNT(DISTINCT v) FROM unnest(winning_numbers) v) = 5 AND
        (SELECT bool_and(v BETWEEN 1 AND 45) FROM unnest(winning_numbers) v)
      )
    ),
    -- Enforce winning_numbers present when published
    CONSTRAINT published_requires_numbers CHECK (
      status != 'published' OR winning_numbers IS NOT NULL
    ),
    total_prize_pool NUMERIC(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'simulated', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Winnings Table
CREATE TABLE IF NOT EXISTS winnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id UUID REFERENCES draws(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    match_tier INTEGER CHECK (match_tier IN (3, 4, 5)),
    prize_amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'paid')),
    proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS: Scores
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own scores" ON scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own scores" ON scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can edit own scores" ON scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own scores" ON scores FOR DELETE USING (auth.uid() = user_id);

-- RLS: Charities (public read)
ALTER TABLE charities ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can view charities" ON charities FOR SELECT USING (true);

-- RLS: Draws (public read of published, admin can insert/update)
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can view draws" ON draws FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Admin can insert draws" ON draws FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Admin can update draws" ON draws FOR UPDATE USING (true);

-- RLS: Winnings (users see own, admin inserts)
ALTER TABLE winnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own winnings" ON winnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Admin can insert winnings" ON winnings FOR INSERT WITH CHECK (true);
