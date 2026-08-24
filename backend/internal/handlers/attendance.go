package handlers

import (
	"net/http"
	"strings"

	"warehouse-report-monitoring/internal/database"
	"warehouse-report-monitoring/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ClockAttendanceHandler handles clock in/out kiosk operations with business-rule
// validation. The generic ResourceHandler is intentionally NOT used here because
// clock-in must be rejected when the employee already has an active record
// (clock_in filled, clock_out empty) — "tidak bisa clock in sebelum clock out".
type ClockAttendanceHandler struct{}

// List returns all attendance records (used by the kiosk to detect active records).
func (h *ClockAttendanceHandler) List(c *gin.Context) {
	var items []models.Attendance
	if err := database.DB.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// ClockIn creates a new attendance record (clock in).
// Rejected with 409 Conflict if the employee already has any record that is not
// yet clocked out — regardless of date — so an employee can never clock in twice
// while an active record exists.
func (h *ClockAttendanceHandler) ClockIn(c *gin.Context) {
	var item models.Attendance
	if err := injectUpdatedBy(c, &item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	nik := strings.TrimSpace(item.Nik)
	if nik == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NIK wajib diisi"})
		return
	}

	// Block clock-in when there is any existing active record for this NIK
	// (clock_in filled, clock_out empty) — regardless of date.
	var active models.Attendance
	err := database.DB.
		Where("LOWER(nik) = LOWER(?) AND clock_in <> '' AND (clock_out = '' OR clock_out IS NULL)", nik).
		Order("date DESC, id DESC").
		First(&active).Error
	if err == nil {
		dateStr := active.Date.String()
		if dateStr == "" {
			dateStr = "-"
		}
		c.JSON(http.StatusConflict, gin.H{
			"error": "Karyawan ini belum clock out (record tanggal " + dateStr + "), tidak bisa clock in!",
		})
		return
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

// ClockOut updates an existing attendance record with the clock-out time.
func (h *ClockAttendanceHandler) ClockOut(c *gin.Context) {
	id := c.Param("id")
	var existing models.Attendance
	if err := database.DB.First(&existing, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := injectUpdatedBy(c, &existing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Save(&existing).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, existing)
}
