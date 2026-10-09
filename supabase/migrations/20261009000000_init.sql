-- Wavo MVP: Content Rewards
-- Montos en unidades mínimas del token (bigint). Nunca floats.

create extension if not exists pgcrypto;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '',
  brand_name text not null default '',
  platform text not null default 'any' check (platform in ('any', 'tiktok', 'instagram', 'youtube')),
  rules text not null default '',
  budget bigint not null check (budget > 0),
  cpm bigint not null check (cpm > 0),
  max_reward bigint not null default 0 check (max_reward >= 0),
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  contract_campaign_id text unique check (contract_campaign_id ~ '^[0-9]{1,19}$'),
  token_address text,
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  stellar_address text not null check (stellar_address ~ '^G[A-Z2-7]{55}$'),
  joined_at timestamptz not null default now(),
  unique (campaign_id, stellar_address)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  content_url text not null,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube')),
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'approved', 'paid', 'rejected')),
  verified_views bigint not null default 0 check (verified_views >= 0),
  rewarded_views bigint not null default 0 check (rewarded_views >= 0),
  pending_reward bigint not null default 0 check (pending_reward >= 0),
  created_at timestamptz not null default now(),
  unique (campaign_id, content_url),
  check (rewarded_views <= verified_views)
);

create table if not exists public.reward_distributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  reward_id text not null unique check (reward_id ~ '^[0-9a-f]{64}$'),
  amount bigint not null check (amount > 0),
  views_from bigint not null check (views_from >= 0),
  views_to bigint not null check (views_to > views_from),
  tx_hash text unique,
  status text not null default 'reserved'
    check (status in ('reserved', 'submitted', 'paid', 'failed', 'cancelled')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'paid' or tx_hash is not null)
);

create index if not exists idx_participants_campaign on public.participants(campaign_id);
create index if not exists idx_submissions_campaign on public.submissions(campaign_id);
create index if not exists idx_distributions_campaign on public.reward_distributions(campaign_id);
create index if not exists idx_distributions_submission on public.reward_distributions(submission_id);

-- RLS activado sin políticas: solo el backend (service role) accede a los datos.
alter table public.campaigns enable row level security;
alter table public.participants enable row level security;
alter table public.submissions enable row level security;
alter table public.reward_distributions enable row level security;

-- Reserva atómica de una recompensa aprobada.
-- Bloquea campaña y envío, verifica el snapshot de vistas, presupuesto disponible
-- y tope por creador. Nunca prorratea: si no alcanza, falla.
create or replace function public.wavo_reserve_reward(
  p_submission_id uuid,
  p_reward_id text,
  p_amount bigint,
  p_views_from bigint,
  p_views_to bigint
) returns public.reward_distributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.submissions;
  v_campaign public.campaigns;
  v_committed bigint;
  v_creator_committed bigint;
  v_row public.reward_distributions;
begin
  select * into v_row from public.reward_distributions where reward_id = p_reward_id;
  if found then
    return v_row; -- idempotente
  end if;

  select * into v_sub from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'submission_not_found'; end if;

  select * into v_campaign from public.campaigns where id = v_sub.campaign_id for update;
  if v_campaign.status <> 'active' then raise exception 'campaign_not_active'; end if;

  if v_sub.rewarded_views <> p_views_from or v_sub.verified_views <> p_views_to then
    raise exception 'stale_snapshot';
  end if;

  select coalesce(sum(amount), 0) into v_committed
    from public.reward_distributions
    where campaign_id = v_campaign.id and status in ('reserved', 'submitted', 'failed', 'paid');
  if v_campaign.budget - v_committed < p_amount then
    raise exception 'insufficient_budget';
  end if;

  if v_campaign.max_reward > 0 then
    select coalesce(sum(amount), 0) into v_creator_committed
      from public.reward_distributions
      where campaign_id = v_campaign.id
        and participant_id = v_sub.participant_id
        and status in ('reserved', 'submitted', 'failed', 'paid');
    if v_creator_committed + p_amount > v_campaign.max_reward then
      raise exception 'max_reward_exceeded';
    end if;
  end if;

  insert into public.reward_distributions
    (campaign_id, submission_id, participant_id, reward_id, amount, views_from, views_to, status)
  values
    (v_campaign.id, v_sub.id, v_sub.participant_id, p_reward_id, p_amount, p_views_from, p_views_to, 'reserved')
  returning * into v_row;

  update public.submissions
    set rewarded_views = p_views_to, pending_reward = 0, status = 'approved'
    where id = v_sub.id;

  return v_row;
end;
$$;

-- Libera una reserva no pagada y devuelve el snapshot de vistas del envío.
create or replace function public.wavo_cancel_reward(p_distribution_id uuid)
returns public.reward_distributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.reward_distributions;
begin
  select * into v_row from public.reward_distributions where id = p_distribution_id for update;
  if not found then raise exception 'distribution_not_found'; end if;
  if v_row.status not in ('reserved', 'failed') then
    raise exception 'distribution_not_cancellable';
  end if;

  update public.reward_distributions
    set status = 'cancelled', updated_at = now()
    where id = v_row.id
    returning * into v_row;

  update public.submissions
    set rewarded_views = v_row.views_from, status = 'verified'
    where id = v_row.submission_id and rewarded_views = v_row.views_to;

  return v_row;
end;
$$;

revoke all on function public.wavo_reserve_reward(uuid, text, bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.wavo_cancel_reward(uuid) from public, anon, authenticated;
grant execute on function public.wavo_reserve_reward(uuid, text, bigint, bigint, bigint) to service_role;
grant execute on function public.wavo_cancel_reward(uuid) to service_role;
