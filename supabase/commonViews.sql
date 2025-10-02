--- New query to get match details with player names and winner name
select 
  m.id,
  p1.name as player1_name,
  p2.name as player2_name,
  m.player1_score,
  m.player2_score,
  w.name as winner_name
from matches m
join players p1 on m.player1_id = p1.id
join players p2 on m.player2_id = p2.id
join players w on m.winner_id = w.id
where p1.name = 'Kellerak' or p2.name = 'Kellerak'
order by m.id desc;



