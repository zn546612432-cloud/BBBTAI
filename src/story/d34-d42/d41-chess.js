// Approved D41 cinematic score. Every move is legal SAN; cues are keyed to ply.
export const D41_CHESS_INVITATION='s55-d41-chess-invite';
export const D41_CHESS_MOVES=Object.freeze('d4 d5 c4 e6 Nc3 dxc4 e4 Nf6 Nf3 Nc6 e5 Nd5 Ne4 b6 Bxc4 Bb7 O-O Be7 Bg5 O-O Nf6+ Bxf6 exf6 gxf6 Qd2 fxg5 Nxg5 Kh8 Qd3 f5 Kh1 Qd6 Qh3 h6 Qxh6+ Kg8 Qh7#'.split(' '));
export const D41_CHESS_CUES=Object.freeze({1:'Opening with a little pawn.',7:'Pawn out.',19:'Go bishop.',25:'Rook line blocked. Go queen.',31:"King's move.",37:'恭喜，這次是你贏了。'});
export const D41_CHESS_DRAFT='Checkmate.';
export const isD41Chess=match=>match?.invitationId===D41_CHESS_INVITATION;
// Completed pre-update games remain completed; new cinematic matches must
// finish the final line as well as the actual mate.
export const d41ChessComplete=match=>match?.status==='finished'&&(!match.d41Script||match.d41Script.completed===true);
