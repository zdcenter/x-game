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
	ModeSingle  GameMode = "single"
	ModePkSteal GameMode = "pk_steal"
	ModePkSpeed GameMode = "pk_speed"
	ModePkLocal GameMode = "pk_local"
)

type GameDifficulty string

const (
	DiffBeginner     GameDifficulty = "beginner"
	DiffIntermediate GameDifficulty = "intermediate"
	DiffExpert       GameDifficulty = "expert"
	DiffEasy         GameDifficulty = "easy"
	DiffMedium       GameDifficulty = "medium"
	DiffHard         GameDifficulty = "hard"
	DiffNone         GameDifficulty = "none"
)

type GameStatus string

const (
	StatusWaiting  GameStatus = "waiting"
	StatusStarting GameStatus = "starting"
	StatusPlaying  GameStatus = "playing"
	StatusFinished GameStatus = "finished"
)
