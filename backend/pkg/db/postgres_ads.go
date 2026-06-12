package db

import (
	"log"

	"github.com/x-game/backend/internal/domain"
)

func SeedAds() {
	var count int64
	DB.Model(&domain.AdPlacement{}).Count(&count)

	if count > 0 {
		return // Already seeded
	}

	log.Println("Seeding default Ad Placements and Networks...")

	placements := []domain.AdPlacement{
		{
			ID:              "hint_ad",
			Name:            "提示功能广告",
			Desc:            "用户点击提示按钮时弹出的激励视频广告",
			IsEnabled:       true,
			DailyTotalLimit: 5,
			Networks: []domain.AdNetwork{
				{Provider: "google_admob", SlotID: "ca-app-pub-3940256099942544/5224354917", Priority: 1, IsEnabled: true}, // Test rewarded ID
			},
		},
		{
			ID:              "lobby_banner",
			Name:            "大厅顶部横幅",
			Desc:            "游戏大厅界面顶部的横幅广告",
			IsEnabled:       false,
			DailyTotalLimit: -1,
			Networks: []domain.AdNetwork{
				{Provider: "google_admob", SlotID: "ca-app-pub-3940256099942544/6300978111", Priority: 1, IsEnabled: true}, // Test banner ID
			},
		},
		{
			ID:              "interstitial",
			Name:            "游戏结束插屏",
			Desc:            "每玩N局结束时弹出的插屏广告",
			IsEnabled:       true,
			DailyTotalLimit: 10,
			Networks: []domain.AdNetwork{
				{Provider: "google_admob", SlotID: "ca-app-pub-3940256099942544/1033173712", Priority: 1, IsEnabled: true}, // Test interstitial ID
			},
		},
	}

	for _, p := range placements {
		if err := DB.Create(&p).Error; err != nil {
			log.Printf("Failed to seed ad placement %s: %v", p.ID, err)
		}
	}

	// Insert interstitial trigger frequency as a system setting, since it's not a daily limit
	// but a frequency counter (e.g. every 3 games).
	interstitialFreq := domain.SystemSetting{Key: "ad_interstitial_frequency", Value: "3"}
	DB.Where(domain.SystemSetting{Key: interstitialFreq.Key}).FirstOrCreate(&interstitialFreq)

	log.Println("Successfully seeded default Ad Placements")
}
