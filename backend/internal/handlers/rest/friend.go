package rest

import (
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
	"gorm.io/gorm"
)

// SendFriendRequest handles sending a friend request
func SendFriendRequest(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var req struct {
		TargetID uint   `json:"target_id"`
		Username string `json:"username"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	var targetUser domain.User
	if req.TargetID > 0 {
		if err := db.DB.First(&targetUser, req.TargetID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Target user not found"})
		}
	} else if req.Username != "" {
		if err := db.DB.Where("username = ?", req.Username).First(&targetUser).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Target user not found"})
		}
	} else {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Missing target_id or username"})
	}

	if targetUser.ID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot add yourself"})
	}

	// Check if friendship already exists
	var existing domain.Friendship
	err := db.DB.Where(
		"(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		userID, targetUser.ID, targetUser.ID, userID,
	).First(&existing).Error

	if err == nil {
		if existing.Status == domain.FriendshipAccepted {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Already friends"})
		}
		if existing.Status == domain.FriendshipPending {
			if existing.UserID == userID {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Request already sent"})
			}
			// The target user already sent a request to this user. Auto accept.
			existing.Status = domain.FriendshipAccepted
			if err := db.DB.Save(&existing).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
			}
			return c.JSON(fiber.Map{"message": "Friend request accepted", "friendship": existing})
		}
	} else if err != gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}

	// Create new pending friendship
	friendship := domain.Friendship{
		UserID:   userID,
		FriendID: targetUser.ID,
		Status:   domain.FriendshipPending,
	}

	if err := db.DB.Create(&friendship).Error; err != nil {
		log.Printf("Failed to create friendship: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{"message": "Friend request sent", "friendship": friendship})
}

// AcceptFriendRequest handles accepting a friend request
func AcceptFriendRequest(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var req struct {
		TargetID uint `json:"target_id"` // the user who sent the request
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	var friendship domain.Friendship
	if err := db.DB.Where("user_id = ? AND friend_id = ? AND status = ?", req.TargetID, userID, domain.FriendshipPending).First(&friendship).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Friend request not found"})
	}

	friendship.Status = domain.FriendshipAccepted
	if err := db.DB.Save(&friendship).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{"message": "Friend request accepted", "friendship": friendship})
}

// RejectFriendRequest handles rejecting or removing a friend
func RejectFriendRequest(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var req struct {
		TargetID uint `json:"target_id"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Delete friendship from DB
	if err := db.DB.Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		userID, req.TargetID, req.TargetID, userID).Delete(&domain.Friendship{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{"message": "Friend removed/rejected"})
}

// GetFriends returns the user's friend list and pending requests
func GetFriends(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var friendships []domain.Friendship
	if err := db.DB.Preload("User").Preload("Friend").Where("user_id = ? OR friend_id = ?", userID, userID).Find(&friendships).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}

	type FriendResponse struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Avatar   string `json:"avatar"`
		Status   string `json:"status"` // "accepted", "pending_sent", "pending_received"
		IsOnline bool   `json:"is_online"` // to be populated by websocket lobby state later if needed
	}

	var friends []FriendResponse

	for _, f := range friendships {
		if f.Status == domain.FriendshipAccepted {
			if f.UserID == userID {
				friends = append(friends, FriendResponse{ID: f.Friend.ID, Username: f.Friend.Username, Avatar: f.Friend.Avatar, Status: "accepted"})
			} else {
				friends = append(friends, FriendResponse{ID: f.User.ID, Username: f.User.Username, Avatar: f.User.Avatar, Status: "accepted"})
			}
		} else if f.Status == domain.FriendshipPending {
			if f.UserID == userID {
				friends = append(friends, FriendResponse{ID: f.Friend.ID, Username: f.Friend.Username, Avatar: f.Friend.Avatar, Status: "pending_sent"})
			} else {
				friends = append(friends, FriendResponse{ID: f.User.ID, Username: f.User.Username, Avatar: f.User.Avatar, Status: "pending_received"})
			}
		}
	}

	return c.JSON(fiber.Map{"friends": friends})
}
