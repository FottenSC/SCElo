const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.join(__dirname, 'supabase', 'sampleData.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');
const data = lines.slice(1).filter(line => line.trim().length > 0);

// Parse and sort data by OrderBy column
const parsedData = data.map((line) => {
  // Split by comma, handling quoted values
  const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
  if (!parts || parts.length < 7) return null;
  
  const orderBy = parseInt(parts[0].trim()) || 0;
  const player1 = parts[1].replace(/^"+|"+$/g, '').replace(/'/g, "''").trim();
  const player2 = parts[2].replace(/^"+|"+$/g, '').replace(/'/g, "''").trim();
  const player1_score = parts[3].trim();
  const player2_score = parts[4].trim();
  const event = parts[5].replace(/^"+|"+$/g, '').trim();
  const winner = parts[6].replace(/^"+|"+$/g, '').replace(/'/g, "''").trim();
  
  return { orderBy, player1, player2, player1_score, player2_score, event, winner };
}).filter(v => v !== null);

// Sort by OrderBy column in ASCENDING order so oldest matches get lowest IDs
// This ensures match IDs follow chronological order (oldest = ID 1, newest = highest ID)
parsedData.sort((a, b) => a.orderBy - b.orderBy);

// Extract unique events
const events = [...new Set(parsedData.map(match => match.event))];

// Generate SQL values with match_order from OrderBy
const values = parsedData.map((match, idx) => {
  return `  (${match.orderBy}, '${match.player1}','${match.player2}',${match.player1_score},${match.player2_score},'${match.event}','${match.winner}')`;
});

// Generate seed.sql file
const sqlContent = `-- Seed data generated from sampleData.csv
-- Total matches: ${values.length}
-- Total events: ${events.length}

DO $$
BEGIN
  DROP TABLE IF EXISTS seeddata;
  CREATE TEMP TABLE seeddata(
    row_index INT,
    player1 varchar(128),
    player2 varchar(128),
    player1score INT,
    player2score INT,
    event varchar(128),
    winner varchar(128)
  );

  INSERT INTO seeddata (row_index, player1, player2, player1score, player2score, event, winner) 
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
  ORDER BY event;

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

  -- Insert match data
  INSERT INTO matches(
    player1_id, player1_score,
    player2_id, player2_score, 
    winner_id, event_id, 
    match_order
  )
  SELECT
    P1.id, S.player1score,
    P2.id, S.player2score,
    W.id,
    E.id,
    S.row_index
  FROM seeddata as S
  INNER JOIN players AS P1 ON P1.name = S.player1
  INNER JOIN players AS P2 ON P2.name = S.player2
  INNER JOIN players AS W ON W.name = S.winner
  INNER JOIN events AS E ON E.title = S.event
  ORDER BY S.row_index;

  DROP TABLE seeddata;


  UPDATE matches
  SET vod_link = 'https://www.youtube.com/shorts/IZMaHVVIObs';

  UPDATE events
  SET vod_link = 'https://youtu.be/1sFbLppuhhs?si=JUlABkFdrF5MYYvy';
END $$;
`;

// Write to seed.sql
const outputPath = path.join(__dirname, 'supabase', 'seed.sql');
fs.writeFileSync(outputPath, sqlContent);

console.log(`✓ Generated seed.sql with ${values.length} matches`);
