update public.users
set
  avatar_url = 'https://api.dicebear.com/9.x/lorelei/svg?seed=' ||
    md5(coalesce(wallet_address, id::text)),
  updated_at = now()
where avatar_url is null or btrim(avatar_url) = '';
