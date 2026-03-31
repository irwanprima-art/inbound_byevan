package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"warehouse-report-monitoring/internal/database"
	minioClient "warehouse-report-monitoring/internal/minio"
	"warehouse-report-monitoring/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UnboxingHandler struct{}

func NewUnboxingHandler() *UnboxingHandler {
	return &UnboxingHandler{}
}

// List returns all unboxing records
func (h *UnboxingHandler) List(c *gin.Context) {
	var items []models.ReturnUnboxing
	if err := database.DB.Order("created_at DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// Upload handles multipart form: video file + metadata fields
func (h *UnboxingHandler) Upload(c *gin.Context) {
	// Parse form fields
	orderNo := c.PostForm("order_no")
	if orderNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "order_no is required"})
		return
	}
	trackingNo := c.PostForm("tracking_no")
	brand := c.PostForm("brand")
	operator := c.PostForm("operator")
	notes := c.PostForm("notes")
	dateStr := c.PostForm("date")

	// Parse video file
	file, header, err := c.Request.FormFile("video")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "video file is required"})
		return
	}
	defer file.Close()

	// Generate unique object key
	timestamp := time.Now().Format("20060102_150405")
	objectKey := fmt.Sprintf("%s_%s_%s.webm", orderNo, timestamp, header.Filename)

	// Upload to MinIO
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "video/webm"
	}
	if err := minioClient.UploadVideo(objectKey, file, header.Size, contentType); err != nil {
		log.Printf("[Unboxing] Failed to upload video: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload video"})
		return
	}

	// Build date
	var date models.FlexDate
	if dateStr != "" {
		date = models.ParseFlexDate(dateStr)
	} else {
		date = models.ParseFlexDate(time.Now().Format("2006-01-02"))
	}

	// Save record to DB
	username := c.GetString("username")
	record := models.ReturnUnboxing{
		Date:       date,
		OrderNo:    orderNo,
		TrackingNo: trackingNo,
		Brand:      brand,
		Operator:   operator,
		VideoKey:   objectKey,
		Status:     "completed",
		Notes:      notes,
		UpdatedBy:  username,
	}

	if err := database.DB.Create(&record).Error; err != nil {
		// Clean up uploaded video on DB failure
		_ = minioClient.DeleteVideo(objectKey)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[Unboxing] Uploaded video for order %s (key: %s, size: %d bytes, by: %s)",
		orderNo, objectKey, header.Size, username)
	c.JSON(http.StatusCreated, record)
}

// GetVideo returns a presigned URL to stream the video
func (h *UnboxingHandler) GetVideo(c *gin.Context) {
	id := c.Param("id")
	var record models.ReturnUnboxing
	if err := database.DB.First(&record, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if record.VideoKey == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "No video for this record"})
		return
	}

	videoURL, err := minioClient.GetVideoURL(record.VideoKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate video URL"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": videoURL})
}

// Delete removes the record and its video from MinIO
func (h *UnboxingHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	var record models.ReturnUnboxing
	if err := database.DB.First(&record, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Delete video from MinIO
	if record.VideoKey != "" {
		if err := minioClient.DeleteVideo(record.VideoKey); err != nil {
			log.Printf("[Unboxing] Warning: failed to delete video from MinIO: %v", err)
		}
	}

	// Soft-delete record
	if err := database.DB.Delete(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

// RegisterRoutes registers unboxing-specific routes
func (h *UnboxingHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("", h.List)
	rg.POST("/upload", h.Upload)
	rg.GET("/:id/video", h.GetVideo)
	rg.DELETE("/:id", h.Delete)
}
