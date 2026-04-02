import ownerJSON from '../../../data/bracket.json';
import expectedInitialTournamentJSON from './expected.initialGames.json'

export function buildExpectedInitialTournamentJSON(){
    return {
        ...ownerJSON.tournament,
        games: expectedInitialTournamentJSON
    }
}