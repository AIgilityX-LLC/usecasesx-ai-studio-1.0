INSERT INTO public.taxonomy_sectors(slug,name,sort_order,is_published,status)
VALUES
 ('airlines-aviation','Airlines & Aviation',1,true,'published'),
 ('automotive','Automotive & Mobility',2,true,'published'),
 ('banking','Banking & Financial Services',3,true,'published'),
 ('defense','Defence & National Security',4,true,'published'),
 ('education','Education & Research',5,true,'published'),
 ('food-agribusiness','Food & Agribusiness',6,true,'published'),
 ('government','Government & Public Sector',7,true,'published'),
 ('healthcare','Healthcare & Life Sciences',8,true,'published'),
 ('hospitality','Hospitality & Tourism',9,true,'published'),
 ('law-enforcement','Law Enforcement & Justice',10,true,'published'),
 ('logistics','Logistics & Freight',11,true,'published'),
 ('manufacturing','Manufacturing & Industrials',12,true,'published'),
 ('media','Media & Entertainment',13,true,'published'),
 ('pharma','Pharmaceuticals & Biotech',14,true,'published'),
 ('real-estate','Real Estate & Facilities',15,true,'published'),
 ('regulatory-compliance','Regulators & Compliance Bodies',16,true,'published'),
 ('retail','Retail & Consumer',17,true,'published'),
 ('transport-travel','Transport & Travel',18,true,'published')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order, is_published=true, status='published', updated_at=now();