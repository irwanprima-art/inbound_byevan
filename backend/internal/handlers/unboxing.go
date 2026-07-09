package handlers

import (
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
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
	pageStr := c.Query("page")
	if pageStr == "" {
		var items []models.ReturnUnboxing
		if err := database.DB.Order("created_at DESC").Find(&items).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, items)
		return
	}

	page, _ := strconv.Atoi(pageStr)
	if page < 1 { page = 1 }
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	if pageSize < 1 { pageSize = 50 }

	query := database.DB.Model(&models.ReturnUnboxing{})

	search := c.Query("search")
	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("order_no LIKE ? OR tracking_no LIKE ? OR brand LIKE ?", searchTerm, searchTerm, searchTerm)
	}

	dateField := c.Query("dateField")
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")
	if dateField != "" && startDate != "" && endDate != "" {
		if regexp.MustCompile(`^[a-zA-Z0-9_]+$`).MatchString(dateField) {
			query = query.Where(fmt.Sprintf("%s >= ? AND %s <= ?", dateField, dateField), startDate+" 00:00:00", endDate+" 23:59:59")
		}
	}

	var total int64
	query.Count(&total)

	offset := (page - 1) * pageSize
	var items []models.ReturnUnboxing
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  items,
		"total": total,
	})
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

	// Generate unique object key inside a specific folder structure
	timestamp := time.Now().Format("20060102_150405")
	folderPath := "return documentasi/unboxing/vidio unboxingnya"
	objectKey := fmt.Sprintf("%s/%s_%s_unboxing.webm", folderPath, orderNo, timestamp)

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

	isDownload := c.Query("download") == "true"
	disposition := ""
	if isDownload {
		disposition = fmt.Sprintf("attachment; filename=\"%s_unboxing.webm\"", record.OrderNo)
	}

	videoURL, err := minioClient.GetVideoURL(record.VideoKey, disposition)
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
