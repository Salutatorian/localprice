begin;
select plan(6);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'alice@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'bob@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.receipts (
  id, submitter_id, storage_path, sha256, retain_until, status
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cccccccc-cccc-cccc-cccc-cccccccccccc/r.jpg',
  'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd',
  now() + interval '21 days',
  'uploaded'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select id from public.receipts where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'owner can read their receipt'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.receipts where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'another account cannot read the receipt'
);

select throws_ok(
  $$ insert into public.price_observations (
       market_id, branch_id, product_id, price_cents, currency_code, unit, observed_on, confidence, state, created_by
     ) values (
       '33333333-3333-3333-3333-333333333333',
       '55555555-5555-5555-5555-555555555551',
       '66666666-6666-6666-6666-666666666605',
       389, 'USD', 'oz', current_date, 0.9, 'verified',
       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     ) $$,
  'P0001',
  'contributors cannot write verified observations',
  'contributors cannot write verified observations'
);

reset role;
set local role anon;

select throws_ok(
  $$ select transaction_number from public.receipts $$,
  '42501',
  NULL,
  'anon cannot read private receipt fields'
);

select lives_ok(
  $$ select id from public.current_prices $$,
  'anon can read the public current price view'
);

select throws_ok(
  $$ select created_by from public.price_observations $$,
  '42501',
  NULL,
  'anon cannot select private created_by on observations'
);

select * from finish();
rollback;
