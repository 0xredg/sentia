create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  demo_source_id integer unique,
  requester_name text not null,
  title text not null,
  prompt text not null,
  task_type text not null,
  input_payload jsonb not null default '{}',
  response_schema jsonb not null default '{}',
  reward_token text not null default 'WLD',
  reward_amount numeric not null,
  max_responses integer not null default 1,
  status text not null default 'open',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check
    check (status in ('draft', 'open', 'closed', 'expired')),
  constraint tasks_task_type_check
    check (
      task_type in (
        'sentiment_judgment',
        'content_safety',
        'qualitative_feedback',
        'one_human_decision'
      )
    )
);

create index if not exists tasks_status_created_at_idx
  on public.tasks(status, created_at);

create index if not exists tasks_task_type_idx
  on public.tasks(task_type);

create table if not exists public.task_responses (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  answer_payload jsonb not null,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  constraint task_responses_status_check
    check (status in ('accepted', 'rejected', 'flagged')),
  unique (task_id, user_id)
);

create index if not exists task_responses_user_id_idx
  on public.task_responses(user_id);

create table if not exists public.earnings_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  task_response_id uuid references public.task_responses(id) on delete set null,
  token text not null default 'WLD',
  amount numeric not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint earnings_ledger_status_check
    check (status in ('pending', 'processing', 'paid', 'failed', 'blocked'))
);

create index if not exists earnings_ledger_user_id_idx
  on public.earnings_ledger(user_id);

create index if not exists earnings_ledger_status_idx
  on public.earnings_ledger(status);

alter table public.tasks enable row level security;
alter table public.task_responses enable row level security;
alter table public.earnings_ledger enable row level security;

insert into public.tasks (
  demo_source_id,
  requester_name,
  title,
  prompt,
  task_type,
  input_payload,
  response_schema,
  reward_amount,
  max_responses,
  status
)
values
  (
    1,
    'eBay',
    'Check marketplace listing photo',
    'Is this listing photo misleading?',
    'content_safety',
    jsonb_build_object(
      'company', 'eBay',
      'content_idea', 'Marketplace listing photo showing a luxury handbag on a plain background with small defects hidden by lighting.',
      'image_path', '/demo/feed-cards/images/1_ebay.png',
      'why_human', 'Humans notice visual context and seller intent that automated checks often miss.'
    ),
    jsonb_build_object(
      'type', 'thumbs',
      'options', jsonb_build_array('thumbs_up', 'thumbs_down')
    ),
    0.01,
    100,
    'open'
  ),
  (
    11,
    'Reddit',
    'Classify meme moderation edge case',
    'Is the joke hateful or just edgy?',
    'content_safety',
    jsonb_build_object(
      'company', 'Reddit',
      'content_idea', 'Meme image using a stereotype-adjacent joke and reaction face.',
      'image_path', '/demo/feed-cards/images/11_reddit.png',
      'why_human', 'Humor moderation needs cultural and contextual reading.'
    ),
    jsonb_build_object(
      'type', 'choice_text',
      'options', jsonb_build_array('Hateful', 'Edgy', 'Unclear')
    ),
    0.01,
    100,
    'open'
  ),
  (
    27,
    'Notion',
    'Choose the stronger logo concept',
    'Which logo is more memorable?',
    'qualitative_feedback',
    jsonb_build_object(
      'company', 'Notion',
      'content_idea', 'Two logo concepts for a privacy-first notes app shown side by side on a phone mockup.',
      'image_path', '/demo/feed-cards/images/27_notion.png',
      'why_human', 'Brand recall is a fast human preference signal.'
    ),
    jsonb_build_object(
      'type', 'choice_number',
      'options', jsonb_build_array('1', '2')
    ),
    0.01,
    100,
    'open'
  ),
  (
    33,
    'Stripe',
    'Review pricing clarity',
    'Is the price presentation clear?',
    'qualitative_feedback',
    jsonb_build_object(
      'company', 'Stripe',
      'content_idea', 'Pricing page screenshot with monthly cost, fee disclosure, and primary CTA.',
      'image_path', '/demo/feed-cards/images/33_stripe.png',
      'why_human', 'Humans can spot confusion and perceived hidden costs.'
    ),
    jsonb_build_object(
      'type', 'thumbs',
      'options', jsonb_build_array('thumbs_up', 'thumbs_down')
    ),
    0.01,
    100,
    'open'
  ),
  (
    51,
    'OpenAI',
    'Compare multimodal answer accuracy',
    'Which answer describes the image more accurately?',
    'one_human_decision',
    jsonb_build_object(
      'company', 'OpenAI',
      'content_idea', 'Side-by-side multimodal model answers describing the same messy kitchen photo with small factual differences.',
      'image_path', '/demo/feed-cards/images/51_openai.png',
      'why_human', 'Verified humans can catch subtle visual hallucinations in AI training data.'
    ),
    jsonb_build_object(
      'type', 'choice_number',
      'options', jsonb_build_array('1', '2')
    ),
    0.01,
    100,
    'open'
  ),
  (
    59,
    'Mistral AI',
    'Validate OCR extraction',
    'Is the extracted total correct?',
    'one_human_decision',
    jsonb_build_object(
      'company', 'Mistral AI',
      'content_idea', 'OCR extraction preview from a photographed receipt with item names, prices, and total amount.',
      'image_path', '/demo/feed-cards/images/59_mistral.png',
      'why_human', 'Document AI training needs humans to verify messy real-world OCR.'
    ),
    jsonb_build_object(
      'type', 'binary',
      'options', jsonb_build_array('Yes', 'No')
    ),
    0.01,
    100,
    'open'
  )
on conflict (demo_source_id) do update set
  requester_name = excluded.requester_name,
  title = excluded.title,
  prompt = excluded.prompt,
  task_type = excluded.task_type,
  input_payload = excluded.input_payload,
  response_schema = excluded.response_schema,
  reward_amount = excluded.reward_amount,
  max_responses = excluded.max_responses,
  status = excluded.status,
  updated_at = now();
