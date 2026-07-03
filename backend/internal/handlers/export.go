package handlers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"time"

	"warehouse-report-monitoring/internal/database"
	minioClient "warehouse-report-monitoring/internal/minio"
	"warehouse-report-monitoring/internal/models"

	"github.com/gin-gonic/gin"
)

type ExportPayload struct {
	ReportName string     `json:"report_name" binding:"required"`
	Filename   string     `json:"filename" binding:"required"`
	Headers    []string   `json:"headers" binding:"required"`
	Rows       [][]string `json:"rows" binding:"required"`
}

func GenerateCSV(c *gin.Context) {
	var payload ExportPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create a new download task in Pending state
	task := models.DownloadTask{
		ReportName:   payload.ReportName,
		Status:       "Pending",
		ErrorMessage: "",
		FileUrl:      "",
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create download task"})
		return
	}

	// Run CSV generation and upload in background
	go processCSVExport(task.ID, payload)

	c.JSON(http.StatusOK, gin.H{
		"message": "Export task created",
		"task_id": task.ID,
	})
}

func processCSVExport(taskID uint, payload ExportPayload) {
	// Retrieve the task
	var task models.DownloadTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		log.Printf("[ExportWorker] Failed to find task %d: %v", taskID, err)
		return
	}

	// Generate CSV in memory
	var buf bytes.Buffer
	// Write UTF-8 BOM
	buf.WriteString("\xEF\xBB\xBF")

	writer := csv.NewWriter(&buf)

	// Write headers
	if err := writer.Write(payload.Headers); err != nil {
		failTask(task, fmt.Sprintf("Failed to write headers: %v", err))
		return
	}

	// Write rows
	for _, row := range payload.Rows {
		if err := writer.Write(row); err != nil {
			failTask(task, fmt.Sprintf("Failed to write row: %v", err))
			return
		}
	}
	writer.Flush()

	if err := writer.Error(); err != nil {
		failTask(task, fmt.Sprintf("CSV flush error: %v", err))
		return
	}

	// Upload to MinIO
	objectKey := fmt.Sprintf("exports/%d_%d_%s", task.ID, time.Now().Unix(), payload.Filename)
	if err := minioClient.UploadFile(objectKey, &buf, int64(buf.Len()), "text/csv;charset=utf-8"); err != nil {
		failTask(task, fmt.Sprintf("Failed to upload to MinIO: %v", err))
		return
	}

	// Get presigned URL (valid for 7 days)
	downloadURL, err := minioClient.GetFileURL(objectKey, fmt.Sprintf("attachment; filename=\"%s\"", payload.Filename), 7*24*time.Hour)
	if err != nil {
		failTask(task, fmt.Sprintf("Failed to generate download URL: %v", err))
		return
	}

	// Update task to Success
	now := time.Now()
	task.Status = "Success"
	task.FileUrl = downloadURL
	task.DownloadTime = models.FlexDate{Time: now, Valid: true}
	database.DB.Save(&task)
	log.Printf("[ExportWorker] Successfully processed task %d", taskID)
}

func failTask(task models.DownloadTask, errMsg string) {
	task.Status = "Failed"
	task.ErrorMessage = errMsg
	database.DB.Save(&task)
	log.Printf("[ExportWorker] Task %d failed: %s", task.ID, errMsg)
}
