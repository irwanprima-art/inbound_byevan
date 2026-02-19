package handlers

import (
	"net/http"

	"warehouse-report-monitoring/internal/database"
	"warehouse-report-monitoring/internal/middleware"
	"warehouse-report-monitoring/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token    string `json:"token"`
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username dan password wajib diisi"})
		return
	}

	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau password salah"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau password salah"})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token:    token,
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
	})
}

func GetCurrentUser(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"user_id":  c.GetUint("user_id"),
		"username": c.GetString("username"),
		"role":     c.GetString("role"),
	})
}
