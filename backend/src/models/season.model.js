export function createSeason(name) {
  return {
    id: Date.now().toString(),
    name,
    createdAt: new Date()
  };
}
