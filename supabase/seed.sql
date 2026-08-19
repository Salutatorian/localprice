-- Geography and registry aliases for matching. Public prices come from receipts, not this file.
-- IDs are stable so tests and fixtures can reference them.

insert into public.countries (id, iso_code, name) values
  ('11111111-1111-1111-1111-111111111111', 'MP', 'Northern Mariana Islands');

insert into public.regions (id, country_id, slug, name) values
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'cnmi',
    'CNMI'
  );

insert into public.markets (
  id, region_id, slug, name, currency_code, timezone, status, boundary, center, freshness_hours, published_at
) values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'saipan',
  'Saipan',
  'USD',
  'Pacific/Saipan',
  'public',
  ST_GeogFromText('SRID=4326;POLYGON((145.68 15.09, 145.83 15.09, 145.83 15.30, 145.68 15.30, 145.68 15.09))'),
  ST_GeogFromText('SRID=4326;POINT(145.75 15.18)'),
  168,
  now()
);

insert into public.stores (id, slug, name, status) values
  ('44444444-4444-4444-4444-444444444441', 'joeten', 'Joeten', 'approved'),
  ('44444444-4444-4444-4444-444444444442', 'payless', 'Payless Supermarket', 'approved'),
  ('44444444-4444-4444-4444-444444444443', 'superfresh', 'Superfresh', 'approved'),
  ('44444444-4444-4444-4444-444444444444', 'kens', 'Ken''s Super Market', 'approved'),
  ('44444444-4444-4444-4444-444444444445', 'downtown-fiesta', 'Downtown Fiesta', 'approved');

insert into public.store_branches (
  id, store_id, market_id, slug, name, address, location, verification_status, is_public
) values
  (
    '55555555-5555-5555-5555-555555555551',
    '44444444-4444-4444-4444-444444444441',
    '33333333-3333-3333-3333-333333333333',
    'susupe',
    'Joeten Susupe',
    'Beach Road, Susupe, Saipan',
    ST_GeogFromText('SRID=4326;POINT(145.716 15.154)'),
    'moderator_verified',
    true
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '44444444-4444-4444-4444-444444444442',
    '33333333-3333-3333-3333-333333333333',
    'chalan-kanoa',
    'Payless Chalan Kanoa',
    'Chalan Kanoa, Saipan',
    ST_GeogFromText('SRID=4326;POINT(145.703 15.148)'),
    'moderator_verified',
    true
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    '44444444-4444-4444-4444-444444444443',
    '33333333-3333-3333-3333-333333333333',
    'garapan',
    'Superfresh Garapan',
    'Garapan, Saipan',
    ST_GeogFromText('SRID=4326;POINT(145.719 15.209)'),
    'community_confirmed',
    true
  ),
  (
    '55555555-5555-5555-5555-555555555554',
    '44444444-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333',
    'kagman',
    'Ken''s Kagman',
    'Kagman, Saipan',
    ST_GeogFromText('SRID=4326;POINT(145.776 15.168)'),
    'places_matched',
    true
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444445',
    '33333333-3333-3333-3333-333333333333',
    'garapan',
    'Downtown Fiesta Garapan',
    'Garapan, Saipan',
    ST_GeogFromText('SRID=4326;POINT(145.718 15.206)'),
    'moderator_verified',
    true
  );

insert into public.store_aliases (store_id, branch_id, alias) values
  ('44444444-4444-4444-4444-444444444441', '55555555-5555-5555-5555-555555555551', 'JOETEN'),
  ('44444444-4444-4444-4444-444444444441', '55555555-5555-5555-5555-555555555551', 'JOETEN SUPERMARKET'),
  ('44444444-4444-4444-4444-444444444441', '55555555-5555-5555-5555-555555555551', 'JOETEN SUSUPE'),
  ('44444444-4444-4444-4444-444444444442', '55555555-5555-5555-5555-555555555552', 'PAYLESS'),
  ('44444444-4444-4444-4444-444444444442', '55555555-5555-5555-5555-555555555552', 'PAYLESS SUPERMARKET'),
  ('44444444-4444-4444-4444-444444444443', null, 'SUPER FRESH'),
  ('44444444-4444-4444-4444-444444444444', null, 'KENS'),
  ('44444444-4444-4444-4444-444444444444', null, 'KEN''S SUPER MARKET');

insert into public.products (
  id, slug, name, brand, package_size, package_size_text, unit, measure_kind, status
) values
  ('66666666-6666-6666-6666-666666666601', 'nishiki-rice-20lb', 'Premium Rice', 'Nishiki', 20, '20 lb', 'lb', 'weight', 'pending'),
  ('66666666-6666-6666-6666-666666666602', 'calrose-rice-20lb', 'Calrose Rice', 'Hinode', 20, '20 lb', 'lb', 'weight', 'pending'),
  ('66666666-6666-6666-6666-666666666603', 'whole-milk-gallon', 'Whole Milk', 'Meadow Gold', 1, '1 gal', 'l', 'volume', 'pending'),
  ('66666666-6666-6666-6666-666666666604', 'eggs-large-12', 'Large Eggs', null, 12, '12 ct', 'count', 'count', 'pending'),
  ('66666666-6666-6666-6666-666666666605', 'spam-classic-12oz', 'SPAM Classic', 'SPAM', 12, '12 oz', 'oz', 'weight', 'pending'),
  ('66666666-6666-6666-6666-666666666606', 'chicken-thighs-pack', 'Chicken Thighs', null, 3, 'family pack', 'lb', 'weight', 'pending'),
  ('66666666-6666-6666-6666-666666666607', 'white-bread-loaf', 'White Bread', 'Gardenia', 20, '20 oz', 'oz', 'weight', 'pending'),
  ('66666666-6666-6666-6666-666666666608', 'coke-12pk', 'Coca-Cola', 'Coca-Cola', 12, '12 x 12 oz', 'fl_oz', 'volume', 'pending'),
  ('66666666-6666-6666-6666-666666666609', 'maruchan-chicken-5pk', 'Chicken Ramen', 'Maruchan', 5, '5 pack', 'count', 'count', 'pending'),
  ('66666666-6666-6666-6666-666666666610', 'banana-lb', 'Bananas', null, 1, 'per lb', 'lb', 'weight', 'pending'),
  ('66666666-6666-6666-6666-666666666611', 'cooking-oil-48oz', 'Vegetable Oil', 'Crisco', 48, '48 fl oz', 'fl_oz', 'volume', 'pending'),
  ('66666666-6666-6666-6666-666666666612', 'sugar-4lb', 'Granulated Sugar', 'C&H', 4, '4 lb', 'lb', 'weight', 'pending'),
  ('66666666-6666-6666-6666-666666666613', 'soy-sauce-20oz', 'Soy Sauce', 'Kikkoman', 20, '20 fl oz', 'fl_oz', 'volume', 'pending'),
  ('66666666-6666-6666-6666-666666666614', 'toilet-paper-12pk', 'Toilet Paper', 'Charmin', 12, '12 rolls', 'count', 'count', 'pending'),
  ('66666666-6666-6666-6666-666666666615', 'diapers-size4', 'Diapers Size 4', 'Huggies', 32, '32 ct', 'count', 'count', 'pending'),
  ('66666666-6666-6666-6666-666666666616', 'bottled-water-24pk', 'Bottled Water', 'Crystal Geyser', 24, '24 x 16.9 oz', 'fl_oz', 'volume', 'pending'),
  ('66666666-6666-6666-6666-666666666617', 'frozen-peas-16oz', 'Frozen Peas', 'Birds Eye', 16, '16 oz', 'oz', 'weight', 'pending'),
  ('66666666-6666-6666-6666-666666666618', 'cheddar-8oz', 'Cheddar Cheese', 'Kraft', 8, '8 oz', 'oz', 'weight', 'pending'),
  ('66666666-6666-6666-6666-666666666619', 'coffee-11oz', 'Ground Coffee', 'Folgers', 11.3, '11.3 oz', 'oz', 'weight', 'pending'),
  ('66666666-6666-6666-6666-666666666620', 'butter-1lb', 'Salted Butter', 'Challenge', 16, '1 lb', 'oz', 'weight', 'pending');

insert into public.product_aliases (product_id, alias, source) values
  ('66666666-6666-6666-6666-666666666601', 'NISHIKI RICE 20LB', 'receipt'),
  ('66666666-6666-6666-6666-666666666603', 'MEADOW GOLD MILK GAL', 'receipt'),
  ('66666666-6666-6666-6666-666666666605', 'SPAM 12OZ', 'receipt'),
  ('66666666-6666-6666-6666-666666666609', 'MARUCHAN RAMEN 5PK', 'receipt');

insert into public.product_barcodes (product_id, barcode) values
  ('66666666-6666-6666-6666-666666666605', '037600005559'),
  ('66666666-6666-6666-6666-666666666609', '041789001253');

