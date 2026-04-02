export function getGameKey(teamId1, teamId2){
  return [teamId1, teamId2].sort().join('-');
}