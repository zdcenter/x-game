package service

import (
	"strconv"
	"strings"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// Default economy constants
const (
	DefaultSoloEasyCoins   = 2
	DefaultSoloMediumCoins = 5
	DefaultSoloHardCoins   = 10
	DefaultSoloExpertCoins = 18
	DefaultSoloMasterCoins = 25
	DefaultSoloDefeatCoins = 0
	DefaultPKWinCoins      = 5
	DefaultPKDefeatCoins   = 0
	DefaultCostHint        = 20
	DefaultCostRevive      = 50
	DefaultCostFreeze      = 100
	DefaultDailyCap        = 80
	DefaultRegisterBonus   = 0
)

// Setting keys in database
const (
	KeyCoinsSoloEasy      = "coins.solo_easy"
	KeyCoinsSoloMedium    = "coins.solo_medium"
	KeyCoinsSoloHard      = "coins.solo_hard"
	KeyCoinsSoloExpert    = "coins.solo_expert"
	KeyCoinsSoloMaster    = "coins.solo_master"
	KeyCoinsSoloDefeat    = "coins.solo_defeat"
	KeyCoinsPKWin         = "coins.pk_win"
	KeyCoinsPKDefeat      = "coins.pk_defeat"
	KeyCoinsCostHint      = "coins.cost_hint"
	KeyCoinsCostRevive    = "coins.cost_revive"
	KeyCoinsCostFreeze    = "coins.cost_freeze"
	KeyCoinsDailyCap      = "coins.daily_cap"
	KeyCoinsRegisterBonus = "coins.register_bonus"
)

// AllEconomyKeys lists all keys for public export & seeding
var AllEconomyKeys = []string{
	KeyCoinsSoloEasy,
	KeyCoinsSoloMedium,
	KeyCoinsSoloHard,
	KeyCoinsSoloExpert,
	KeyCoinsSoloMaster,
	KeyCoinsSoloDefeat,
	KeyCoinsPKWin,
	KeyCoinsPKDefeat,
	KeyCoinsCostHint,
	KeyCoinsCostRevive,
	KeyCoinsCostFreeze,
	KeyCoinsDailyCap,
	KeyCoinsRegisterBonus,
}

type EconomyConfig struct {
	SoloEasyCoins   int `json:"solo_easy_coins"`
	SoloMediumCoins int `json:"solo_medium_coins"`
	SoloHardCoins   int `json:"solo_hard_coins"`
	SoloExpertCoins int `json:"solo_expert_coins"`
	SoloMasterCoins int `json:"solo_master_coins"`
	SoloDefeatCoins int `json:"solo_defeat_coins"`
	PKWinCoins      int `json:"pk_win_coins"`
	PKDefeatCoins   int `json:"pk_defeat_coins"`
	CostHint        int `json:"cost_hint"`
	CostRevive      int `json:"cost_revive"`
	CostFreeze      int `json:"cost_freeze"`
	DailyCap        int `json:"daily_cap"`
	RegisterBonus   int `json:"register_bonus"`
}

// GetEconomyConfig retrieves current economy settings from database with fallbacks
func GetEconomyConfig() EconomyConfig {
	cfg := EconomyConfig{
		SoloEasyCoins:   DefaultSoloEasyCoins,
		SoloMediumCoins: DefaultSoloMediumCoins,
		SoloHardCoins:   DefaultSoloHardCoins,
		SoloExpertCoins: DefaultSoloExpertCoins,
		SoloMasterCoins: DefaultSoloMasterCoins,
		SoloDefeatCoins: DefaultSoloDefeatCoins,
		PKWinCoins:      DefaultPKWinCoins,
		PKDefeatCoins:   DefaultPKDefeatCoins,
		CostHint:        DefaultCostHint,
		CostRevive:      DefaultCostRevive,
		CostFreeze:      DefaultCostFreeze,
		DailyCap:        DefaultDailyCap,
		RegisterBonus:   DefaultRegisterBonus,
	}

	var settings []domain.SystemSetting
	if err := db.DB.Where("key IN ?", AllEconomyKeys).Find(&settings).Error; err != nil {
		return cfg
	}

	for _, s := range settings {
		val, err := strconv.Atoi(strings.TrimSpace(s.Value))
		if err != nil || val < 0 {
			continue
		}
		switch s.Key {
		case KeyCoinsSoloEasy:
			cfg.SoloEasyCoins = val
		case KeyCoinsSoloMedium:
			cfg.SoloMediumCoins = val
		case KeyCoinsSoloHard:
			cfg.SoloHardCoins = val
		case KeyCoinsSoloExpert:
			cfg.SoloExpertCoins = val
		case KeyCoinsSoloMaster:
			cfg.SoloMasterCoins = val
		case KeyCoinsSoloDefeat:
			cfg.SoloDefeatCoins = val
		case KeyCoinsPKWin:
			cfg.PKWinCoins = val
		case KeyCoinsPKDefeat:
			cfg.PKDefeatCoins = val
		case KeyCoinsCostHint:
			cfg.CostHint = val
		case KeyCoinsCostRevive:
			cfg.CostRevive = val
		case KeyCoinsCostFreeze:
			cfg.CostFreeze = val
		case KeyCoinsDailyCap:
			cfg.DailyCap = val
		case KeyCoinsRegisterBonus:
			cfg.RegisterBonus = val
		}
	}

	return cfg
}

// CalcRewardCoins calculates coins earned for a game result based on mode, difficulty and win status
func CalcRewardCoins(isPK bool, difficulty string, won bool) int {
	cfg := GetEconomyConfig()
	if !won {
		if isPK {
			return cfg.PKDefeatCoins
		}
		return cfg.SoloDefeatCoins
	}
	if isPK {
		return cfg.PKWinCoins
	}

	diff := strings.ToLower(strings.TrimSpace(difficulty))
	switch diff {
	case "easy":
		return cfg.SoloEasyCoins
	case "medium":
		return cfg.SoloMediumCoins
	case "hard":
		return cfg.SoloHardCoins
	case "expert":
		return cfg.SoloExpertCoins
	case "master":
		return cfg.SoloMasterCoins
	default:
		return cfg.SoloMediumCoins
	}
}

// GetActionCoinCost gets the dynamic cost of an action
func GetActionCoinCost(action string) int {
	cfg := GetEconomyConfig()
	switch action {
	case "hint":
		return cfg.CostHint
	case "revive":
		return cfg.CostRevive
	case "streak_freeze":
		return cfg.CostFreeze
	default:
		return 0
	}
}

// SeedEconomySettings ensures default economy settings exist in the database
func SeedEconomySettings() {
	defaults := map[string]string{
		KeyCoinsSoloEasy:      strconv.Itoa(DefaultSoloEasyCoins),
		KeyCoinsSoloMedium:    strconv.Itoa(DefaultSoloMediumCoins),
		KeyCoinsSoloHard:      strconv.Itoa(DefaultSoloHardCoins),
		KeyCoinsSoloExpert:    strconv.Itoa(DefaultSoloExpertCoins),
		KeyCoinsSoloMaster:    strconv.Itoa(DefaultSoloMasterCoins),
		KeyCoinsSoloDefeat:    strconv.Itoa(DefaultSoloDefeatCoins),
		KeyCoinsPKWin:         strconv.Itoa(DefaultPKWinCoins),
		KeyCoinsPKDefeat:      strconv.Itoa(DefaultPKDefeatCoins),
		KeyCoinsCostHint:      strconv.Itoa(DefaultCostHint),
		KeyCoinsCostRevive:    strconv.Itoa(DefaultCostRevive),
		KeyCoinsCostFreeze:    strconv.Itoa(DefaultCostFreeze),
		KeyCoinsDailyCap:      strconv.Itoa(DefaultDailyCap),
		KeyCoinsRegisterBonus: strconv.Itoa(DefaultRegisterBonus),
	}

	for k, v := range defaults {
		var existing domain.SystemSetting
		if err := db.DB.Where("key = ?", k).First(&existing).Error; err != nil {
			db.DB.Create(&domain.SystemSetting{Key: k, Value: v})
		}
	}
}
