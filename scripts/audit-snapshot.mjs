import { Pool } from 'pg';
import { writeFile } from 'node:fs/promises';
import { localDatabaseUrl } from './local-db.mjs';
const p=new Pool({connectionString:localDatabaseUrl()});
try {
 const counts={}; for(const table of ['events','markets','selections','odds_observations','event_versions','raw_payloads','collector_runs']) counts[table]=Number((await p.query(`SELECT count(*) n FROM ${table}`)).rows[0].n);
 const runs=(await p.query('SELECT status,count(*)::int count FROM collector_runs GROUP BY status')).rows;
 const health=(await p.query('SELECT DISTINCT ON(sportsbook) sportsbook,status,checked_at FROM source_health ORDER BY sportsbook,checked_at DESC')).rows;
 const sources=(await p.query('SELECT b.key,count(DISTINCT e.id)::int events,count(DISTINCT m.id)::int markets,count(DISTINCT s.id)::int selections,count(o.id)::int observations FROM sportsbooks b LEFT JOIN events e ON e.sportsbook_id=b.id LEFT JOIN markets m ON m.event_id=e.id LEFT JOIN selections s ON s.market_id=m.id LEFT JOIN odds_observations o ON o.selection_id=s.id GROUP BY b.key ORDER BY b.key')).rows;
 const plans={}; for (const [name,sql] of Object.entries({history:'SELECT * FROM odds_observations ORDER BY observed_at DESC,id DESC LIMIT 100',latest:'SELECT DISTINCT ON(selection_id) selection_id,decimal_odds FROM odds_observations ORDER BY selection_id,observed_at DESC,id DESC',events:'SELECT * FROM events ORDER BY id LIMIT 100'})) plans[name]=(await p.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+sql)).rows[0]['QUERY PLAN'];
 const result={at:new Date().toISOString(),counts,runs,health,sources,plans};
 if(process.argv[2]) await writeFile(process.argv[2],JSON.stringify(result,null,2));
 console.log(JSON.stringify({at:result.at,counts,runs,health,sources,executionMs:Object.fromEntries(Object.entries(plans).map(([k,v])=>[k,v[0]['Execution Time']]))},null,2));
}finally{await p.end()}
