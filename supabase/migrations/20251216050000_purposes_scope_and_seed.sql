-- Add tenant scoping and standard flag for purposes + seed standard list

-- 1) New columns
ALTER TABLE public.purposes
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_standard boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_purposes_tenant ON public.purposes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purposes_standard ON public.purposes(is_standard);

-- 2) Seed standard main purposes (provided CSV)
INSERT INTO public.purposes (id, purpose_key, name, type, parent_id, tenant_id, is_standard)
VALUES
  ('72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54', 'collaboration_and_community', 'Samarbete & Gemenskap', 'main', NULL, NULL, true),
  ('c2043912-66d4-4143-8714-f5bb0b518acf', 'motor_skills_and_movement', 'Motorik & Rörelse', 'main', NULL, NULL, true),
  ('3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4', 'cognition_and_focus', 'Kognition & Fokus', 'main', NULL, NULL, true),
  ('59596e93-821d-4450-8e5e-4f214fed8168', 'creativity_and_expression', 'Kreativitet & Uttryck', 'main', NULL, NULL, true),
  ('93500ab9-6ff3-4a0b-bb0d-b9111486a364', 'communication_and_language', 'Kommunikation & Språk', 'main', NULL, NULL, true),
  ('704fe093-7b6f-45cf-ac38-c9ab2c6e5caa', 'self_development_and_emotional_awareness', 'Självutveckling & Emotionell Medvetenhet', 'main', NULL, NULL, true),
  ('cb2533f4-51af-4add-929b-2747f6e43b81', 'reflection_and_mindfulness', 'Reflektion & Mindfulness', 'main', NULL, NULL, true),
  ('fddf7912-4616-446b-b68a-6aa1679dd7de', 'exploration_and_adventure', 'Upptäckande & Äventyr', 'main', NULL, NULL, true),
  ('2b83cedf-1f9d-4427-852f-ab781a2eeb51', 'competition_and_motivation', 'Tävling & Motivation', 'main', NULL, NULL, true),
  ('49a6cc94-52be-4a2e-92a6-55503b5988b6', 'knowledge_and_learning', 'Kunskap & Lärande', 'main', NULL, NULL, true),
  ('577207e2-c07c-44f1-b107-53a24a842640', 'accessibility_and_adaptation', 'Tillgänglighet & Anpassning', 'main', NULL, NULL, true),
  ('e1159589-f469-498b-81ff-b81888a1eab9', 'digital_interaction', 'Digital interaktion', 'main', NULL, NULL, true),
  ('a0ace276-0a17-4750-895b-6e14bfd2b3dd', 'leadership_and_responsibility', 'Ledarskap & Ansvar', 'main', NULL, NULL, true),
  ('badd2cd4-cb1f-4838-b932-029222566b2c', 'theme_and_atmosphere', 'Tema & Stämning', 'main', NULL, NULL, true)
ON CONFLICT (id) DO UPDATE
SET purpose_key = EXCLUDED.purpose_key,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    parent_id = EXCLUDED.parent_id,
    tenant_id = EXCLUDED.tenant_id,
    is_standard = true;

-- 3) Seed standard sub purposes
INSERT INTO public.purposes (id, purpose_key, name, type, parent_id, tenant_id, is_standard)
VALUES
  ('e8349d85-80a4-4c5a-9dc5-d4e858f5fedf', 'teamwork', 'Teamwork', 'sub', '72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54', NULL, true),
  ('0b9487c0-51e6-484b-9108-2cb722fd343c', 'trust_and_confidence', 'Tilltro och förtroende', 'sub', '72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54', NULL, true),
  ('9a0c2b55-d30d-49d1-aab5-8757e9d5f89e', 'group_communication', 'Gruppkommunikation', 'sub', '72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54', NULL, true),
  ('d60593e4-5d68-4516-9a61-1374325fc687', 'collaborative_problem_solving', 'Problemlösning tillsammans', 'sub', '72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54', NULL, true),
  ('f9efe422-ba59-4284-8d95-1435b13279f2', 'leadership_and_followership', 'Ledarskap och följarskap', 'sub', '72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54', NULL, true),
  ('4bb07b28-6b11-43de-8a26-48c21755578d', 'shared_goals', 'Gemensamma mål', 'sub', '72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54', NULL, true),
  ('f07f6235-165f-438e-9e2d-aaca3ba48d91', 'other_general1', 'Övrigt (samarbete)', 'sub', '72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54', NULL, true),

  ('0b675ef4-142c-4310-9fd4-f3cc7e87a8b4', 'balance_and_coordination', 'Balans och koordination', 'sub', 'c2043912-66d4-4143-8714-f5bb0b518acf', NULL, true),
  ('45bef10e-52f9-4868-8879-4ef7a4f27632', 'gross_motor_skills', 'Grov motorik', 'sub', 'c2043912-66d4-4143-8714-f5bb0b518acf', NULL, true),
  ('db5bed7c-d552-4582-a639-d81269831f90', 'fine_motor_skills', 'Finmotorik', 'sub', 'c2043912-66d4-4143-8714-f5bb0b518acf', NULL, true),
  ('6e4d1cb8-c550-4a12-88e7-789540f3e70d', 'movement_in_space', 'Rörelse i rummet', 'sub', 'c2043912-66d4-4143-8714-f5bb0b518acf', NULL, true),
  ('1667bc73-ff7e-4a66-99e0-8cb08d65ec4c', 'rhythm_and_tempo', 'Rytm och tempo', 'sub', 'c2043912-66d4-4143-8714-f5bb0b518acf', NULL, true),
  ('bf5e7783-e40d-488a-afab-c08873d6af3f', 'physical_endurance', 'Fysisk uthållighet', 'sub', 'c2043912-66d4-4143-8714-f5bb0b518acf', NULL, true),
  ('3845866d-cf63-4bc8-a4ae-27185619e46c', 'other_general2', 'Övrigt (motorik)', 'sub', 'c2043912-66d4-4143-8714-f5bb0b518acf', NULL, true),

  ('f949fb0a-ccca-4738-913c-2de141cdfc17', 'problem_solving', 'Problemlösning', 'sub', '3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4', NULL, true),
  ('32e9ef6f-1108-4c80-91d3-fd511956956d', 'logical_thinking', 'Logiskt tänkande', 'sub', '3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4', NULL, true),
  ('c3e5db13-9ff1-4028-9587-b3173db97d30', 'concentration_and_attention', 'Koncentration och uppmärksamhet', 'sub', '3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4', NULL, true),
  ('11e3cb51-af9b-4073-ba95-bb8c1589e336', 'memory_training', 'Minne och repetition', 'sub', '3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4', NULL, true),
  ('eb35bf8e-17f4-490e-814c-5c107b9fc518', 'strategy_and_planning', 'Strategi och planering', 'sub', '3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4', NULL, true),
  ('05e51531-90c6-4e7a-8168-433524814605', 'quick_thinking', 'Snabbtänkhet', 'sub', '3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4', NULL, true),
  ('d7dd8719-9c8e-463b-b0a7-5fc56e98cfe6', 'other_general3', 'Övrigt (kognition)', 'sub', '3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4', NULL, true),

  ('894aa3f3-1396-477c-8a50-851e9b760cb9', 'free_expression', 'Fritt uttryck', 'sub', '59596e93-821d-4450-8e5e-4f214fed8168', NULL, true),
  ('631775cd-93ac-4f6d-9568-60a76223f742', 'fantasy_and_imagination', 'Fantasi och inlevelse', 'sub', '59596e93-821d-4450-8e5e-4f214fed8168', NULL, true),
  ('38b3dee4-7b61-4d54-becb-4e4c910575fe', 'artistic_creation', 'Konstnärligt skapande', 'sub', '59596e93-821d-4450-8e5e-4f214fed8168', NULL, true),
  ('7b61ef32-9c51-4886-a236-9b1b6b4f1ce3', 'improvisation', 'Improvisation', 'sub', '59596e93-821d-4450-8e5e-4f214fed8168', NULL, true),
  ('a9de9a7a-4e91-42b1-8e58-170b3e5180fc', 'storytelling', 'Berättande', 'sub', '59596e93-821d-4450-8e5e-4f214fed8168', NULL, true),
  ('ca58c447-58d0-44c3-8cfa-4932b609f0d5', 'other_general4', 'Övrigt (kreativitet)', 'sub', '59596e93-821d-4450-8e5e-4f214fed8168', NULL, true),

  ('148f873d-83c3-42f7-9431-00908b9ffe1b', 'verbal_communication', 'Verbal kommunikation', 'sub', '93500ab9-6ff3-4a0b-bb0d-b9111486a364', NULL, true),
  ('20c251ae-9d84-4e06-b0aa-4aa1d1103cdd', 'non_verbal_communication', 'Icke-verbal kommunikation', 'sub', '93500ab9-6ff3-4a0b-bb0d-b9111486a364', NULL, true),
  ('399a5020-f2e1-4697-bc47-90bdb2a9fba3', 'active_listening', 'Aktivt lyssnande', 'sub', '93500ab9-6ff3-4a0b-bb0d-b9111486a364', NULL, true),
  ('1f311a76-e024-42cb-ab43-46ca1c86cb3a', 'vocabulary_building', 'Ordförråd och språklek', 'sub', '93500ab9-6ff3-4a0b-bb0d-b9111486a364', NULL, true),
  ('71fdf4cc-9b8c-437c-893e-d8bba1381bf6', 'language_play', 'Språklekar', 'sub', '93500ab9-6ff3-4a0b-bb0d-b9111486a364', NULL, true),
  ('73b36bd9-767a-44cb-b4c6-9eb06168f44f', 'other_general5', 'Övrigt (kommunikation)', 'sub', '93500ab9-6ff3-4a0b-bb0d-b9111486a364', NULL, true),

  ('d6b7fd36-6aa9-463c-b91a-438bd7a7f7d1', 'self_awareness', 'Självmedvetenhet', 'sub', '704fe093-7b6f-45cf-ac38-c9ab2c6e5caa', NULL, true),
  ('1397bba9-37cb-4acb-900c-8f7021a1ecd7', 'emotion_identification', 'Identifiera känslor', 'sub', '704fe093-7b6f-45cf-ac38-c9ab2c6e5caa', NULL, true),
  ('0bf77ac2-ea5f-4afe-b370-94bbaa98d6fb', 'coping_strategies', 'Strategier och bemötande', 'sub', '704fe093-7b6f-45cf-ac38-c9ab2c6e5caa', NULL, true),
  ('0401ace3-3434-4a12-ad09-ea9fa793a72a', 'self_esteem', 'Självkänsla', 'sub', '704fe093-7b6f-45cf-ac38-c9ab2c6e5caa', NULL, true),
  ('22a76c6e-af2c-456d-84ff-816307c49bfe', 'personal_growth', 'Personlig utveckling', 'sub', '704fe093-7b6f-45cf-ac38-c9ab2c6e5caa', NULL, true),
  ('6c337f1f-a2c5-4381-8de6-44d29280d5aa', 'other_general6', 'Övrigt (självutveckling)', 'sub', '704fe093-7b6f-45cf-ac38-c9ab2c6e5caa', NULL, true),

  ('860ab8a7-353e-4b8a-bcdb-ea11a8206508', 'relaxation', 'Avslappning', 'sub', 'cb2533f4-51af-4add-929b-2747f6e43b81', NULL, true),
  ('9f5b737a-f128-455e-91d1-7dd2ffde1890', 'breathing_exercises', 'Andningsövningar', 'sub', 'cb2533f4-51af-4add-929b-2747f6e43b81', NULL, true),
  ('6d364df5-1a79-4169-b9f1-0d730dedcec7', 'body_awareness', 'Kroppsmedvetenhet', 'sub', 'cb2533f4-51af-4add-929b-2747f6e43b81', NULL, true),
  ('ccd9d408-5e56-4445-8713-38de6d25b8eb', 'meditation_basics', 'Meditation grund', 'sub', 'cb2533f4-51af-4add-929b-2747f6e43b81', NULL, true),
  ('95b3ddd0-5eb4-4fae-99b4-bdb15c18a590', 'stress_reduction', 'Stressreducering', 'sub', 'cb2533f4-51af-4add-929b-2747f6e43b81', NULL, true),
  ('5ec058f5-b145-46d7-9320-f778f67d455d', 'other_general7', 'Övrigt (mindfulness)', 'sub', 'cb2533f4-51af-4add-929b-2747f6e43b81', NULL, true),

  ('64b7e212-957b-4bd5-953d-86e42d6054ca', 'nature_exploration', 'Utforska naturen', 'sub', 'fddf7912-4616-446b-b68a-6aa1679dd7de', NULL, true),
  ('61f29028-d8c1-42b8-afbf-20e9db246d90', 'curiosity_and_wonder', 'Nyfikenhet och förundran', 'sub', 'fddf7912-4616-446b-b68a-6aa1679dd7de', NULL, true),
  ('c6507e3b-3a5c-478b-9ef3-41aad5c636db', 'risk_and_challenge', 'Risk och utmaning', 'sub', 'fddf7912-4616-446b-b68a-6aa1679dd7de', NULL, true),
  ('8b55eb99-3c2c-4a20-ac3e-6b48bc1b3c8c', 'discovery_learning', 'Upptäckande lärande', 'sub', 'fddf7912-4616-446b-b68a-6aa1679dd7de', NULL, true),
  ('bef5189b-aefa-4c56-bffd-64a1b56a0f15', 'outdoor_activities', 'Utomhusaktiviteter', 'sub', 'fddf7912-4616-446b-b68a-6aa1679dd7de', NULL, true),
  ('3d6789ee-a039-4d10-a6e9-76d1f5f91239', 'other_general8', 'Övrigt (äventyr)', 'sub', 'fddf7912-4616-446b-b68a-6aa1679dd7de', NULL, true),

  ('e99bbf3f-b51e-45e7-96c5-36da6c5186d4', 'friendly_competition', 'Lekfull tävling', 'sub', '2b83cedf-1f9d-4427-852f-ab781a2eeb51', NULL, true),
  ('828e30e7-2b37-43b9-94a7-6e35fe29714a', 'goal_setting', 'Målsättning', 'sub', '2b83cedf-1f9d-4427-852f-ab781a2eeb51', NULL, true),
  ('dbaecac5-7f3d-4359-b519-42062739c804', 'performance_improvement', 'Prestationsförbättring', 'sub', '2b83cedf-1f9d-4427-852f-ab781a2eeb51', NULL, true),
  ('56dff3fb-adfc-4366-aa9d-427869f0fe72', 'fair_play', 'Fair play', 'sub', '2b83cedf-1f9d-4427-852f-ab781a2eeb51', NULL, true),
  ('fb5d30a8-5acc-4203-b6a8-f7e69281a681', 'reward_systems', 'Belöningssystem', 'sub', '2b83cedf-1f9d-4427-852f-ab781a2eeb51', NULL, true),
  ('d076c51b-5545-46a5-a9cf-de089a359721', 'other_general9', 'Övrigt (tävling)', 'sub', '2b83cedf-1f9d-4427-852f-ab781a2eeb51', NULL, true),

  ('a5403bd0-8dcf-4532-a24b-c2796deacd84', 'subject_knowledge', 'Ämneskunskap', 'sub', '49a6cc94-52be-4a2e-92a6-55503b5988b6', NULL, true),
  ('9c85fb33-5bc6-4406-8e6a-903dcbc709fb', 'learning_through_play', 'Lärande genom lek', 'sub', '49a6cc94-52be-4a2e-92a6-55503b5988b6', NULL, true),
  ('4c3938e6-7c1b-4685-ba29-9b14c9cccfc2', 'inquiry_based_learning', 'Utforskande lärande', 'sub', '49a6cc94-52be-4a2e-92a6-55503b5988b6', NULL, true),
  ('fd0c5c7f-d21c-47d1-9875-80b1a81e3aa4', 'skill_development', 'Färdighetsutveckling', 'sub', '49a6cc94-52be-4a2e-92a6-55503b5988b6', NULL, true),
  ('729857fc-b8c6-4d93-b48b-11d5d38700b7', 'cross_curricular_learning', 'Ämnesövergripande lärande', 'sub', '49a6cc94-52be-4a2e-92a6-55503b5988b6', NULL, true),
  ('8bb99456-29dc-4635-bc20-00e66d49e8c7', 'other_general10', 'Övrigt (kunskap)', 'sub', '49a6cc94-52be-4a2e-92a6-55503b5988b6', NULL, true),

  ('2958ec0a-bebd-4e55-922a-00e1879dafb9', 'adaptive_design', 'Anpassad design', 'sub', '577207e2-c07c-44f1-b107-53a24a842640', NULL, true),
  ('e9af0a70-cb86-4601-864d-3853fbe1dab0', 'communication_support', 'Kommunikationsstöd', 'sub', '577207e2-c07c-44f1-b107-53a24a842640', NULL, true),
  ('0f9cb5de-64cc-44f0-90eb-136118e7973b', 'safe_environment', 'Trygg miljö', 'sub', '577207e2-c07c-44f1-b107-53a24a842640', NULL, true),
  ('00bf4e67-bec8-40b6-a78a-085429721320', 'flexibility_and_options', 'Flexibilitet och val', 'sub', '577207e2-c07c-44f1-b107-53a24a842640', NULL, true),
  ('5067520d-7bdc-40f8-a8d3-789dbcc1a88d', 'other_general11', 'Övrigt (tillgänglighet)', 'sub', '577207e2-c07c-44f1-b107-53a24a842640', NULL, true),

  ('22f37c90-470b-4706-bab4-e9d55637a840', 'engagement_and_energy', 'Engagemang och energi', 'sub', 'e1159589-f469-498b-81ff-b81888a1eab9', NULL, true),
  ('dda29c4d-a384-4e3b-9d34-6ff9db69c679', 'visual_focus', 'Visuellt fokus', 'sub', 'e1159589-f469-498b-81ff-b81888a1eab9', NULL, true),
  ('ec7b5bb8-63b3-40e5-abe4-9a1a4a418de3', 'flow_and_timing', 'Flow och timing', 'sub', 'e1159589-f469-498b-81ff-b81888a1eab9', NULL, true),
  ('7ae2ae3d-1ca1-4380-90b7-f79a46d04318', 'creative_interaction', 'Kreativ interaktion', 'sub', 'e1159589-f469-498b-81ff-b81888a1eab9', NULL, true),
  ('e5d54dc7-fe80-442e-a9c0-cc94e106b674', 'other_general12', 'Övrigt (digitalt)', 'sub', 'e1159589-f469-498b-81ff-b81888a1eab9', NULL, true),

  ('d03ec86f-d512-40f0-8a58-961c48332d63', 'delegation_and_trust', 'Delegation och förtroende', 'sub', 'a0ace276-0a17-4750-895b-6e14bfd2b3dd', NULL, true),
  ('4b0eab04-2d3b-4b50-9f93-0e012117cd4f', 'group_management', 'Gruppledning', 'sub', 'a0ace276-0a17-4750-895b-6e14bfd2b3dd', NULL, true),
  ('41a26122-ea62-44c8-8d6a-021f7ea6112f', 'motivation_and_inspiration', 'Motivation och inspiration', 'sub', 'a0ace276-0a17-4750-895b-6e14bfd2b3dd', NULL, true),
  ('7cb33e6e-af2e-441b-b421-dc4db6b60baa', 'conflict_management', 'Konflikthantering', 'sub', 'a0ace276-0a17-4750-895b-6e14bfd2b3dd', NULL, true),
  ('01cfb1a6-89cb-4292-89c5-15d11edd9510', 'other_general13', 'Övrigt (ledarskap)', 'sub', 'a0ace276-0a17-4750-895b-6e14bfd2b3dd', NULL, true),

  ('7ad5cccb-b174-4b42-9a7f-e9a312b078e7', 'social_connection', 'Social gemenskap', 'sub', 'badd2cd4-cb1f-4838-b932-029222566b2c', NULL, true),
  ('e1942736-6171-4875-9766-5b0eec7bda0f', 'traditions_and_customs', 'Traditioner och seder', 'sub', 'badd2cd4-cb1f-4838-b932-029222566b2c', NULL, true),
  ('989d6f35-dce2-46c5-9e0d-14929ba84362', 'humor_and_fun', 'Humor och glädje', 'sub', 'badd2cd4-cb1f-4838-b932-029222566b2c', NULL, true),
  ('1ae3c8d7-1562-4f8a-a602-68e2e724671d', 'inclusive_celebrations', 'Inkluderande firanden', 'sub', 'badd2cd4-cb1f-4838-b932-029222566b2c', NULL, true),
  ('9aa096e6-9c1c-410d-ad96-48b28ebf53c9', 'teamwork_in_celebration', 'Teamwork i firande', 'sub', 'badd2cd4-cb1f-4838-b932-029222566b2c', NULL, true),
  ('df80f575-ed39-4289-b05a-59f8c23b27ab', 'other_general14', 'Övrigt (tema & stämning)', 'sub', 'badd2cd4-cb1f-4838-b932-029222566b2c', NULL, true)
ON CONFLICT (id) DO UPDATE
SET purpose_key = EXCLUDED.purpose_key,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    parent_id = EXCLUDED.parent_id,
    tenant_id = EXCLUDED.tenant_id,
    is_standard = true;

