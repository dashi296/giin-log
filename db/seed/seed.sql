INSERT INTO terms (id, name, starts_on, ends_on, source_url)
  VALUES (1, '大津市議会 第1期(サンプル)', '2023-05-01', '2027-04-30',
          'https://www.city.otsu.lg.jp/gikai/gaiyou/ninki/index.html');

INSERT INTO councilors (id, slug, name, name_kana, source_url) VALUES
  (1, 'yamada-taro', '山田太郎', 'やまだたろう',
   'https://www.city.otsu.lg.jp/gikai/giin/meibo/index.html'),
  (2, 'sato-hanako', '佐藤花子', 'さとうはなこ',
   'https://www.city.otsu.lg.jp/gikai/giin/meibo/index.html');

INSERT INTO memberships (id, councilor_id, term_id, faction, election_count, area, committees, roles, source_url) VALUES
  (1, 1, 1, 'サンプル会派A', 2, '中央', '["総務常任委員会"]', '[]',
   'https://www.city.otsu.lg.jp/gikai/giin/meibo/index.html'),
  (2, 2, 1, 'サンプル会派B', 1, '北部', '["教育厚生常任委員会"]', '["副議長"]',
   'https://www.city.otsu.lg.jp/gikai/giin/meibo/index.html');

INSERT INTO meetings (id, term_id, kind, name, held_on, source_url) VALUES
  (1, 1, '本会議', '令和8年6月通常会議 第1日', '2026-06-10', 'https://www.city.otsu.lg.jp/gikai/nittei/index.html'),
  (2, 1, '本会議', '令和8年6月通常会議 第2日', '2026-06-11', 'https://www.city.otsu.lg.jp/gikai/nittei/index.html');

INSERT INTO attendances (meeting_id, councilor_id, status) VALUES
  (1, 1, 'present'),
  (2, 1, 'present'),
  (1, 2, 'present'),
  (2, 2, 'absent');

INSERT INTO statements (meeting_id, councilor_id, kind, sequence, title, body, body_tokenized, topics, source_url) VALUES
  (1, 1, 'general_question', 1, '子育て支援の拡充について',
   '本市の子育て支援策について質問します。',
   '本市 の 子育て 支援 策 について 質問 し ます',
   '["子育て","福祉"]',
   'https://www.kensakusystem.jp/otsu/index.html'),
  (2, 2, 'general_question', 1, '防災計画の見直しについて',
   '近年の災害を踏まえ防災計画の見直しを求めます。',
   '近年 の 災害 を 踏まえ 防災 計画 の 見直し を 求め ます',
   '["防災"]',
   'https://www.kensakusystem.jp/otsu/index.html');
