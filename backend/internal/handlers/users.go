package handlers

import (
	"net/http"

	"warehouse-report-monitoring/internal/database"
	"warehouse-report-monitoring/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// isSuperRole checks if the role is supervisor or leader
func isSuperRole(role string) bool {
	return role == "supervisor" || role == "leader"
}

// UserResponse is the public user representation (no password)
type UserResponse struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

// ListUsers returns all users (supervisor/leader only)
func ListUsers(c *gin.Context) {
	role := c.GetString("role")
	if !isSuperRole(role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
		return
	}

	var users []models.User
	if err := database.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var result []UserResponse
	for _, u := range users {
		result = append(result, UserResponse{ID: u.ID, Username: u.Username, Role: u.Role})
	}
	c.JSON(http.StatusOK, result)
}

// CreateUser creates a new user (supervisor/leader only)
func CreateUser(c *gin.Context) {
	role := c.GetString("role")
	if !isSuperRole(role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
		return
	}

	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username, password, dan role wajib diisi"})
		return
	}

	// Check if username already exists
	var existing models.User
	if err := database.DB.Where("username = ?", req.Username).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username sudah digunakan"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hash password"})
		return
	}

	user := models.User{
		Username: req.Username,
		Password: string(hash),
		Role:     req.Role,
	}
	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, UserResponse{ID: user.ID, Username: user.Username, Role: user.Role})
}

// ChangePassword changes a user's password
// - All roles can change their own password
// - Supervisor/leader can change any user's password
func ChangePassword(c *gin.Context) {
	role := c.GetString("role")
	currentUserID := c.GetUint("user_id")
	targetID := c.Param("id")

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru wajib diisi"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	// If changing own password, verify current password
	if user.ID == currentUserID {
		if req.CurrentPassword == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password lama wajib diisi"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Password lama salah"})
			return
		}
	} else {
		// Only supervisor/leader can change other's password
		if !isSuperRole(role) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
			return
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hash password"})
		return
	}

	database.DB.Model(&user).Update("password", string(hash))
	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diubah"})
}

// ChangeRole changes a user's role (supervisor/leader only)
func ChangeRole(c *gin.Context) {
	role := c.GetString("role")
	if !isSuperRole(role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
		return
	}

	targetID := c.Param("id")
	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role wajib diisi"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	database.DB.Model(&user).Update("role", req.Role)
	c.JSON(http.StatusOK, gin.H{"message": "Role berhasil diubah"})
}

// DeleteUser deletes a user (supervisor/leader only, cannot delete self)
func DeleteUser(c *gin.Context) {
	role := c.GetString("role")
	if !isSuperRole(role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
		return
	}

	currentUserID := c.GetUint("user_id")
	targetID := c.Param("id")

	var user models.User
	if err := database.DB.First(&user, targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	if user.ID == currentUserID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak bisa menghapus akun sendiri"})
		return
	}

	database.DB.Unscoped().Delete(&user)
	c.JSON(http.StatusOK, gin.H{"message": "User berhasil dihapus"})
}
