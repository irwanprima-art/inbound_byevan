package main

import (
	"fmt"
	"warehouse-report-monitoring/internal/database"
	"warehouse-report-monitoring/internal/models"
)

func main() {
	database.InitDB()
	var tasks []models.DownloadTask
	database.DB.Order("id desc").Limit(2).Find(&tasks)
	for _, t := range tasks {
		fmt.Printf("ID: %d\nStatus: %s\nFileUrl: %s\nError: %s\n\n", t.ID, t.Status, t.FileUrl, t.ErrorMessage)
	}
}
