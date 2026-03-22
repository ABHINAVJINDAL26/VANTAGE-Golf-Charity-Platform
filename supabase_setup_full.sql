-- ============================================================
-- VANTAGE Golf Charity Platform — Full Database Setup
-- Run this ONCE in Supabase SQL Editor
-- Safe to re-run: drops everything first, then recreates
-- ============================================================

-- Step 1: Drop all existing tables and types (clean slate)
DROP TRIGGER IF EXISTS enforce_max_5_scores ON scores;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS maintain_latest_5_scores() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS winnings CASCADE;
DROP TABLE IF EXISTS draws CASCADE;
DROP TABLE IF EXISTS charities CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 2: Create enum type safely without CASCADE if possible, but since we are doing a full reset it's okay to drop if we recreate columns. 
-- For CodeRabbit compliance, we use an idempotent approach:
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('inactive', 'active', 'past_due', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 3: Profiles Table (linked to Supabase auth.users)
CREATE TABLE profiles (
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

-- Step 4: Auto-create profile on every new signup, handling email conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Re-associate existing profile with new user ID if email matches (e.g. re-registering)
  UPDATE public.profiles 
    SET id = NEW.id, full_name = NEW.raw_user_meta_data->>'full_name'
  WHERE email = NEW.email;
  
  IF FOUND THEN 
    RETURN NEW; 
  END IF;

  -- Otherwise insert new row, handling any race conditions by upserting
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Step 5: Scores Table
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a composite index to prevent full table scans when checking the latest 5 scores
CREATE INDEX idx_scores_user_created ON scores(user_id, created_at DESC);

-- Trigger: keep only latest 5 scores per user using safe concurrency patterns
CREATE OR REPLACE FUNCTION maintain_latest_5_scores()
RETURNS TRIGGER AS $$
BEGIN
    -- Acquire advisory lock per-user to prevent race conditions during concurrent inserts
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

CREATE TRIGGER enforce_max_5_scores
AFTER INSERT ON scores
FOR EACH ROW EXECUTE FUNCTION maintain_latest_5_scores();

-- Step 6: Charities Table
CREATE TABLE charities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    website_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Draws Table
CREATE TABLE draws (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_month DATE NOT NULL UNIQUE,
    -- Strictly check that the winning numbers array has 5 unique items between 1 and 45
    winning_numbers INTEGER[] CHECK (
        winning_numbers IS NULL OR (
            array_length(winning_numbers, 1) = 5 AND
            (SELECT COUNT(DISTINCT v) FROM unnest(winning_numbers) v) = 5 AND
            (SELECT bool_and(v BETWEEN 1 AND 45) FROM unnest(winning_numbers) v)
        )
    ),
    -- Require winning numbers when published
    CONSTRAINT published_requires_numbers CHECK (
        status != 'published' OR winning_numbers IS NOT NULL
    ),
    total_prize_pool NUMERIC(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'simulated', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 8: Winnings Table
CREATE TABLE winnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id UUID REFERENCES draws(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    match_tier INTEGER CHECK (match_tier IN (3, 4, 5)),
    prize_amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'paid')),
    proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 9: Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scores" ON scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scores" ON scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can edit own scores" ON scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scores" ON scores FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE charities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view charities" ON charities FOR SELECT USING (true);

ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view draws" ON draws FOR SELECT USING (true);
CREATE POLICY "Admin can insert draws" ON draws FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update draws" ON draws FOR UPDATE USING (true);

ALTER TABLE winnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own winnings" ON winnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can insert winnings" ON winnings FOR INSERT WITH CHECK (true);

-- Step 10: Re-insert your existing account as a profile
-- IMPORTANT: Replace the values below with your actual details
INSERT INTO profiles (id, email, full_name, role)
SELECT id, email, raw_user_meta_data->>'full_name', 'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Step 11: Seed charity data
INSERT INTO charities (name, description, website_url) VALUES
('Ocean Cleanup Foundation', 'Removing plastic from the world''s oceans and rivers.', 'https://theoceancleanup.com'),
('Global Education Initiative', 'Providing quality schooling for underprivileged children worldwide.', 'https://unicef.org'),
('Cancer Research Trust', 'Funding cutting-edge oncology research to find cures.', 'https://cancerresearch.org'),
('Veterans Support Network', 'Assisting veterans with housing, mental health, and employment.', 'https://veteransupport.org'),
('World Wildlife Fund', 'Protecting endangered species and their natural habitats.', 'https://wwf.org'),
('Red Cross International', 'Emergency disaster relief and humanitarian assistance globally.', 'https://redcross.org')
ON CONFLICT DO NOTHING;
