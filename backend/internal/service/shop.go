package service

import (
	"encoding/json"
	"errors"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type ShopItem struct {
	ID          string `json:"id"`
	Type        string `json:"type"` // "frame" | "title"
	NameKey     string `json:"name_key"`
	DescKey     string `json:"desc_key"`
	Price       int    `json:"price"`
	Icon        string `json:"icon"`
	Rarity      string `json:"rarity"` // "common", "rare", "epic", "legendary"
	Unlocked    bool   `json:"unlocked"`
	Equipped    bool   `json:"equipped"`
	UnlockHint  string `json:"unlock_hint,omitempty"`
}

var CatalogFrames = []ShopItem{
	{ID: "none", Type: "frame", NameKey: "shop.frame_none", DescKey: "shop.frame_none_desc", Price: 0, Icon: "⚪", Rarity: "common"},
	{ID: "frame-flame", Type: "frame", NameKey: "shop.frame_flame", DescKey: "shop.frame_flame_desc", Price: 300, Icon: "🔥", Rarity: "epic", UnlockHint: "14天连胜免费解锁"},
	{ID: "frame-neon", Type: "frame", NameKey: "shop.frame_neon", DescKey: "shop.frame_neon_desc", Price: 500, Icon: "⚡", Rarity: "rare"},
	{ID: "frame-gold", Type: "frame", NameKey: "shop.frame_gold", DescKey: "shop.frame_gold_desc", Price: 800, Icon: "👑", Rarity: "legendary", UnlockHint: "30天连胜免费解锁"},
	{ID: "frame-cosmic", Type: "frame", NameKey: "shop.frame_cosmic", DescKey: "shop.frame_cosmic_desc", Price: 1200, Icon: "🌌", Rarity: "legendary"},
}

var CatalogTitles = []ShopItem{
	{ID: "novice", Type: "title", NameKey: "shop.title_novice", DescKey: "shop.title_novice_desc", Price: 0, Icon: "🌱", Rarity: "common"},
	{ID: "speed_demon", Type: "title", NameKey: "shop.title_speed", DescKey: "shop.title_speed_desc", Price: 200, Icon: "⚡", Rarity: "rare"},
	{ID: "logic_master", Type: "title", NameKey: "shop.title_logic", DescKey: "shop.title_logic_desc", Price: 400, Icon: "🧩", Rarity: "rare"},
	{ID: "persistent", Type: "title", NameKey: "shop.title_persistent", DescKey: "shop.title_persistent_desc", Price: 500, Icon: "📜", Rarity: "epic", UnlockHint: "7天连胜免费解锁"},
	{ID: "streak_king", Type: "title", NameKey: "shop.title_streak_king", DescKey: "shop.title_streak_king_desc", Price: 700, Icon: "🔥", Rarity: "epic"},
	{ID: "puzzle_legend", Type: "title", NameKey: "shop.title_legend", DescKey: "shop.title_legend_desc", Price: 1500, Icon: "👑", Rarity: "legendary", UnlockHint: "30天连胜免费解锁"},
}

type ShopResponse struct {
	BrainCoins     int        `json:"brain_coins"`
	EquippedFrame  string     `json:"equipped_frame"`
	EquippedTitle  string     `json:"equipped_title"`
	Frames         []ShopItem `json:"frames"`
	Titles         []ShopItem `json:"titles"`
}

func parseStringList(data string) []string {
	var list []string
	if data == "" {
		return list
	}
	_ = json.Unmarshal([]byte(data), &list)
	return list
}

func containsString(list []string, target string) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}

// GetShopCatalog returns all cosmetic items with user's unlock/equip state
func GetShopCatalog(userID uint) (*ShopResponse, error) {
	resp := &ShopResponse{
		Frames: make([]ShopItem, len(CatalogFrames)),
		Titles: make([]ShopItem, len(CatalogTitles)),
	}
	copy(resp.Frames, CatalogFrames)
	copy(resp.Titles, CatalogTitles)

	if userID == 0 {
		return resp, nil
	}

	var user domain.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		return nil, err
	}

	resp.BrainCoins = user.BrainCoins
	resp.EquippedFrame = user.EquippedFrame
	resp.EquippedTitle = user.EquippedTitle

	unlockedFrames := parseStringList(user.UnlockedFrames)
	unlockedTitles := parseStringList(user.UnlockedTitles)

	for i := range resp.Frames {
		resp.Frames[i].Unlocked = resp.Frames[i].Price == 0 || containsString(unlockedFrames, resp.Frames[i].ID)
		resp.Frames[i].Equipped = user.EquippedFrame == resp.Frames[i].ID
	}

	for i := range resp.Titles {
		resp.Titles[i].Unlocked = resp.Titles[i].Price == 0 || containsString(unlockedTitles, resp.Titles[i].ID)
		resp.Titles[i].Equipped = user.EquippedTitle == resp.Titles[i].ID
	}

	return resp, nil
}

// BuyShopItem purchases an item using user's brain coins
func BuyShopItem(userID uint, itemID, itemType string) (*domain.User, error) {
	var user domain.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		return nil, err
	}

	if itemType == "frame" {
		unlocked := parseStringList(user.UnlockedFrames)
		if containsString(unlocked, itemID) {
			return nil, errors.New("item already unlocked")
		}
		var targetItem *ShopItem
		for _, f := range CatalogFrames {
			if f.ID == itemID {
				targetItem = &f
				break
			}
		}
		if targetItem == nil {
			return nil, errors.New("item not found")
		}
		if user.BrainCoins < targetItem.Price {
			return nil, errors.New("insufficient brain coins")
		}
		user.BrainCoins -= targetItem.Price
		user.UnlockedFrames = AddUnlockedItem(user.UnlockedFrames, itemID)
		user.EquippedFrame = itemID // auto-equip
	} else if itemType == "title" {
		unlocked := parseStringList(user.UnlockedTitles)
		if containsString(unlocked, itemID) {
			return nil, errors.New("item already unlocked")
		}
		var targetItem *ShopItem
		for _, t := range CatalogTitles {
			if t.ID == itemID {
				targetItem = &t
				break
			}
		}
		if targetItem == nil {
			return nil, errors.New("item not found")
		}
		if user.BrainCoins < targetItem.Price {
			return nil, errors.New("insufficient brain coins")
		}
		user.BrainCoins -= targetItem.Price
		user.UnlockedTitles = AddUnlockedItem(user.UnlockedTitles, itemID)
		user.EquippedTitle = itemID // auto-equip
	} else {
		return nil, errors.New("invalid item type")
	}

	db.DB.Model(&user).Updates(map[string]any{
		"brain_coins":     user.BrainCoins,
		"unlocked_frames": user.UnlockedFrames,
		"unlocked_titles": user.UnlockedTitles,
		"equipped_frame":  user.EquippedFrame,
		"equipped_title":  user.EquippedTitle,
	})

	return &user, nil
}

// EquipShopItem equips an already-unlocked item
func EquipShopItem(userID uint, itemID, itemType string) (*domain.User, error) {
	var user domain.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		return nil, err
	}

	if itemType == "frame" {
		unlocked := parseStringList(user.UnlockedFrames)
		if itemID != "none" && !containsString(unlocked, itemID) {
			return nil, errors.New("item not unlocked yet")
		}
		user.EquippedFrame = itemID
		db.DB.Model(&user).Update("equipped_frame", itemID)
	} else if itemType == "title" {
		unlocked := parseStringList(user.UnlockedTitles)
		if itemID != "novice" && !containsString(unlocked, itemID) {
			return nil, errors.New("item not unlocked yet")
		}
		user.EquippedTitle = itemID
		db.DB.Model(&user).Update("equipped_title", itemID)
	} else {
		return nil, errors.New("invalid item type")
	}

	return &user, nil
}
