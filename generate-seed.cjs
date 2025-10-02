const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.join(__dirname, 'supabase', 'sampleData.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');
const data = lines.slice(1);

// Extract unique events
const events = [...new Set(data.map(line => {
  const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
  if (!parts || parts.length < 6) return null;
  return parts[4].replace(/^"|"$/g, '').trim();
}).filter(v => v !== null))];

// Generate SQL values
const values = data.map(line => {
  // Split by comma, handling quoted values
  const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
  if (!parts || parts.length < 6) return null;
  
  const player1 = parts[0].replace(/^"+|"+$/g, '').replace(/'/g, "''").trim();
  const player2 = parts[1].replace(/^"+|"+$/g, '').replace(/'/g, "''").trim();
  const player1_score = parts[2].trim();
  const player2_score = parts[3].trim();
  const event = parts[4].replace(/^"+|"+$/g, '').trim();
  const winner = parts[5].replace(/^"+|"+$/g, '').replace(/'/g, "''").trim();
  
  return `  ('${player1}','${player2}',${player1_score},${player2_score},'${event}','${winner}')`;
}).filter(v => v !== null);

// Generate seed.sql file
const sqlContent = `-- Seed data generated from sampleData.csv
-- Total matches: ${values.length}
-- Total events: ${events.length}

DO $$
BEGIN
  DROP TABLE IF EXISTS seeddata;
  CREATE TEMP TABLE seeddata(
    player1 varchar(128),
    player2 varchar(128),
    player1score INT,
    player2score INT,
    event varchar(128),
    winner varchar(128)
  );

  INSERT INTO seeddata (player1, player2, player1score, player2score, event, winner) 
  VALUES
  ${values.join(',\n  ')};

  -- Insert unique events
  INSERT INTO events(title, event_date)
  SELECT DISTINCT event, NOW()
    FROM seeddata
  WHERE 
    NOT EXISTS(
      SELECT 1
      FROM events AS E
      WHERE E.title = seeddata.event
    )
  ORDER BY event ACC;

  -- Insert unique players
  INSERT INTO players(name)
  SELECT DISTINCT name
    FROM (
      SELECT player1 as name FROM seeddata
      UNION SELECT player2 FROM seeddata
    ) AS T
  WHERE 
    NOT EXISTS(
      SELECT 1
      FROM players AS P
      WHERE P.name = T.name
    );

  -- Remove previous seed data
  DELETE FROM matches WHERE is_fake_data = true;

  -- Insert match data
  INSERT INTO matches(
    player1_id, player1_score,
    player2_id, player2_score, 
    winner_id, event_id, is_fake_data
  )
  SELECT
    P1.id, S.player1score,
    P2.id, S.player2score,
    W.id,
    E.id,
    true
  FROM seeddata as S
  INNER JOIN players AS P1 ON P1.name = S.player1
  INNER JOIN players AS P2 ON P2.name = S.player2
  INNER JOIN players AS W ON W.name = S.winner
  INNER JOIN events AS E ON E.title = S.event;

  DROP TABLE seeddata;
END $$;
`;

// Write to seed.sql
const outputPath = path.join(__dirname, 'supabase', 'seedData.sql');
fs.writeFileSync(outputPath, sqlContent);

console.log(`✓ Generated seedData.sql with ${values.length} matches`);
