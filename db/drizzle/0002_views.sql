-- Custom SQL migration file, put you code below! --
CREATE VIEW councilor_stats AS
SELECT
  m.councilor_id AS councilor_id,
  m.term_id AS term_id,
  (
    SELECT COUNT(*) FROM statements st
    JOIN meetings mt ON mt.id = st.meeting_id
    WHERE st.councilor_id = m.councilor_id
      AND mt.term_id = m.term_id
      AND st.kind = 'general_question'
  ) AS general_question_count,
  (
    SELECT COUNT(*) FROM statements st
    JOIN meetings mt ON mt.id = st.meeting_id
    WHERE st.councilor_id = m.councilor_id
      AND mt.term_id = m.term_id
  ) AS statement_count,
  (
    SELECT CASE
      WHEN COUNT(a.id) = 0 THEN NULL
      ELSE CAST(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS REAL)
           / COUNT(a.id)
    END
    FROM attendances a
    JOIN meetings mt ON mt.id = a.meeting_id
    WHERE a.councilor_id = m.councilor_id
      AND mt.term_id = m.term_id
      AND mt.kind = '本会議'
  ) AS honkaigi_attendance_rate
FROM memberships m;
