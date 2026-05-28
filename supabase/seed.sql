-- Seed sample data matching `lib/store/catalog.ts`

-- Collections
INSERT INTO collections(handle, title, description, seo, hidden)
VALUES
('summer-drops', 'Summer Drops', 'Fresh picks for warm days.', '{"title": "Summer Drops", "description": "Fresh picks for warm days."}', false),
('accessories', 'Accessories', 'Essentials and everyday carry.', '{"title": "Accessories", "description": "Essentials and everyday carry."}', false),
('hidden-homepage-featured-items', 'Featured', 'Homepage featured products.', '{"title":"Featured","description":"Homepage featured products."}', true),
('hidden-homepage-carousel', 'Carousel', 'Homepage carousel products.', '{"title":"Carousel","description":"Homepage carousel products."}', true)
ON CONFLICT (handle) DO NOTHING;

-- Pages
INSERT INTO pages(id, title, handle, body, body_summary, seo)
VALUES
('page_about', 'About', 'about', '<p>We build small-batch essentials designed for long-term use.</p>', 'Learn about our small-batch products.', '{"title":"About","description":"Learn about our small-batch products."}'),
('page_shipping', 'Shipping', 'shipping', '<p>Orders ship within 2 business days. Tracking is emailed automatically.</p>', 'Shipping policy and delivery expectations.', '{"title":"Shipping","description":"Shipping policy and delivery expectations."}'),
('page_returns', 'Returns', 'returns', '<p>You can return unused items within 30 days of delivery.</p>', 'Return policy details.', '{"title":"Returns","description":"Return policy details."}')
ON CONFLICT (id) DO NOTHING;

-- Products (a few minimal entries)
INSERT INTO products(
  id, handle, available_for_sale, title, description, description_html, options, price_range, variants, featured_image, images, seo, tags, collection_handles, recommendation_ids, sales_rank
)
VALUES
('prod_vintage_tee', 'vintage-tee', true, 'Vintage Tee', 'Soft cotton t-shirt with a washed finish.', '<p>Soft cotton t-shirt with a washed finish and relaxed fit for everyday wear.</p>',
  '{"id":"opt_vintage_tee_size","name":"Size","values":["S","M","L"]}'::jsonb || '{"id":"opt_vintage_tee_color","name":"Color","values":["Stone","Graphite"]}'::jsonb,
  '{"minVariantPrice":{"amount":"32.00","currencyCode":"USD"},"maxVariantPrice":{"amount":"32.00","currencyCode":"USD"}}'::jsonb,
  '[{"id":"var_vintage_tee_stone_s","title":"Stone / S","availableForSale":true,"selectedOptions":[{"name":"Size","value":"S"},{"name":"Color","value":"Stone"}],"price":{"amount":"32.00","currencyCode":"USD"}}]'::jsonb,
  '{"url":"/catalog/vintage-tee.svg","altText":"Vintage Tee","width":1200,"height":1200}'::jsonb,
  '[{"url":"/catalog/vintage-tee.svg","altText":"Vintage Tee","width":1200,"height":1200}]'::jsonb,
  '{"title":"Vintage Tee","description":"A premium washed tee made for daily rotation."}'::jsonb,
  ARRAY['apparel'], ARRAY['summer-drops','hidden-homepage-featured-items'], ARRAY['prod_city_hoodie','prod_everyday_cap'], 90
),
('prod_city_hoodie', 'city-hoodie', true, 'City Hoodie', 'Midweight hoodie with structured cuffs.', '<p>Midweight hoodie with structured cuffs and a brushed interior for comfort.</p>',
  '[{"id":"opt_city_hoodie_size","name":"Size","values":["M","L","XL"]}]'::jsonb,
  '{"minVariantPrice":{"amount":"68.00","currencyCode":"USD"},"maxVariantPrice":{"amount":"68.00","currencyCode":"USD"}}'::jsonb,
  '[{"id":"var_city_hoodie_m","title":"M","availableForSale":true,"selectedOptions":[{"name":"Size","value":"M"}],"price":{"amount":"68.00","currencyCode":"USD"}}]'::jsonb,
  '{"url":"/catalog/city-hoodie.svg","altText":"City Hoodie","width":1200,"height":1200}'::jsonb,
  '[{"url":"/catalog/city-hoodie.svg","altText":"City Hoodie","width":1200,"height":1200}]'::jsonb,
  '{"title":"City Hoodie","description":"A clean silhouette hoodie made for cool evenings."}'::jsonb,
  ARRAY['apparel','trending'], ARRAY['summer-drops','hidden-homepage-featured-items'], ARRAY['prod_vintage_tee','prod_studio_notebook'], 95
)
ON CONFLICT (id) DO NOTHING;

-- Menus
INSERT INTO menus(handle, title, path, position) VALUES
('next-js-frontend-header-menu', 'Shop', '/search', 0),
('next-js-frontend-header-menu', 'Summer Drops', '/search/summer-drops', 1),
('next-js-frontend-header-menu', 'Accessories', '/search/accessories', 2),
('next-js-frontend-header-menu', 'About', '/about', 3),
('next-js-frontend-footer-menu', 'Search', '/search', 0),
('next-js-frontend-footer-menu', 'Shipping', '/shipping', 1),
('next-js-frontend-footer-menu', 'Returns', '/returns', 2),
('next-js-frontend-footer-menu', 'About', '/about', 3)
ON CONFLICT DO NOTHING;
