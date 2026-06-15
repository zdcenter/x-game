package domain

type GameId string

const (
	GameMinesweeper GameId = "minesweeper"
	GameSudoku      GameId = "sudoku"
	GameSokoban     GameId = "sokoban"
	GameTetris      GameId = "tetris"
	GameGomoku      GameId = "gomoku"
	GameCodebreaker GameId = "codebreaker"
	GameMath24      GameId = "math24"
	GameWatersort   GameId = "watersort"
	GameSliding     GameId = "sliding"
	GameLightsout   GameId = "lightsout"
	GameBlock       GameId = "block"
	GameHexa        GameId = "hexa"
	GameDrop2048    GameId = "drop2048"
)

type GameMode string

const (
	ModeSingle    GameMode = "single"
	ModeSpeed     GameMode = "speed"
	ModeSteal     GameMode = "steal"
	ModeScore     GameMode = "score"
	ModeSameScore GameMode = "same_score"
	ModeBattle    GameMode = "battle"
)

type GameDifficulty string

const (
	DiffEasy   GameDifficulty = "easy"
	DiffMedium GameDifficulty = "medium"
	DiffHard   GameDifficulty = "hard"
	DiffExpert GameDifficulty = "expert"
	DiffMaster GameDifficulty = "master"
	DiffNone   GameDifficulty = "none"
)

type GameStatus string

const (
	StatusWaiting  GameStatus = "waiting"
	StatusStarting GameStatus = "starting"
	StatusPlaying  GameStatus = "playing"
	StatusFinished GameStatus = "finished"
)
