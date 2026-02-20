package handlers

import (
	"log"
	"net/http"

	"warehouse-report-monitoring/internal/database"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ResourceHandler provides generic CRUD operations for any GORM model
type ResourceHandler[T any] struct {
	Name string
}

// NewResource creates a new ResourceHandler for a given model type
func NewResource[T any](name string) *ResourceHandler[T] {
	return &ResourceHandler[T]{Name: name}
}

// List returns all records
func (h *ResourceHandler[T]) List(c *gin.Context) {
	var items []T
	if err := database.DB.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// Get returns a single record by ID
func (h *ResourceHandler[T]) Get(c *gin.Context) {
	id := c.Param("id")
	var item T
	if err := database.DB.First(&item, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

// Create creates a new record
func (h *ResourceHandler[T]) Create(c *gin.Context) {
	var item T
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

// Update updates an existing record by ID
func (h *ResourceHandler[T]) Update(c *gin.Context) {
	id := c.Param("id")
	var existing T
	if err := database.DB.First(&existing, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := c.ShouldBindJSON(&existing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Save(&existing).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, existing)
}

// Delete removes a record by ID
func (h *ResourceHandler[T]) Delete(c *gin.Context) {
	id := c.Param("id")
	var item T
	if err := database.DB.Delete(&item, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

// BulkDelete removes multiple records by IDs
func (h *ResourceHandler[T]) BulkDelete(c *gin.Context) {
	var req struct {
		IDs []uint `json:"ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var item T
	if err := database.DB.Delete(&item, req.IDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": len(req.IDs)})
}

// Sync truncates the table and re-inserts all data (for import/full sync)
// REQUIRES "confirm": true in request body to prevent accidental data loss
func (h *ResourceHandler[T]) Sync(c *gin.Context) {
	var req struct {
		Data    []T  `json:"data"`
		Confirm bool `json:"confirm"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !req.Confirm {
		// Count existing records to warn the user
		var existingCount int64
		database.DB.Model(new(T)).Count(&existingCount)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":          "Sync requires confirm: true. This will DELETE all existing data and replace with new data.",
			"existing_count": existingCount,
			"new_count":      len(req.Data),
		})
		return
	}

	// Count existing records for logging
	var existingCount int64
	database.DB.Model(new(T)).Count(&existingCount)
	log.Printf("[SYNC] %s: replacing %d existing records with %d new records (by %s)",
		h.Name, existingCount, len(req.Data), c.GetString("username"))

	// Truncate + re-insert in a transaction
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Delete all existing records (hard delete)
		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(new(T)).Error; err != nil {
			return err
		}
		// Insert all new records
		if len(req.Data) > 0 {
			if err := tx.Create(&req.Data).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[SYNC] %s: completed successfully (%d records)", h.Name, len(req.Data))
	c.JSON(http.StatusOK, gin.H{
		"synced":   len(req.Data),
		"total":    len(req.Data),
		"replaced": existingCount,
	})
}

// BatchImport appends data in batches of 500 (does NOT truncate existing data)
func (h *ResourceHandler[T]) BatchImport(c *gin.Context) {
	var req struct {
		Data []T `json:"data"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Data) == 0 {
		c.JSON(http.StatusOK, gin.H{"imported": 0})
		return
	}

	batchSize := 500
	total := 0

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		for i := 0; i < len(req.Data); i += batchSize {
			end := i + batchSize
			if end > len(req.Data) {
				end = len(req.Data)
			}
			batch := req.Data[i:end]
			if err := tx.Create(&batch).Error; err != nil {
				return err
			}
			total += len(batch)
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"imported": total})
}

// RegisterRoutes registers all CRUD routes for this resource
func (h *ResourceHandler[T]) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("", h.List)
	rg.GET("/:id", h.Get)
	rg.POST("", h.Create)
	rg.PUT("/:id", h.Update)
	rg.DELETE("/:id", h.Delete)
	rg.POST("/bulk-delete", h.BulkDelete)
	rg.POST("/sync", h.Sync)
	rg.POST("/import", h.BatchImport)
}
