package db

import (
	"log"

	"github.com/x-game/backend/internal/domain"
)

func SeedAds() {
	log.Println("Seeding default Ad Placements and Networks...")

	placements := []domain.AdPlacement{
		{
			ID:              "hint_ad",
			Name:            "提示功能广告",
			Desc:            "用户点击提示按钮时弹出的激励视频广告",
			IsEnabled:       true,
			DailyTotalLimit: 5,
			Networks: []domain.AdNetwork{
				{Provider: "google_admob", SlotID: "ca-app-pub-3940256099942544/5224354917", Priority: 1, IsEnabled: true, LimitPerUser: -1},
			},
		},
		{
			ID:              "lobby_banner",
			Name:            "大厅顶部横幅",
			Desc:            "游戏大厅界面顶部的横幅广告",
			IsEnabled:       true,
			DailyTotalLimit: -1,
			Networks: []domain.AdNetwork{
				{Provider: "google_adsense", SlotID: "ca-pub-8428944074138941/7984661759", Priority: 1, IsEnabled: true, LimitPerUser: -1},
			},
		},
		{
			ID:              "interstitial",
			Name:            "游戏结束插屏",
			Desc:            "每玩N局结束时弹出的插屏广告",
			IsEnabled:       true,
			DailyTotalLimit: 10,
			Networks: []domain.AdNetwork{
				{Provider: "google_admob", SlotID: "ca-app-pub-3940256099942544/1033173712", Priority: 1, IsEnabled: true, LimitPerUser: -1},
			},
		},
		{
			ID:              "lobby_bottom",
			Name:            "大厅底部横幅",
			Desc:            "游戏大厅界面底部的横幅广告",
			IsEnabled:       true,
			DailyTotalLimit: -1,
			Networks: []domain.AdNetwork{
				{Provider: "google_adsense", SlotID: "ca-pub-8428944074138941", Priority: 1, IsEnabled: true, LimitPerUser: -1},
			},
		},
		{
			ID:              "sidebar_bottom",
			Name:            "游戏侧边栏广告",
			Desc:            "游戏界面右侧大厅面板底部的横幅广告",
			IsEnabled:       true,
			DailyTotalLimit: -1,
			Networks: []domain.AdNetwork{
				{Provider: "google_adsense", SlotID: "ca-pub-8428944074138941", Priority: 1, IsEnabled: true, LimitPerUser: -1},
			},
		},
		{
			ID:              "result_bottom",
			Name:            "结算界面广告",
			Desc:            "游戏结束结算面板中的横幅广告",
			IsEnabled:       true,
			DailyTotalLimit: -1,
			Networks: []domain.AdNetwork{
				{Provider: "google_adsense", SlotID: "ca-pub-8428944074138941", Priority: 1, IsEnabled: true, LimitPerUser: -1},
			},
		},
	}

	for _, p := range placements {
		var existing domain.AdPlacement
		if err := DB.Where("id = ?", p.ID).First(&existing).Error; err != nil {
			if err := DB.Create(&p).Error; err != nil {
				log.Printf("Failed to seed ad placement %s: %v", p.ID, err)
			}
		}
	}

	// Insert interstitial trigger frequency and other global ad strategies
	strategies := []domain.SystemSetting{
		{Key: "ad_interstitial_frequency", Value: "3"},
		{Key: "ad_min_game_seconds", Value: "30"},
		{Key: "ad_new_user_exemption_hours", Value: "24"},
	}

	for _, s := range strategies {
		DB.Where(domain.SystemSetting{Key: s.Key}).FirstOrCreate(&s)
	}

	log.Println("Successfully seeded default Ad Placements and Strategies")
}
