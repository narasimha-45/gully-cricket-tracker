export function createMatch({
  seasonId,
  teamA,
  teamB,
  matchType
}) {
  return {
    id: Date.now().toString(),
    seasonId,
    teamA,
    teamB,
    matchType, // LIMITED | TEST
    status: "CREATED", // CREATED | IN_PROGRESS | COMPLETED
    createdAt: new Date()
  };
}
