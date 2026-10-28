// Curated alternatives to each course's two introductory lines. Shared moves
// retain their annotations; every branch has its own move-by-move explanation.
// Append only: progress stores variation indexes, so existing lines stay first.
// Opening identity is checked against the bundled lichess-org/chess-openings
// CC0 book (https://github.com/lichess-org/chess-openings). Continuations and
// annotations are instructional examples, not claims of forced or best play.
const branch = (name, base, shared, san, notes) => ({name, base, shared, san, notes});
const EXTRA_LINES = {
  italian: [
    branch('Giuoco Piano: central break',0,6,'c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5',
      'Prepare d4 with pawn support.|Attack e4 while developing.|Open the center before Black castles.|Exchange the central pawns.|Build a broad center with a second pawn.|Check and develop with tempo.|Block the check and offer a bishop exchange.|Remove the blocking bishop.|Recapture while developing the queenside knight.|Strike at the bishop and center before White consolidates.'),
    branch('Evans Gambit',0,6,'b4 Bxb4 c3 Ba5 d4 exd4 O-O d6',
      'Offer a wing pawn to gain time for c3 and d4.|Accept the pawn, placing the bishop where c3 can attack it.|Gain a tempo on the bishop and prepare d4.|Keep the bishop on the a5-e1 diagonal.|Build a pawn center while opening the c1 bishop.|Exchange on d4 before the center advances.|Castle rather than spending another move recovering material.|Support the center and open the c8 bishop; White needs activity for the pawn.'),
    branch('Two Knights: knight attack and ...Na5',1,6,'Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6',
      'Attack f7 with both knight and bishop.|Counter in the center and block the bishop diagonal.|Remove the blocking pawn.|Attack the bishop rather than recapturing on d5 immediately.|Check to gain time for the bishop.|Block the check and challenge b5.|Capture the c-pawn before retreating the bishop.|Recapture with tempo on the bishop.|Save the bishop and prepare castling.|Question the advanced knight; Black has activity for the pawn.'),
    branch('Giuoco Pianissimo: c3 and h3',0,10,'c3 O-O Re1 a6 Bb3 Ba7 h3 h6',
      'Prepare a later d4 without opening the center yet.|Complete king safety.|Support e4 so the queenside pieces can develop freely.|Create a retreat on a7 for the bishop.|Keep the bishop on the f7 diagonal.|Shelter the bishop from a future d4 advance.|Restrict ...Bg4 before developing the queen knight.|Restrict Ng5; both sides must now choose how to break the center.')
  ],
  ruy: [
    branch('Berlin Defense: open endgame',0,5,'Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',
      'Attack e4 instead of asking the bishop to retreat.|Castle and prepare a central response to the capture.|Take the central pawn while the e-file is still blocked.|Open the center and attack the advanced knight.|Retreat the knight while attacking the bishop.|Exchange the c6 defender and damage the pawn structure.|Keep the bishop pair and open the d-file.|Recover the pawn and uncover the queen trade.|Save the knight and keep control of d4.|Trade queens along the open d-file.|Recapture; Black loses castling but queenless play makes king activity possible.'),
    branch('Steinitz Defense',0,5,'d6 d4 Bd7 Nc3 Nf6 O-O Be7',
      'Support e5 with a pawn, accepting less space.|Use the extra space to challenge e5.|Break the pin and prepare to release the c6 knight.|Develop and reinforce d5 and e4.|Attack e4 with development.|Secure the king before resolving the center.|Prepare castling; Black seeks a timely central exchange.'),
    branch('Schliemann: quiet response',0,5,'f5 d3 fxe4 dxe4 Nf6 O-O Bc5',
      'Challenge e4 immediately at the cost of kingside pawn cover.|Support e4 and open the c1 bishop rather than accepting the gambit.|Resolve the pawn tension and open the f-file.|Restore the central pawn and open the d-file.|Develop with pressure on e4.|Shelter the king before the center opens further.|Aim at f2 and prepare castling; White can now develop c1.'),
    branch('Open Defense',0,8,'O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6',
      'Castle while allowing the e4 pawn to be captured.|Accept the central pawn with an active knight.|Open lines and challenge Black before recapturing material.|Gain time by attacking the bishop.|Retain the bishop on its active diagonal.|Build a central pawn duo and defend the knight.|Recover a pawn and clear the d-file.|Develop and reinforce d5; Black trades structural risk for active pieces.'),
    branch('Marshall Attack entry',0,13,'O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6',
      'Castle before committing to the central pawn sacrifice.|Prepare d4 and give the bishop a retreat.|Offer a pawn to open lines against White’s king.|Accept the central challenge.|Recapture with the knight and clear f6.|Take e5 while the rook supports the knight.|Exchange White’s central knight.|Recapture and accept exposure of the rook.|Defend the d5 knight and prepare active bishop development.|Challenge the knight and open the c1 bishop.|Develop with tempo on the rook; White must meet the initiative carefully.'),
    branch('Arkhangelsk bishop development',0,12,'Bb3 Bb7 d3 Bc5 c3 d6',
      'Preserve the bishop after ...b5.|Develop the c8 bishop toward the e4 pawn.|Support e4 and open c1.|Aim at f2 with a second active bishop.|Prepare d4 while giving b3 a retreat square.|Support e5; Black’s active bishops compensate for White’s central ambitions.')
  ],
  scotch: [
    branch('Mieses: central space',1,10,'e5 Qe7 Qe2 Nd5 c4 Ba6',
      'Gain space with tempo on f6.|Pin the e-pawn to the king so the knight can stay for now.|Unpin e5 and prepare to develop the king bishop.|Centralize the attacked knight.|Gain space and attack d5 again.|Activate the bishop with pressure on c4 and e2.'),
    branch('Classical: c3 reinforcement',0,10,'c3 Nge7 Bc4 O-O O-O d6',
      'Defend the d4 knight with a pawn.|Develop without blocking the f6 queen.|Aim at f7 and prepare castling.|Shelter the king before central exchanges.|Bring the king to safety too.|Open the c8 bishop and prepare to contest e5.'),
    branch('Scotch Gambit',0,6,'Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7',
      'Offer the d-pawn temporarily for fast development.|Attack e4 while preparing castling.|Gain space with tempo on f6.|Counter in the center and attack c4.|Move the bishop while pinning c6.|Centralize the attacked knight on e4.|Recover the gambit pawn with the knight.|Break the c6 pin and prepare to develop the remaining pieces.'),
    branch('Steinitz queen check',0,7,'Qh4 Nc3 Bb4 Be2 Qxe4 Nb5 Bxc3+ bxc3 Kd8',
      'Attack e4 with the queen but delay kingside development.|Defend e4 and bring another piece into play.|Pin the c3 defender to the king.|Prepare castling and guard the kingside.|Take the e4 pawn while the c3 knight is pinned.|Threaten entry on c7 rather than chasing the queen.|Remove the c3 knight with check.|Recapture and keep the bishop pair.|Guard c7 with the king; Black keeps a pawn but loses castling rights.')
  ],
  'queens-gambit': [
    branch('Declined: Exchange structure',0,6,'cxd5 exd5 Bg5 Be7 e3 O-O Bd3 c6',
      'Resolve central tension to choose the pawn structure.|Recapture with the e-pawn, creating the Carlsbad structure.|Pin f6 and develop outside the pawn chain.|Unpin the knight and prepare castling.|Support d4 and open f1.|Secure the king.|Aim at h7 and prepare White’s castling.|Support d5; White can plan a queenside minority attack or central expansion.'),
    branch('Declined: Tartakower setup',0,10,'Nf3 h6 Bh4 b6 Bd3 Bb7 O-O Nbd7',
      'Complete knight development and prepare castling.|Ask the bishop to clarify its position.|Keep pressure along the diagonal.|Prepare to activate the c8 bishop.|Aim at h7 and clear the kingside.|Develop the bishop behind the d5 pawn.|Secure the king before opening central files.|Reinforce f6 and prepare ...c5 to challenge d4.'),
    branch('Accepted: isolated queen pawn',1,10,'O-O a6 Qe2 b5 Bb3 cxd4 exd4 Bb7',
      'Castle before the center opens.|Prepare queenside expansion with tempo.|Prepare e4 and clear d1 for a rook.|Gain queenside space and attack the bishop.|Keep the bishop on its active diagonal.|Exchange White’s d-pawn to create an isolated pawn after recapture.|Accept an isolated d-pawn in return for open lines.|Develop on the long diagonal; White seeks activity before the pawn becomes a target.'),
    branch('Declined: Cambridge Springs',0,7,'Nbd7 Nf3 c6 e3 Qa5 Nd2 Bb4 Qc2 O-O',
      'Support f6 with the queen knight.|Develop and prepare castling.|Reinforce d5 and clear a5 for the queen.|Support d4 and open f1.|Pin c3 along the diagonal to the king.|Reinforce c4 and clear f3, reducing tactics on the pinned knight.|Add pressure on c3.|Defend c3 while moving the queen away from the g5 bishop’s file.|Castle; White must keep track of the pressure on c3 before central exchanges.')
  ],
  slav: [
    branch('Main line: central occupation',0,10,'e3 e6 Bxc4 Bb4 O-O Nbd7',
      'Open the f1 bishop to recover c4.|Support d5’s former central squares and open f8.|Recover the pawn with development.|Develop and pin c3 until White castles.|Remove the pin and secure the king.|Develop the last knight and prepare ...c5 or ...e5.'),
    branch('Quiet Slav: bishop outside the chain',0,6,'e3 Bf5 Bd3 Bxd3 Qxd3 e6 O-O Nbd7',
      'Support d4 but temporarily close the c1 bishop.|Develop the light bishop before playing ...e6.|Offer an exchange of Black’s active bishop.|Exchange before White can gain time with the knight.|Recapture while keeping the pawn structure intact.|Support d5 and open f8 now that c8 is clear.|Secure the king.|Develop and prepare a central pawn break.'),
    branch('Exchange: symmetrical bishop development',1,10,'Bf4 Bf5 e3 e6 Bd3 Bxd3 Qxd3 Bd6',
      'Develop outside the future e3 chain.|Mirror the bishop development while it is still possible.|Open f1 and reinforce d4.|Open f8 and reinforce d5.|Challenge the active f5 bishop.|Exchange the light bishops.|Recapture without disturbing the pawns.|Develop with an offer to exchange the other bishop pair; active files still matter in symmetry.'),
    branch('Geller Gambit',0,8,'e4 b5 e5 Nd5 a4 e6 axb5 Nxc3 bxc3 cxb5',
      'Offer the c4 pawn for a broad mobile center.|Hold the extra pawn with a queenside chain.|Gain time on the f6 knight.|Blockade d5 and attack c3.|Challenge the base of the queenside chain.|Support central dark squares and open f8.|Open the a-file by capturing b5.|Exchange a defender with tempo on the queen.|Recapture and strengthen d4 at the cost of doubled pawns.|Restore the b5 pawn; White must use the center and open lines for compensation.')
  ],
  london: [
    branch('Early ...Qb6 pressure',0,8,'c3 Nc6 Nbd2 Qb6 Qb3 c4 Qc2 Bd6',
      'Support d4 with the c-pawn.|Add pressure on d4.|Develop and reinforce e4.|Attack b2 and add pressure to d4.|Defend b2 and offer a queen trade.|Gain space and drive the queen away from b3.|Keep the queen safe while retaining defense of b2.|Challenge the f4 bishop and prepare castling.'),
    branch('Early ...Bf5 and bishop exchange',0,5,'c5 e3 Nc6 c3 Bf5 h3 e6 Bd3 Bxd3 Qxd3 Bd6',
      'Challenge d4 immediately.|Support d4 and open the king bishop.|Increase central pressure.|Build the supporting pawn triangle.|Activate c8 before closing the diagonal.|Give the f4 bishop a retreat on h2.|Support d5 now that the light bishop is outside the chain.|Challenge the active f5 bishop.|Trade the bishop before it is driven back.|Recapture and keep the pawn structure compact.|Develop toward h2 and prepare castling.'),
    branch('Jobava London',0,2,'Nc3 Nf6 Bf4 e6 e3 c5 Nb5 Na6 c3 Be7',
      'Develop the queen knight before committing the c-pawn.|Develop toward e4.|Place the bishop outside the future pawn chain.|Open f8 and support d5.|Clear f1 for development.|Challenge d4 while c3 is occupied.|Threaten Nc7+ with support from f4.|Defend c7 by developing the queen knight.|Support d4 and give the b5 knight a retreat on a3.|Prepare castling; White must finish development after the early knight sortie.'),
    branch('Fianchetto: queenside counterplay',1,10,'Be2 c5 c3 Qb6 Qb3 Be6 Qxb6 axb6',
      'Clear f1 and prepare castling.|Challenge d4 from the flank.|Reinforce the center.|Attack b2 while using the open d8-b6 diagonal.|Defend b2 and offer a queen exchange.|Develop with pressure on b3 and d5.|Exchange queens before the bishop gains more time.|Recapture toward the center and open the a-file; White can now castle.')
  ],
  sicilian: [
    branch('Dragon: Yugoslav setup',0,9,'g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7',
      'Prepare the Dragon bishop on the long diagonal.|Develop and support d4.|Activate the bishop toward the queenside.|Support e4 and keep enemy pieces off g4.|Castle before launching counterplay.|Connect queen and bishop and prepare queenside castling.|Develop with pressure on d4.|Pressure f7 before castling long.|Connect the rooks and prepare queenside activity; opposite-side castling can lead to sharp play.'),
    branch('Scheveningen: small center',0,9,'e6 Be2 Be7 O-O O-O f4 Nc6 Be3 a6',
      'Build the flexible d6/e6 pawn pair.|Prepare castling without committing the f-pawn yet.|Clear f8 and prepare castling.|Secure the king.|Complete Black’s king safety.|Gain kingside space and support e5.|Pressure d4 and develop the queen knight.|Develop and reinforce the center.|Restrict Nb5 and prepare queenside space; Black must time ...d5 carefully.'),
    branch('Sveshnikov: d5 square and bishop pair',1,9,'e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7',
      'Gain a tempo on d4 but leave d5 weak.|Retreat actively toward d6 and c7.|Stop Nd6+ and support e5.|Pin f6, increasing control of d5.|Drive the b5 knight back.|Save the knight while keeping pressure on b5.|Gain queenside space and restrict Nc4.|Occupy the weak central square.|Break the f6 pin and prepare castling; Black accepts a d5 weakness for activity.'),
    branch('Accelerated Dragon: Maroczy Bind',1,7,'g6 c4 Bg7 Be3 Nf6 Nc3 O-O Be2 d6',
      'Fianchetto without committing to ...d6 yet.|Use the extra tempo to control d5 with a second pawn.|Develop the bishop on the long diagonal.|Support the d4 knight.|Pressure e4 and prepare castling.|Defend e4 and develop.|Secure the king.|Prepare White’s castling behind the space advantage.|Accept a compact center; the immediate ...d5 break is harder against the bind.'),
    branch('Alapin: central pawn duo',0,2,'c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Be2 Nc6',
      'Prepare d4 with pawn support instead of developing Nf3.|Challenge e4 before White builds the duo.|Exchange central pawns.|Recapture actively; c3 temporarily prevents Nc3 with tempo.|Establish the intended d4 center.|Develop with central control.|Develop and prepare castling.|Support central dark squares and open f8.|Clear f1 for castling.|Increase pressure on d4; White may later accept an isolated queen pawn.'),
    branch('Closed Sicilian: kingside fianchetto',0,2,'Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6',
      'Develop without committing to d4.|Control d4 with a knight.|Prepare the g2 bishop.|Prepare a matching fianchetto.|Support central light squares from the flank.|Contest the long diagonal.|Support e4 and open c1.|Support e5 and open c8.|Gain kingside space while keeping the center closed.|Control d5 and prepare ...Nge7; White must develop before opening attacking files.')
  ],
  french: [
    branch('Tarrasch: isolated queen pawn',0,4,'Nd2 c5 exd5 exd5 Ngf3 Nc6 Bb5 Bd6 O-O Ne7',
      'Support e4 without blocking the c-pawn.|Challenge d4 before developing the knights.|Resolve tension and open the e-file.|Recapture with the e-pawn and free c8.|Develop while keeping d2 defended.|Pressure d4 with development.|Pin the c6 knight.|Develop toward h2 and prepare castling.|Secure the king.|Develop behind the d5 pawn; later dxc5 can leave Black an isolated d-pawn.'),
    branch('Winawer: doubled c-pawns',0,4,'Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 O-O',
      'Develop and defend e4.|Pin the c3 knight to increase pressure on e4.|Gain space and close the center.|Attack d4, the base of the pawn chain.|Question the pinning bishop.|Exchange and force a structural decision with check.|Accept doubled pawns and keep the bishop pair.|Develop without blocking the c-pawn or f-pawn breaks.|Pressure g7 before Black consolidates.|Defend g7 with the king; both sides must now judge kingside attacks against central counterplay.'),
    branch('Classical: Steinitz space advantage',0,4,'Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 Be7',
      'Support e4 with development.|Attack e4.|Gain space with tempo.|Retreat while preparing ...c5 and ...f6.|Support e5 with a second pawn.|Attack the d4 base.|Develop and reinforce d4.|Add another attacker to d4.|Develop and protect the center.|Prepare castling before opening more central lines.'),
    branch('Rubinstein: central exchanges',0,4,'Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3 c5',
      'Develop and reinforce e4.|Trade the d-pawn to reduce White’s central space.|Recapture with an active knight.|Prepare to support the f6 knight.|Develop toward e5 and d4.|Attack e4 and invite a knight trade.|Exchange with check rather than retreat.|Recapture while developing the d7 knight.|Develop and aim at h7.|Challenge d4 now that development is underway.')
  ],
  caro: [
    branch('Exchange: open bishop development',0,4,'exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4',
      'Resolve the central tension early.|Recapture toward the center and open the c-file.|Develop toward h7.|Develop with pressure on d4.|Support d4 without blocking the c1 bishop.|Develop and prepare castling.|Activate the bishop before moving the e-pawn.|Develop with an attack on the queen along g4-f3-e2-d1; White must address that threat.'),
    branch('Panov: isolated queen pawn',0,4,'exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 Nxd5',
      'Exchange before challenging d5 with c4.|Restore a central pawn and open the c-file.|Challenge d5 and seek active piece play.|Develop and reinforce d5.|Add pressure to d5.|Support d5 and open f8.|Develop and support d4.|Pin c3 to reduce pressure on d5.|Exchange the c-pawn for Black’s central pawn.|Recapture with a knight, leaving White an isolated d-pawn and active lines.'),
    branch('Advance: Short development',1,8,'Be2 c5 O-O Nc6 Be3 cxd4 Nxd4 Nge7',
      'Prepare castling before committing the queenside.|Attack the base of the e5 chain.|Secure the king.|Add pressure on d4.|Reinforce d4 and develop the c1 bishop.|Resolve the central tension.|Recapture with a piece, preserving e5 space.|Develop without obstructing the f-pawn; Black can plan ...Nxd4 and ...Nc6.'),
    branch('Two Knights: bishop pin',0,2,'Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6',
      'Develop before occupying d4.|Challenge e4 immediately.|Defend e4 with the second knight.|Pin f3 to the queen.|Ask the bishop to decide.|Exchange the defender rather than retreat.|Recapture and retain the bishop pair.|Support d5 and open f8.|Occupy the center now that the queen defends e4.|Develop with pressure on e4; White’s bishop pair needs open lines.')
  ],
  'kings-indian': [
    branch('Classical: locked center',0,12,'O-O Nc6 d5 Ne7 Ne1 Nd7 f3 f5',
      'Secure the king before committing the center.|Pressure d4 and invite the advance.|Close the center and gain space.|Retreat toward the kingside.|Clear f3 for the pawn and prepare Nd3.|Clear f6 for the f-pawn.|Reinforce e4 before queenside expansion.|Begin kingside counterplay; the closed center gives time for a flank attack.'),
    branch('Sämisch: large pawn center',0,8,'f3 O-O Be3 Nc6 Qd2 a6 Nge2 Rb8',
      'Defend e4 and keep enemy knights off g4.|Secure the king before challenging the center.|Develop behind the pawn center.|Pressure d4 and consider ...e5.|Connect queen and bishop and leave both castling options open.|Prepare queenside expansion.|Develop without blocking the f3 pawn.|Support ...b5; Black seeks counterplay before White launches a kingside attack.'),
    branch('Four Pawns Attack',0,8,'f4 O-O Nf3 c5 d5 e6 Be2 exd5 cxd5 Re8',
      'Gain maximum central space at the cost of development time.|Castle before striking the center.|Develop and support d4.|Attack d4 immediately.|Gain space and block the g7 bishop.|Undermine the advanced d5 pawn.|Prepare king safety.|Exchange to open the e-file.|Restore d5 and keep a broad center.|Place the rook on the open file; White must castle before the center becomes vulnerable.'),
    branch('Averbakh: bishop restraint',0,8,'Be2 O-O Bg5 c5 d5 e6 Qd2 exd5 exd5 Re8',
      'Develop the bishop before the king knight.|Secure the king.|Restrain ...e5 through pressure on f6.|Challenge the center from the c-file.|Gain space and close the bishop diagonal.|Attack d5 with a second pawn break.|Connect the queen and bishop before deciding where to castle.|Open the e-file through an exchange.|Recapture with the e-pawn to retain c4 support for d5.|Use the open e-file while White finishes development.')
  ],
  nimzo: [
    branch('Classical: queen recapture',0,6,'Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 e3 d6',
      'Defend c3 so a bishop exchange need not double the pawns.|Secure the king.|Force a decision from the bishop.|Exchange with check before retreating becomes necessary.|Recapture without damaging the pawn structure.|Prepare the light bishop on b7.|Develop with pressure on f6.|Contest e4 from the long diagonal.|Support d4 and open f1.|Restrain e4 and open a path for the queen knight.'),
    branch('Leningrad: sharp pin',0,6,'Bg5 h6 Bh4 c5 d5 d6 e3 Bxc3+ bxc3 e5',
      'Pin f6 instead of defending c3 immediately.|Ask the bishop to decide.|Maintain the pin from h4.|Challenge d4 from the flank.|Gain space and keep the center closed.|Support the central dark squares.|Open f1 and reinforce d4’s neighboring squares.|Exchange the c3 knight before White castles.|Accept doubled pawns and keep the bishop pair.|Close the center, making piece routes and pawn breaks more important than open diagonals.'),
    branch('Rubinstein: Hübner structure',0,7,'c5 Bd3 Nc6 Nf3 Bxc3+ bxc3 d6 O-O e5',
      'Pressure d4 before committing the king.|Develop and prepare castling.|Add pressure to d4.|Support d4 and develop.|Exchange before White can recapture with a piece.|Recapture and strengthen the center at the cost of doubled pawns.|Prepare to lock the center.|Secure the king.|Close the center; Black will target c4 while White seeks a useful pawn break.'),
    branch('Fianchetto: long-diagonal play',0,6,'g3 c5 Nf3 cxd4 Nxd4 O-O Bg2 d5 O-O dxc4',
      'Prepare the bishop on g2 despite the c3 pin.|Challenge d4 before the fianchetto is complete.|Develop and support d4.|Open the center while c3 remains pinned.|Recapture centrally with the king knight.|Secure the king.|Complete the fianchetto and prepare castling.|Challenge the centralized knight.|Remove the pin and bring the king to safety.|Resolve the central tension; White must recover c4 while developing c1.')
  ],
  english: [
    branch('Four Knights: reversed Rossolimo',0,4,'Nf3 Nc6 g3 Bb4 Bg2 O-O O-O e4 Ng5 Bxc3',
      'Develop a second knight before committing the bishop.|Complete knight development.|Prepare the long-diagonal bishop.|Pin c3 to the king.|Develop and prepare castling.|Secure the king.|Remove the pin and connect the king rook.|Gain space with tempo on f3.|Retreat actively toward e4.|Exchange the c3 knight; White must choose how to recapture and use the bishop pair.'),
    branch('Botvinnik: broad light-square center',0,2,'Nc3 Nc6 g3 g6 Bg2 Bg7 e4 d6 Nge2 Nf6 d3 O-O',
      'Develop and reinforce d5.|Control d4 with development.|Prepare the g2 bishop.|Prepare a matching fianchetto.|Activate the bishop on the long diagonal.|Contest central dark squares.|Build the c4/e4 bind on d5.|Support e5 and open c8.|Develop without blocking the f-pawn.|Develop with pressure on e4.|Support e4 and open c1.|Castle; White can prepare f4 but must watch the d4 square.'),
    branch('Symmetrical: early central break',1,4,'Nf3 Nf6 d4 cxd4 Nxd4 e6 g3 d5 cxd5 exd5',
      'Develop before choosing the bishop setup.|Match central control.|Open the center immediately.|Exchange the flank pawn for a central pawn.|Recapture with an active knight.|Prepare a central challenge.|Prepare the king bishop on g2.|Challenge the d4 knight.|Exchange the c-pawn to change the structure.|Accept an isolated d-pawn in return for active development.'),
    branch('Anglo-Indian: kingside fianchetto',0,1,'Nf6 Nc3 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O',
      'Develop flexibly without occupying the center yet.|Increase control of d5.|Prepare ...d5 and open f8.|Develop and support d4.|Prepare a queen bishop fianchetto.|Prepare the g2 bishop.|Pressure e4 from the long diagonal.|Develop toward the center.|Prepare castling.|Secure the king before deciding on d4.|Complete Black’s king safety; both sides retain central pawn choices.')
  ],
  vienna: [
    branch('Falkbeer: classical bishop development',0,4,'Bc4 Nc6 d3 Bc5 Nf3 d6 O-O O-O',
      'Develop toward f7 rather than committing the f-pawn.|Develop and reinforce e5.|Support e4 and open c1.|Aim at f2 and prepare castling.|Develop and prepare king safety.|Support e5 and open c8.|Castle before opening central files.|Complete king safety; both sides can prepare a central break.'),
    branch('Vienna Gambit: ...Nc6 acceptance',0,3,'Nc6 f4 exf4 Nf3 g5 Bc4 Bg7 d4 d6',
      'Develop without attacking e4 immediately.|Offer the f-pawn to divert e5.|Accept and open White’s king diagonal.|Develop and control h4.|Support f4 but weaken the kingside pawn cover.|Develop toward f7 and prepare castling.|Develop behind the advanced g-pawn.|Build the center while Black spends time defending the extra pawn.|Support central squares; White needs development and open lines for compensation.'),
    branch('Three Knights: bishop pin',0,4,'Bc4 Nc6 d3 Bb4 Nf3 d6 O-O Bxc3 bxc3 O-O',
      'Develop toward f7.|Bring out the second knight.|Support e4 and open c1.|Pin c3 to increase pressure on e4.|Develop and prepare castling.|Support e5 and open c8.|Remove the pin and secure the king.|Exchange the c3 knight to change the pawn structure.|Accept doubled pawns and keep the bishop pair.|Castle; White can use the extra central pawn support to prepare d4.'),
    branch('Mieses: fianchetto without early exchanges',0,3,'Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 exf4 Bxf4 Nf6',
      'Develop and reinforce e5.|Prepare the long-diagonal bishop.|Prepare a matching fianchetto.|Develop behind e4.|Develop behind e5.|Support e4 and open c1.|Support e5 and open c8.|Challenge e5 after supporting the center.|Exchange to open lines.|Recapture while developing the c1 bishop.|Develop with pressure on e4; White can now prepare castling.')
  ],
  'kings-gambit': [
    branch('Accepted: Fischer Defense',0,5,'d6 d4 g5 h4 g4 Ng1 Bh6 Nc3 Nc6',
      'Support e5’s neighboring squares and prepare to defend f4.|Build the center before chasing the f-pawn.|Support the extra pawn with a kingside expansion.|Challenge the g5 pawn chain.|Drive the knight away from f3.|Save the knight; White must justify the lost development time.|Defend f4 with a bishop.|Develop and reinforce the pawn center.|Develop with pressure on d4; White needs open lines before Black consolidates.'),
    branch('Accepted: Kieseritzky knight advance',0,5,'g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6',
      'Hold f4 with a pawn chain at the cost of king cover.|Attack the supporting pawn.|Advance with tempo on f3.|Centralize the knight on e5.|Develop and attack e4.|Aim at f7 before castling.|Challenge e4 and attack the bishop.|Exchange the central pawn.|Develop with an attack on e5; White must calculate before continuing the attack.'),
    branch('Bishop’s Gambit: king displacement',0,4,'Bc4 Qh4+ Kf1 d6 Nf3 Qe7 Nc3 c6 d4 g5',
      'Aim at f7 while allowing a queen check.|Exploit the weakened e1-h4 diagonal.|Give up castling rights to keep the pawn center.|Open the c8 bishop and support central squares.|Develop with tempo on the queen.|Retreat while keeping an eye on e4.|Develop and support the center.|Restrict knight entry on d5 and prepare ...d5.|Gain central space and open c1.|Support f4; White’s activity must compensate for the exposed king and pawn deficit.'),
    branch('Declined: classical bishop development',0,3,'Bc5 Nf3 d6 Nc3 Nf6 Bc4 Nc6 d3 O-O',
      'Decline the pawn and aim at the weakened king diagonal.|Develop and control h4.|Support e5 and open c8.|Reinforce e4.|Develop with pressure on e4.|Prepare castling and pressure f7.|Complete knight development.|Support e4 before deciding when to exchange on e5.|Castle; White must finish king safety before opening the f-file.')
  ],
  'four-knights': [
    branch('Spanish: Rubinstein counterplay',0,7,'Nd4 Nxd4 exd4 e5 dxc3 exf6 Qxf6 dxc3 Bc5',
      'Centralize the c6 knight and offer a structural change.|Exchange the advanced knight.|Recapture toward the center and attack c3.|Attack f6 rather than retreating c3 immediately.|Take the c3 knight to maintain material balance.|Capture the f6 knight in return.|Recapture actively with the queen.|Remove the advanced pawn and open the d-file.|Develop toward f2; both sides have open lines and must secure their kings.'),
    branch('Spanish: central tension',0,8,'O-O O-O d4 exd4 Nxd4 Re8 Nxc6 bxc6 Bd3 d5',
      'Castle before opening the center.|Match king safety.|Challenge e5 immediately.|Exchange central pawns.|Recapture with an active knight.|Place the rook opposite e4.|Exchange c6 to change the pawn structure.|Recapture toward the center and support ...d5.|Retreat the bishop while defending e4.|Use the strengthened c-pawn to support the central break.'),
    branch('Scotch: bishop pin and king safety',1,10,'Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O',
      'Exchange the c6 defender.|Recapture toward the center.|Develop and defend e4.|Challenge e4 and gain central space.|Open the center while Black’s king is uncastled.|Restore a pawn on d5 with central influence.|Secure the king.|Castle; White can develop c1 while Black uses the central pawn duo.'),
    branch('Italian Four Knights: center before symmetry',0,6,'Bc4 Nxe4 Nxe4 d5 Bd3 dxe4 Bxe4 Bd6',
      'Develop toward f7 but allow a temporary central tactic.|Take e4, drawing the c3 knight away.|Recapture centrally.|Fork the bishop and knight with a pawn.|Save the bishop on a useful diagonal.|Recover the knight and restore material balance.|Recapture the advanced pawn.|Develop and defend e5; the central exchange leaves both sides open diagonals.')
  ],
  petrov: [
    branch('Classical: central tension',0,12,'O-O O-O Re1 Nc6 c4 Nb4 Bf1 Bf5',
      'Secure the king.|Complete Black’s king safety.|Line up against the e4 knight.|Defend e4 indirectly through development and pressure on d4.|Challenge d5 and open space for the queen knight.|Attack the d3 bishop.|Preserve the bishop and keep the rook on e1.|Develop and reinforce the advanced e4 knight.'),
    branch('Nimzowitsch: long castling',0,8,'Nc3 Nxc3 dxc3 Be7 Bf4 O-O Qd2 Nd7 O-O-O Nf6',
      'Develop with an attack on the central knight.|Exchange rather than retreat.|Open the d-file and c1 bishop while accepting doubled c-pawns.|Prepare castling.|Develop with pressure on c7.|Secure the king.|Connect the queen and bishop and prepare long castling.|Develop and prepare to reach f6.|Castle long to activate the d-rook.|Centralize the knight; the opposite king positions make pawn breaks important.'),
    branch('Cochrane Gambit',0,6,'Nxf7 Kxf7 d4 c5 dxc5 Nc6 Nc3 Be6',
      'Sacrifice the knight to expose the king and remove f7.|Accept the piece while giving up castling.|Build a broad center and open c1.|Challenge d4 before White builds an attack.|Open the d-file by exchanging the pawn.|Develop with pressure on d4 and e5.|Develop and reinforce e4.|Develop and prepare to shelter the king; White has pawns and attacking chances for the piece, not a forced win.'),
    branch('Three Knights: quiet development',0,4,'Nc3 Nc6 Bb5 Bb4 O-O O-O d3 d6',
      'Defend e4 instead of capturing e5.|Transpose to a Four Knights structure.|Pressure the defender of e5.|Pin c3 and balance central pressure.|Remove the pin and secure the king.|Complete Black’s king safety.|Support e4 and open c1.|Support e5 and open c8; White has kept the game quiet rather than entering the main capture line.')
  ],
  philidor: [
    branch('Antoshin: active bishop development',0,10,'Bf4 O-O Qd2 c6 O-O-O b5',
      'Develop with pressure on d6.|Secure the king.|Connect queen and bishop and prepare long castling.|Control d5 and prepare queenside space.|Castle long and activate the rook on the d-file.|Start queenside counterplay against the king; White must balance attack and defense.'),
    branch('Hanham: flexible central tension',1,12,'Re1 c6 a4 Qc7 h3 Re8',
      'Support e4 before central action.|Restrict d5 and support the center.|Restrain ...b5.|Reinforce e5 and clear d8 for a rook.|Restrict ...Bg4.|Support e5 with the rook and prepare further development.'),
    branch('Lion: queenside castling option',0,4,'Nc3 Nf6 d4 Nbd7 Bc4 Be7 g4 h6 Rg1 c6',
      'Develop the queen knight before choosing d4.|Attack e4 with development.|Build a broad central pawn duo.|Reinforce e5 and keep the center flexible.|Develop toward f7 and clear f1.|Prepare castling.|Gain kingside space while leaving the king in the center.|Control g5 and slow the pawn advance.|Support the g-pawn with the rook, committing to an uncastled kingside.|Control d5; White must judge whether the attack justifies delayed king safety.'),
    branch('Early ...Bg4: tactical development',0,5,'Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6',
      'Pin f3 before resolving the central tension.|Open the d-file and attack the g4 bishop with the queen.|Exchange the f3 knight instead of retreating.|Recapture while keeping the pawn structure intact.|Recover the central pawn.|Develop toward f7.|Develop and prepare castling.|Attack b7 while the bishop pressures f7.|Defend f7 and prepare development.|Develop and reinforce e4.|Restrict knight entry on d5.')
  ],
  ponziani: [
    branch('Central counter: unpinning development',0,7,'Bd7 Bb5 Nf6 exd5 Nxd5 O-O Be7 Re1 O-O',
      'Break the queen’s pin on c6 and develop.|Pin the c6 knight again with the bishop.|Develop and increase pressure on e4.|Exchange central pawns while c6 is pinned.|Recapture with the f6 knight.|Secure the king before the center opens further.|Prepare castling.|Place the rook on the open e-file.|Complete king safety; White can prepare d4 to use c3’s support.'),
    branch('Central counter: early exchange',0,6,'exd5 Qxd5 d4 exd4 cxd4 Bg4 Be2 O-O-O',
      'Exchange before bringing the queen out.|Recapture actively while c3 prevents Nc3.|Challenge the queen and build the center.|Resolve the central tension.|Restore the d4 center with the c-pawn.|Develop with a pin on f3.|Break the pin and prepare castling.|Castle long and pressure d4 along the open file.'),
    branch('Knight counter: bishop support',1,6,'d4 Nxe4 Bd3 d5 Nxe5 Nxe5 dxe5 Bc5',
      'Claim d4 despite pressure on e4.|Take e4 with the knight.|Develop and attack the advanced knight.|Support e4 and challenge the center.|Exchange the e5 pawn for an active knight post.|Trade the central knights.|Recapture and gain central space.|Develop toward f2 while White prepares king safety.'),
    branch('Quiet defense: complete development',0,5,'d6 d4 Nf6 Bd3 Be7 O-O O-O Re1 Re8',
      'Support e5 and keep the center compact.|Build the intended pawn duo.|Attack e4 with development.|Defend e4 and clear f1.|Prepare castling.|Secure the king.|Match king safety.|Support e4 before central exchanges.|Defend e5 with the rook; White can develop the queen knight via d2.')
  ],
  'danish-gambit': [
    branch('Double-pawn acceptance',0,6,'Bc4 cxb2 Bxb2 d6 Nf3 Nf6 Nc3 Be7 O-O O-O',
      'Offer a second pawn to gain open diagonals.|Accept the second pawn, allowing bishop development with recapture.|Develop on the long diagonal with pressure toward g7.|Open c8 and prepare development.|Develop and prepare castling.|Attack e4 with development.|Reinforce e4 and add another active piece.|Prepare castling while reducing immediate danger.|Secure the king and bring the rook toward the open files.|Complete king safety; White needs sustained activity for the two pawns.'),
    branch('Schlechter: return material for development',0,6,'Bc4 cxb2 Bxb2 d5 Bxd5 Nf6 Nc3 Be7 Nf3 O-O',
      'Develop and offer a second pawn.|Accept the offer.|Recapture with development on the long diagonal.|Return a pawn to blunt White’s initiative.|Take d5 while keeping the bishop active.|Develop with tempo on the d5 bishop.|Defend the bishop and reinforce e4.|Prepare castling rather than trying to keep every pawn.|Complete knight development.|Castle; Black uses quick development to meet the gambit.'),
    branch('Single-pawn: ...Bb4 pin',0,8,'Nf3 Bb4 Bc4 Nf6 O-O O-O e5 d5',
      'Develop and prepare castling.|Pin c3 and add pressure on e4.|Aim at f7.|Attack e4 with development.|Remove the pin and bring the king to safety.|Secure the king.|Gain space with tempo on f6.|Counter in the center and attack c4; White must calculate the exchanges.'),
    branch('Declined: support with ...d6',0,5,'d6 cxd4 Nf6 Nc3 Be7 Nf3 O-O Bd3 Nc6',
      'Decline the extra pawn and open the c8 bishop.|Recover the pawn and build a central duo.|Develop with pressure on e4.|Defend e4 and develop.|Prepare castling.|Develop and defend d4.|Secure the king.|Develop toward h7.|Pressure d4; declining the gambit leads to a normal development struggle.')
  ],
  scandinavian: [
    branch('Queen to d8: solid retreat',0,5,'Qd8 d4 Nf6 Nf3 c6 Bc4 Bf5 O-O e6',
      'Return the queen home after inducing Nc3.|Occupy the center.|Develop with pressure on d5.|Support d4 and prepare castling.|Control d5 and prepare the light bishop’s development.|Aim at f7.|Develop outside the future e6 chain.|Secure the king.|Support central dark squares and prepare f8.'),
    branch('Queen to a5: bishop outside the chain',0,10,'Bc4 Bf5 Bd2 e6 Qe2 Bb4 O-O-O Nbd7',
      'Aim at f7 and prepare king safety.|Develop outside the e6 chain.|Break the queen’s pin on c3.|Support central dark squares and open f8.|Connect the pieces and prepare long castling.|Add pressure on c3.|Castle long and activate the d-rook.|Develop and prepare castling; White’s d4 pawn is a space advantage and a target.'),
    branch('Modern: knight recapture',0,3,'Nf6 d4 Nxd5 Nf3 g6 c4 Nb6 Nc3 Bg7',
      'Delay recapturing to avoid queen moves with tempo.|Build the center before returning the pawn.|Recover the pawn with a knight.|Develop and prepare castling.|Prepare the g7 bishop.|Gain space with tempo on the knight.|Retreat while keeping pressure on c4.|Develop and support d5.|Activate the long-diagonal bishop; Black attacks the broad pawn center.'),
    branch('Portuguese Gambit',0,3,'Nf6 d4 Bg4 f3 Bf5 Bb5+ Nbd7 c4 e6',
      'Develop before recapturing the pawn.|Hold the extra pawn and claim central space.|Develop with pressure on d1 along the diagonal.|Block the queen attack and gain time on the bishop.|Retreat while keeping an active diagonal.|Check to disrupt Black’s development.|Block with development and support f6.|Support d5 and gain queenside space.|Challenge d5; Black seeks activity for the pawn while White must finish development.')
  ],
  pirc: [
    branch('150 Attack: queen and bishop battery',0,6,'Be3 c6 Qd2 b5 f3 Bg7 Nge2 O-O',
      'Develop behind the center and prepare Qd2.|Control d5 and prepare queenside expansion.|Connect queen and bishop with a possible Bh6.|Gain space on the queenside.|Defend e4 and restrain ...Ng4.|Complete the fianchetto.|Develop without blocking the f3 pawn.|Castle; White can choose king placement before launching an attack.'),
    branch('Austrian: central counterbreak',1,10,'Bd3 c5 d5 e6 dxe6 Bxe6 O-O Nc6',
      'Develop toward h7 and support e4.|Attack the center before White expands further.|Gain space while closing the g7 diagonal.|Challenge the advanced d5 pawn.|Open the center through an exchange.|Recapture with development and pressure on c4 and d5.|Secure the king before more central action.|Develop with pressure on d4 and e5.'),
    branch('Fianchetto: restrained development',0,6,'g3 Bg7 Bg2 O-O Nge2 e5 O-O Nc6',
      'Prepare the g2 bishop behind the center.|Complete Black’s fianchetto.|Develop and support central squares.|Secure the king before striking the center.|Develop while leaving the f-pawn flexible.|Challenge d4 with a pawn.|Complete king safety.|Pressure d4; White can close with d5 or maintain the tension.'),
    branch('Classical: space-gaining center',0,12,'d5 a5 Be3 Na6 Nd2 Nc5 f3 c6',
      'Close the center and gain space.|Gain queenside room and restrain b4.|Develop behind the central chain.|Route the queen knight toward c5.|Reinforce c4 and prepare a queenside plan.|Occupy c5 and pressure e4.|Support e4 before expanding on the wing.|Prepare to undermine d5; the closed center makes pawn breaks central to both plans.')
  ],
  modern: [
    branch('Averbakh: broad pawn center',0,4,'c4 d6 Nc3 Nf6 Nf3 O-O Be2 e5',
      'Gain more central space before developing the knights.|Prepare a central counterbreak.|Support e4 and d5.|Develop with pressure on e4.|Defend d4 and prepare castling.|Secure the king.|Clear f1 for castling.|Transpose toward a King’s Indian structure by challenging d4.'),
    branch('Three Pawns: Austrian-style space',0,6,'f4 a6 Nf3 b5 Bd3 Bb7 O-O Nd7',
      'Build a broad center but delay king safety.|Prepare queenside expansion.|Develop and reinforce d4.|Gain queenside space.|Develop and reinforce e4.|Pressure e4 from the long diagonal.|Secure the king before central exchanges.|Develop and prepare ...c5 or ...e5 to attack the pawn center.'),
    branch('Gurgenidze: closed central chain',0,6,'f4 c6 Nf3 d5 e5 h5 Bd3 Nh6',
      'Support e5 and gain kingside space.|Prepare ...d5 while retaining the fianchetto.|Develop and reinforce d4.|Challenge e4 with pawn support.|Close the center and gain space.|Restrict a future g4 advance.|Develop toward h7.|Route the knight toward f5; Black must challenge the chain rather than sit behind it.'),
    branch('Queen and bishop attack',1,8,'Qd2 b5 f3 Nd7 O-O-O Bb7 h4 h6',
      'Connect queen and bishop and prepare long castling.|Gain space on the queenside.|Reinforce e4 and restrain ...Ng4.|Develop and prepare a central break.|Castle long, placing the king opposite Black’s queenside pawns.|Add pressure to e4.|Begin kingside expansion with the center supported.|Control g5; Black seeks central or queenside counterplay before the attack arrives.')
  ],
  alekhine: [
    branch('Four Pawns Attack',0,6,'c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 e6',
      'Gain space with tempo on d5.|Retreat while pressuring c4.|Build a four-pawn center at the cost of development time.|Exchange to loosen the pawn center.|Recapture and keep central space.|Develop with pressure on d4.|Defend d4 and develop.|Attack d3 and e4 from outside the pawn chain.|Develop and reinforce d5.|Open f8 and prepare to challenge the advanced center.'),
    branch('Chase Variation',0,4,'c4 Nb6 c5 Nd5 Bc4 e6 Nc3 d6',
      'Advance with tempo on the knight.|Retreat and pressure c4.|Gain more space with another attack on the knight.|Return to d5 where the knight attacks c3 and e3.|Develop with tempo on d5.|Support d5 and open f8.|Develop and increase central control.|Attack the advanced pawn chain; White must justify the time spent on pawn moves.'),
    branch('Modern: early central exchange',0,7,'dxe5 Nxe5 c6 Be2 Bf5 O-O Nd7 Nf3 e6',
      'Exchange the advanced e5 pawn to reduce White’s space.|Recapture centrally with the knight.|Support d5 and restrict White’s pieces.|Prepare castling.|Develop outside the future e6 chain.|Secure the king.|Develop and attack e5.|Retreat the knight to its natural developing square.|Support d5 and open f8 before castling.'),
    branch('Exchange: ...exd6 structure',1,9,'exd6 Nc3 Be7 Bd3 O-O Nge2 Nc6 O-O Bf6',
      'Recapture with the e-pawn to open the e-file and keep c7 flexible.|Develop with control of d5.|Prepare castling.|Aim at h7 and support e4’s neighboring squares.|Secure the king.|Develop without obstructing the d3 bishop.|Pressure d4 with development.|Complete White’s king safety.|Activate the bishop against d4; Black can later challenge the center with ...c5.')
  ],
  'semi-slav': [
    branch('Meran: queenside expansion',0,14,'Bd3 a6 e4 c5 e5 cxd4 Nxb5 axb5 exf6 gxf6',
      'Retreat the bishop while keeping pressure on h7.|Defend b5 and prepare queenside counterplay.|Challenge the center before Black consolidates.|Strike at d4 and open lines for c8.|Gain space with tempo on f6.|Capture d4 with an attack on c3.|Sacrifice the knight temporarily to remove b5.|Accept the knight and open the a-file.|Recover a knight while exposing the kingside pawn structure.|Recapture and open the g-file; the resulting position requires concrete calculation.'),
    branch('Anti-Meran: early ...Bd6',1,9,'Bd6 Bd3 O-O O-O Nbd7 e4 dxe4 Nxe4 Nxe4 Bxe4',
      'Develop the king bishop before the queen knight.|Aim at h7 and support the center.|Secure the king.|Match king safety.|Support f6 and prepare central exchanges.|Open the center with the pieces ready.|Exchange before e5 can gain time.|Recapture with the c3 knight.|Trade the centralized knights.|Recapture with an active bishop; Black can seek ...c5 to free the position.'),
    branch('Botvinnik: pawn sacrifice and counterattack',0,8,'Bg5 dxc4 e4 b5 e5 h6 Bh4 g5 Nxg5 hxg5 Bxg5',
      'Pin f6 while delaying e3.|Accept c4 while the light bishop is outside the chain.|Build a broad center and offer a pawn.|Hold c4 with the b-pawn.|Attack the pinned f6 knight.|Question the bishop before resolving the central threat.|Keep the pin.|Attack the bishop again, accepting king weaknesses.|Sacrifice the knight to open lines.|Accept the sacrifice and open the h-file.|Recapture on g5; White has active bishops and a strong center for the piece, so calculation matters more than a fixed setup.'),
    branch('Moscow: bishop pair for solid structure',0,8,'Bg5 h6 Bxf6 Qxf6 e3 Nd7 Bd3 dxc4 Bxc4 g6',
      'Pin f6 before closing the c1 diagonal.|Ask the bishop to decide.|Give up the bishop pair to remove the f6 knight.|Recapture while defending central squares.|Support d4 and open f1.|Develop and prepare ...e5 or ...c5.|Develop actively and prepare castling.|Resolve the tension and gain time on the bishop.|Recover c4 with development.|Prepare a kingside fianchetto; Black keeps the bishop pair against White’s easy development.')
  ],
  tarrasch: [
    branch('Main line: pressure on the isolated pawn',0,14,'O-O O-O dxc5 Bxc5 Bg5 Be6 Rc1 Bb6',
      'Secure the king before resolving central tension.|Complete Black’s king safety.|Exchange c5 to leave Black an isolated d-pawn.|Recapture with development and pressure on f2.|Pin f6 and increase pressure on d5.|Develop while defending d5.|Use the semi-open c-file to pressure c6.|Retain the bishop and watch d4; Black needs active pieces to offset the d5 target.'),
    branch('Swedish: active c-pawn advance',0,9,'c4 e4 dxe4 Nxe4 Bb4+ Bd2 Bxd2+ Qxd2 Nf6',
      'Advance the c-pawn rather than developing c6.|Challenge d5 and open the center.|Capture e4 before the center advances.|Recapture with the c3 knight.|Check and develop before castling.|Block while developing the c1 bishop.|Exchange the blocking bishop.|Recapture and connect the queenside pieces.|Develop with pressure on e4; the c4 pawn gives space but can become a target.'),
    branch('Symmetrical: early central clarification',0,6,'Nf3 Nc6 e3 Nf6 Bd3 dxc4 Bxc4 cxd4 exd4 Be7',
      'Develop while retaining central tension.|Add pressure on d4.|Support d4 and open f1.|Develop and support d5.|Develop toward h7.|Exchange c4 to draw out the bishop.|Recapture while keeping the e-pawn flexible.|Exchange the remaining central flank pawn.|Recapture into an isolated d-pawn structure.|Prepare castling; White needs piece activity to balance the pawn weakness.'),
    branch('Schara–Hennig Gambit',0,7,'cxd4 Qxd4 Nc6 Qd1 exd5 Qxd5 Be6 Qxd8+ Rxd8',
      'Offer the d5 pawn to open lines and gain development time.|Recover the pawn with the queen.|Develop with tempo on the exposed queen.|Retreat rather than spend more time on queen moves.|Restore the d5 pawn and open the e-file.|Take the pawn, accepting another developing tempo.|Attack the queen while developing.|Exchange queens along the open d-file.|Recapture with the rook; Black’s active pieces are the compensation for the pawn.')
  ],
  chigorin: [
    branch('Early knight exchange: doubled f-pawns',1,6,'cxd5 Bxf3 gxf3 Qxd5 e3 e5 Nc3 Bb4',
      'Exchange in the center before developing the queen knight.|Remove f3 while White must recapture with a pawn.|Accept doubled f-pawns and keep the bishop pair.|Recover the central pawn with the queen.|Support d4 and open f1.|Challenge d4 and open f8.|Develop with tempo on the queen.|Pin the attacking knight; White must unpin before using the apparent queen attack.'),
    branch('Exchange: queen to h5',0,5,'Qxd5 Nf3 Bg4 Nc3 Qh5 e3 O-O-O Be2 e5',
      'Recover the pawn while centralizing the queen.|Develop with central control.|Pin f3 before retreating the queen.|Develop with tempo on d5.|Keep the queen active on the kingside.|Support d4 and open f1.|Castle long and activate the rook on d8.|Unpin f3 and prepare castling.|Challenge d4 with the pieces already active.'),
    branch('Early e3: development before exchanges',0,4,'e3 e5 dxe5 d4 exd4 Qxd4 Nf3 Qxd1+ Kxd1 Bg4',
      'Support d4 and open f1.|Challenge the center while c6 supports e5.|Accept a pawn and open the d-file.|Advance with an attack on the e3 pawn.|Capture the advanced pawn.|Recover the pawn actively with the queen.|Develop with tempo on d4.|Exchange queens before retreating.|Recapture, giving up castling rights in a queenless position.|Develop with a pin; White’s central king is manageable but needs careful piece placement.'),
    branch('Main line: bishop pair and pawn center',1,7,'Bxf3 gxf3 e6 e3 Nf6 Bd3 Bb4 O-O O-O',
      'Give up the light bishop to damage the kingside pawn structure.|Recapture and keep the bishop pair.|Support d5 and open f8.|Support d4 and clear f1.|Develop toward e4.|Develop toward h7 and prepare castling.|Pin c3 while preparing castling.|Remove the pin and secure the king.|Secure Black’s king; White’s bishop pair needs open lines to balance the damaged pawn structure.')
  ],
  trompowsky: [
    branch('...Ne4: bishop on h4',0,4,'Bh4 c5 d5 Qb6 Nd2 Nxd2 Qxd2 Qxb2 Rd1',
      'Keep the bishop active without trading on f6.|Challenge d4 before White consolidates.|Gain central space.|Attack b2 and pressure the queenside.|Develop while offering a pawn for activity.|Exchange the knight to clear b2’s defender.|Recapture and connect the queen with the center.|Accept b2, exposing the queen to attack.|Activate the rook on the open d-file; White needs initiative for the pawn.'),
    branch('...e6: exchange on f6',0,3,'e6 Bxf6 Qxf6 e3 d5 Nf3 Bd6 c4 O-O',
      'Open the queen’s diagonal so a bishop exchange need not double pawns.|Give up the bishop to remove the f6 knight.|Recapture without changing the pawn structure.|Support d4 and open f1.|Establish a central foothold.|Develop and prepare castling.|Aim at h2 and clear f8.|Challenge d5 from the flank.|Secure the king; Black has the bishop pair while White develops easily.'),
    branch('...c5: central pawn advance',0,3,'c5 d5 Ne4 Bf4 Qa5+ c3 d6 Nd2 Nxd2 Qxd2',
      'Challenge d4 immediately.|Gain space and control c6 and e6.|Attack the g5 bishop and occupy e4.|Retreat to an active diagonal.|Check and attack the c3 square.|Block the check and control d4.|Support central squares and open c8.|Develop and challenge e4.|Exchange the advanced knight.|Recapture and prepare e4 or kingside development.'),
    branch('...d5: doubled f-pawns and center',1,6,'c4 c6 Nc3 Be6 e3 Bd6 Bd3 O-O Nge2 Re8',
      'Challenge d5 before playing a fixed setup.|Support d5 with the c-pawn.|Develop and pressure d5.|Develop while reinforcing d5.|Open f1 and reinforce d4.|Aim at h2 and prepare castling.|Develop toward h7.|Secure the king.|Develop without obstructing the f-pawn.|Use the semi-open e-file; White can castle and target Black’s doubled f-pawns later.')
  ],
  colle: [
    branch('Classical: prepared e4 break',0,14,'Re1 Qc7 e4 cxd4 cxd4 dxe4 Nxe4 Nxe4 Bxe4',
      'Support the e4 advance with the rook.|Support e5 and clear d8 for a rook.|Play the central break the setup was built to support.|Exchange on d4 before White gains more space.|Restore the central pawn with the c-pawn.|Remove White’s e4 pawn.|Recapture with the d2 knight.|Exchange the centralized knights.|Recapture actively; the opening setup has turned into open piece play.'),
    branch('Zukertort: knight outpost',1,14,'Ne5 Qc7 f4 b6 Nd2 Bb7 Qf3 Ne7',
      'Occupy e5 with a knight supported by d4.|Pressure e5 and connect the pieces.|Reinforce the e5 outpost and gain kingside space.|Prepare the c8 bishop on b7.|Develop and support e4.|Contest the long diagonal against b2.|Bring the queen toward the kingside while defending e3.|Reroute the c6 knight and prepare to challenge the outpost.'),
    branch('Against an early ...Bf5',0,4,'e3 Bf5 Bd3 Bxd3 Qxd3 e6 O-O c5 b3 Nc6',
      'Support d4 and open f1.|Develop c8 before closing the diagonal.|Challenge Black’s active bishop.|Exchange rather than retreat.|Recapture and develop the queen.|Support d5 and open f8.|Secure the king.|Challenge d4 with the c-pawn.|Prepare the queen bishop on b2.|Pressure d4; White can choose a Zukertort setup rather than force e4.'),
    branch('Against a kingside fianchetto',0,3,'g6 e3 Bg7 Bd3 Nf6 O-O O-O c4 c6 Nc3 dxc4 Bxc4',
      'Prepare the bishop on g7.|Support d4 and open f1.|Develop onto the long diagonal.|Aim at h7 and prepare castling.|Develop and reinforce d5.|Secure the king.|Complete Black’s king safety.|Use the c-pawn actively instead of automatically playing c3.|Support d5 with the c-pawn.|Develop and increase central pressure.|Resolve the tension by taking c4.|Recover the pawn with development; White can support e4 rather than repeat a fixed setup.')
  ],
  'queens-indian': [
    branch('Fianchetto: ...Ba6 bishop pressure',0,7,'Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6 O-O d5',
      'Attack c4 before White completes the fianchetto.|Defend c4 and prepare c1 development.|Check before retreating to e7.|Block with development.|Prepare castling while retaining the a6 bishop’s pressure.|Complete the fianchetto.|Support a central ...d5 break.|Secure the king.|Challenge the center; White must still account for pressure on c4.'),
    branch('Classical: bishop development',0,6,'e3 Bb7 Bd3 d5 O-O Bd6 b3 O-O Bb2 Nbd7',
      'Support d4 and open f1.|Develop with pressure toward e4.|Aim at h7 and prepare castling.|Occupy the center before White plays e4.|Secure the king.|Aim at h2.|Prepare the c1 bishop on b2.|Complete Black’s king safety.|Develop on the long diagonal.|Develop and prepare ...c5 to challenge d4.'),
    branch('Petrosian: queenside space',1,8,'Nc3 d5 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7',
      'Develop after preventing a bishop pin with a3.|Challenge d4.|Exchange to clarify the center.|Recapture and open the e-file.|Pin f6 while developing.|Break the pin and prepare castling.|Support d4 and open f1.|Secure the king.|Develop toward h7.|Support f6 and prepare ...c5; White can expand with b4 when the center is stable.'),
    branch('Fianchetto: central pawn exchange',0,10,'Nc3 Ne4 Qc2 Nxc3 Qxc3 f5 b3 Bf6',
      'Develop and increase central control.|Occupy e4 with support from b7.|Defend c3 and support a queen recapture.|Exchange the c3 knight.|Recapture without doubling the c-pawns.|Support e4 and gain kingside space.|Prepare the c1 bishop on b2.|Pressure d4 from f6; White can complete development before challenging the kingside pawns.')
  ],
  grunfeld: [
    branch('Exchange: classical bishop development',0,12,'Bc4 c5 Ne2 Nc6 Be3 O-O O-O Bg4',
      'Develop toward f7 while retaining Nge2.|Attack the d4 center immediately.|Develop without inviting a pin on f3.|Add pressure on d4.|Reinforce d4 and develop.|Secure the king.|Complete White’s king safety.|Develop with pressure on the e2 knight; Black attacks the center before it advances.'),
    branch('Exchange: king-side knight development',0,14,'Be3 Qa5 Qd2 O-O Rc1 cxd4 cxd4 Qxd2+ Kxd2',
      'Defend d4 and develop the c1 bishop.|Pressure c3 along the diagonal.|Defend c3 and offer a queen exchange.|Secure the king.|Move the rook off the a5-e1 diagonal and support c3.|Exchange to loosen the central chain.|Keep a broad d4/e4 center.|Trade queens before White builds an attack.|Recapture with the king; White’s center grants space while Black seeks active piece targets.'),
    branch('Russian: ...a6 and ...b5',1,10,'Qxc4 O-O e4 a6 Be2 b5 Qb3 c5 dxc5 Be6',
      'Recover c4 with the queen.|Castle before challenging the center.|Build a broad central pawn duo.|Prepare queenside expansion with tempo.|Develop and prepare castling.|Attack the queen and gain space.|Retreat while keeping pressure on the center.|Challenge d4 immediately.|Exchange to change the pawn structure.|Develop with tempo on the queen; White must keep developing while answering the threats.'),
    branch('Fianchetto: central knight exchange',0,6,'Nf3 Bg7 g3 O-O Bg2 dxc4 O-O Nc6 Qa4 Nd5',
      'Develop before committing e4.|Complete the fianchetto.|Prepare a matching long-diagonal bishop.|Secure the king.|Develop and support central squares.|Release central tension and take c4.|Castle before recovering the pawn.|Develop and pressure d4.|Attack c4 and support a queen recapture.|Centralize the f6 knight; the queen must avoid losing time while Black develops.')
  ],
  benoni: [
    branch('Modern main line: knight maneuver',0,14,'Be2 O-O O-O Re8 Nd2 Na6 f3 Nc7',
      'Prepare castling behind the space advantage.|Secure the king.|Complete White’s king safety.|Pressure e4 along the semi-open e-file.|Reroute f3 toward c4 via d2.|Develop toward c7 and b5.|Reinforce e4 and prepare Nc4.|Support ...b5 and put pressure on d5; Black needs a timely queenside break.'),
    branch('Taimanov: check before consolidation',0,12,'f4 Bg7 Bb5+ Nfd7 a4 O-O Nf3 Na6',
      'Gain kingside space and support e5.|Complete the fianchetto.|Check before Black castles.|Block with f6’s knight, leaving b8 available.|Restrain ...b5 before finishing development.|Secure the king.|Develop and reinforce d4’s neighboring squares.|Prepare queenside counterplay with ...Nc7; White can castle before opening the center.'),
    branch('Four Pawns: early e5 break',0,12,'f4 Bg7 e5 dxe5 fxe5 Nfd7 Bb5 O-O e6 fxe6',
      'Support an immediate e5 break.|Develop and prepare castling.|Open the center before Black completes development.|Exchange the advanced pawn.|Restore e5 with tempo on f6.|Retreat and attack e5.|Develop with pressure on d7.|Castle before the center opens further.|Advance with an attack on d7 and f7.|Remove the advanced pawn; the open center demands concrete calculation.'),
    branch('Fianchetto: queenside restraint',1,16,'O-O Re8 a4 Na6 Nd2 Nc7 Nc4 b6',
      'Secure the king behind the fianchetto.|Pressure the central e-file.|Restrain ...b5.|Route the queen knight toward c7.|Prepare the f3 knight for c4.|Support the queenside break and pressure d5.|Occupy c4 and target d6.|Support c5 and prepare the c8 bishop on b7.')
  ],
  benko: [
    branch('Accepted: classical king walk',0,10,'Nc3 d6 e4 Bxf1 Kxf1 g6 Nf3 Bg7 g3 O-O Kg2',
      'Develop and reinforce e4.|Open the f8 bishop’s diagonal.|Build a broad center while allowing a bishop exchange.|Trade the a6 bishop for White’s king bishop.|Recapture, giving up castling rights.|Prepare the g7 bishop.|Develop and support d4’s neighboring squares.|Activate the long diagonal.|Prepare a safe square on g2 for the king.|Secure Black’s king.|Complete the manual king shelter; Black seeks pressure on the a- and b-files for the pawn.'),
    branch('Accepted: fianchetto consolidation',0,16,'Bg2 O-O O-O Nbd7 Qc2 Qa5 Rd1 Rfb8',
      'Complete the fianchetto.|Secure Black’s king.|Complete White’s king safety.|Develop and prepare queenside pressure.|Support e4 and keep the queen off the d-file.|Pressure c3 and prepare rook activity.|Support the advanced d5 pawn.|Use the open b-file; White’s extra pawn must survive the pressure.'),
    branch('Declined: solid e3 center',0,6,'Nf3 g6 e3 Bg7 cxb5 a6 bxa6 Bxa6 Bxa6 Nxa6',
      'Develop before deciding whether to accept the gambit.|Prepare the g7 bishop.|Support d4’s advanced pawn and open f1.|Complete the fianchetto.|Accept the offered pawn after developing.|Offer a second pawn to open queenside files.|Take a6 and clear the a-file.|Recapture with active bishop development.|Exchange the active bishop before it builds pressure.|Develop while recapturing; Black still seeks queenside activity for the pawn.'),
    branch('Declined: early a4 restraint',0,6,'a4 b4 Nd2 e6 e4 exd5 exd5 d6 Bd3 Be7',
      'Challenge b5 rather than accept the pawn.|Gain space and close the queenside temporarily.|Develop behind the c4 pawn, avoiding the b4 pawn’s attack on c3.|Challenge d5 from the center.|Support the advanced d5 pawn.|Exchange to loosen White’s center.|Restore d5 and open f1.|Support c5 and open c8.|Develop toward h7 and prepare king safety.|Prepare castling; Black must find active play against White’s space advantage.')
  ],
  catalan: [
    branch('Closed: central breakthrough',0,10,'Qc2 c6 Nbd2 b6 e4 Bb7 e5 Ne8',
      'Support e4 and keep pressure along the c-file.|Reinforce d5.|Develop and prepare e4.|Prepare the c8 bishop on b7.|Use the center to gain space.|Develop on the long diagonal.|Gain space with tempo on f6.|Retreat and prepare to challenge the pawn chain later with ...c5 or ...f6.'),
    branch('Open: immediate queen recovery',1,10,'Qa4+ Bd7 Qxc4 Bc6 Qc2 Be4 Qb3 Nc6',
      'Check while attacking c4.|Block the check with development.|Recover the pawn with the queen.|Activate the bishop with pressure on g2.|Retreat the queen while defending central squares.|Occupy e4 with the bishop and pressure c2.|Keep the queen active toward b7.|Develop with pressure on d4; White can develop b1 before choosing a central break.'),
    branch('Open: knight pressure on c4',1,12,'Ne5 Nc6 Nxc6 bxc6 Qc2 Rb8 Rd1 Ba6',
      'Centralize with an attack on c4.|Develop and challenge e5.|Exchange to change Black’s pawn structure.|Recapture and open the b-file.|Pressure c4 with the queen.|Use the open b-file against b2.|Pressure the d-file and support d4.|Develop toward e2 and keep pressure on the center; White must recover the pawn without neglecting development.'),
    branch('Early ...Bb4+: bishop exchange',0,6,'Nf3 Bb4+ Bd2 Bxd2+ Qxd2 O-O Bg2 dxc4 Na3 a6',
      'Develop and prepare castling.|Check before the fianchetto is complete.|Block with development.|Exchange the blocking bishop.|Recapture without changing the pawn structure.|Secure Black’s king.|Complete the long-diagonal bishop.|Take c4 and release central tension.|Develop toward c4 to recover the pawn.|Prepare ...b5 while White still needs to castle.')
  ],
  reti: [
    branch('Accepted: recover with the queen',0,3,'dxc4 Qa4+ Nc6 Qxc4 e5 d3 Nf6 g3 Be6 Qa4',
      'Accept the flank pawn and give up the d5 foothold.|Check while attacking c4.|Block the check with development.|Recover the pawn with the queen.|Occupy the center while gaining time for development.|Support e4’s neighboring squares and open c1.|Develop with central control.|Prepare the g2 bishop.|Develop with tempo on the queen.|Retreat to safety; White can finish the fianchetto while challenging Black’s center later.'),
    branch('Double fianchetto: long diagonals',0,12,'Bb2 Bb7 d3 c5 Nbd2 Nbd7 Re1 Rc8',
      'Complete the second fianchetto.|Match the long-diagonal bishop.|Support central light squares and open d2 for the knight.|Challenge the center from the flank.|Develop and prepare e4.|Support f6 and prepare central action.|Support a future e4 advance.|Place the rook on the c-file before exchanges open it.'),
    branch('Against ...Bf5: central challenge',0,3,'c6 g3 Nf6 Bg2 Bf5 O-O e6 b3 Be7 Bb2 O-O',
      'Support d5 with the c-pawn.|Prepare the g2 bishop.|Develop toward e4.|Develop onto the long diagonal.|Activate c8 before playing ...e6.|Secure the king.|Support d5 now that the light bishop is free.|Prepare the second fianchetto.|Prepare castling.|Develop toward e5 and d4.|Secure Black’s king; White can choose d3 and e4 or challenge d5 directly.'),
    branch('Advance: undermine with b4',1,4,'b4 f6 e3 e5 exd4 e4 Qe2 Qe7 Ng1',
      'Gain queenside space and prepare to undermine d4 with a3 or e3.|Support an e5 pawn center.|Challenge the advanced d4 pawn.|Defend d4 and claim more central space.|Remove the d4 pawn to open lines.|Gain time by attacking f3.|Pin e4 to the king so the knight can stay temporarily.|Unpin the pawn and renew the threat against f3.|Retreat the knight; White has opened the center but must catch up in development.')
  ],
  dutch: [
    branch('Classical: flexible e6 center',0,6,'Nf3 Be7 O-O O-O c4 d6 Nc3 Qe8 b3 a5',
      'Develop and prepare castling.|Clear f8 while keeping the d-pawn flexible.|Secure the king.|Complete Black’s king safety.|Challenge the central dark squares.|Prepare a later ...e5 break.|Develop and reinforce e4.|Support ...e5 and keep a queen route toward h5.|Prepare the c1 bishop on b2.|Gain queenside space and restrict b4 before central action.'),
    branch('Stonewall: bishop exchange plan',0,12,'b3 Qe7 Bb2 O-O Qc1 b6 Ba3 Bb7',
      'Prepare the c1 bishop on b2 or a3.|Support e6 and clear d8 for a rook.|Develop on the long diagonal.|Secure Black’s king.|Support a future bishop exchange on a3.|Prepare to activate the restricted c8 bishop.|Offer to trade Black’s active d6 bishop.|Develop the c8 bishop; Black must plan a useful role for it behind the Stonewall.'),
    branch('Leningrad: central space',1,14,'d5 Na6 Rb1 Nc5 b4 Nce4 Nxe4 Nxe4',
      'Gain space while restricting the g7 bishop.|Develop toward c5.|Support queenside expansion.|Occupy c5 and pressure e4.|Gain space with tempo on c5.|Jump to e4 with support from f5.|Exchange the advanced knight.|Recapture with the f6 knight; Black’s active pieces must challenge White’s space.'),
    branch('Staunton Gambit',0,2,'e4 fxe4 Nc3 Nf6 Bg5 g6 f3 exf3 Nxf3 Bg7',
      'Offer a central pawn to speed development.|Accept while opening the f-file.|Develop with pressure on e4.|Defend e4 through development.|Pin f6 and prepare to recover the pawn.|Prepare a kingside fianchetto.|Challenge the extra e4 pawn.|Exchange rather than hold the pawn.|Recapture while developing the king knight.|Complete the fianchetto; White has quick development for the sacrificed pawn.')
  ],
  bird: [
    branch('Stonewall: fixed central chain',0,6,'d4 e6 Bd3 c5 c3 Nc6 O-O Bd6',
      'Build a Stonewall with pawns on d4, e3 and f4.|Support d5 and open f8.|Aim at h7 and prepare castling.|Challenge d4 before the chain becomes secure.|Support d4 with the c-pawn.|Add pressure on d4.|Secure the king.|Aim at h2; White must plan how to develop the restricted c1 bishop.'),
    branch('Leningrad Bird: kingside fianchetto',0,4,'g3 g6 Bg2 Bg7 O-O O-O d3 c5 Nc3 Nc6',
      'Prepare the g2 bishop behind the f-pawn.|Prepare a matching fianchetto.|Develop and support central squares.|Contest the long diagonal.|Secure the king.|Complete Black’s king safety.|Support e4 and open c1.|Gain queenside space and contest d4.|Develop and prepare e4.|Pressure d4; White can seek a central expansion with the king safe.'),
    branch('From Gambit: ...g5 attack',1,7,'g5 d4 g4 Ne5 Bxe5 dxe5 Qxd1+ Kxd1 Nc6',
      'Attack the f3 knight by preparing ...g4.|Occupy the center before retreating.|Drive the knight from f3 and weaken White’s kingside.|Centralize rather than return to g1.|Exchange the centralized knight.|Recapture and open the d-file.|Trade queens with check along the open file.|Recapture, giving up castling rights in a queenless position.|Develop with pressure on e5; White must consolidate the extra pawn and exposed king.'),
    branch('Against the Sicilian-style ...c5',0,1,'c5 Nf3 Nc6 e3 g6 Bb5 Bg7 O-O Nf6 d3 O-O',
      'Contest d4 without occupying d5.|Develop and control h4.|Develop toward d4.|Open f1 and support f4.|Prepare the g7 bishop.|Pressure the c6 knight.|Complete the fianchetto.|Secure the king.|Develop with pressure on e4.|Support e4 and open c1.|Castle; White can prepare a central expansion instead of treating every Bird as a fixed setup.')
  ],
};

export function additionalOpeningLines(id, lines) {
  return (EXTRA_LINES[id] || []).map(({name, base, shared, san, notes}) => ({
    name,
    moves: [...lines[base].moves.slice(0,shared),...san.split(' ')],
    notes: [...lines[base].notes.slice(0,shared),...notes.split('|')]
  }));
}
