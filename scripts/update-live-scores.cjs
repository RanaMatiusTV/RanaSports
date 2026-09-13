const fs = require('fs');
const path = require('path');

const SOURCE = 'https://www.sofascore.com/api/v1/sport/football/events/live';
const OUTPUT = path.join(process.cwd(), 'assets', 'live-scores.json');

function compactEvent(event) {
  return {
    id: event?.id ?? null,
    status: {
      type: event?.status?.type || '',
      description: event?.status?.description || ''
    },
    tournament: {
      name: event?.tournament?.name || '',
      uniqueTournament: {
        name: event?.tournament?.uniqueTournament?.name || ''
      },
      category: {
        name: event?.tournament?.category?.name || ''
      }
    },
    homeTeam: { name: event?.homeTeam?.name || 'Local' },
    awayTeam: { name: event?.awayTeam?.name || 'Visitante' },
    homeScore: { current: Number.isFinite(event?.homeScore?.current) ? event.homeScore.current : null },
    awayScore: { current: Number.isFinite(event?.awayScore?.current) ? event.awayScore.current : null }
  };
}

async function main() {
  const response = await fetch(SOURCE, {
    headers: {
      accept: 'application/json',
      'user-agent': 'RanaSports-LiveScores/1.0 (+https://ranamatiustv.github.io/RanaSports/)'
    }
  });

  if (!response.ok) throw new Error(`Sofascore respondió HTTP ${response.status}`);
  const data = await response.json();
  const events = Array.isArray(data?.events) ? data.events.map(compactEvent) : [];

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'Sofascore',
    events
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Guardados ${events.length} eventos en vivo.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
