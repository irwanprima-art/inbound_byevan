package handlers

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"warehouse-report-monitoring/internal/database"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

type filteredDeleteTestRecord struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Date     string `json:"date"`
	Name     string `json:"name"`
	Category string `json:"category"`
	Count    int    `json:"count"`
}

func TestBulkDeleteFilteredRequiresAndUsesSupportedFilters(t *testing.T) {
	previousDB := database.DB
	testDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "filtered-delete.db")), &gorm.Config{})
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("get test database connection: %v", err)
	}
	database.DB = testDB
	t.Cleanup(func() {
		database.DB = previousDB
		_ = sqlDB.Close()
	})

	if err := testDB.AutoMigrate(&filteredDeleteTestRecord{}); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}
	if err := testDB.Create(&[]filteredDeleteTestRecord{
		{Date: "2025-01-01", Name: "first", Category: "remove", Count: 1},
		{Date: "2025-01-02", Name: "second", Category: "remove", Count: 2},
		{Date: "2025-01-01", Name: "third", Category: "keep", Count: 3},
	}).Error; err != nil {
		t.Fatalf("seed test records: %v", err)
	}

	handler := NewResource[filteredDeleteTestRecord]("filtered-delete-test")
	response := callFilteredDelete(handler, "/filtered-delete-test?category=remove&dateField=date&startDate=2025-01-01&endDate=2025-01-01&count=1")
	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected unsupported filter to be rejected, got %d: %s", response.Code, response.Body.String())
	}

	response = callFilteredDelete(handler, "/filtered-delete-test")
	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected empty filters to be rejected, got %d: %s", response.Code, response.Body.String())
	}

	response = callFilteredDelete(handler, "/filtered-delete-test?category=remove&dateField=date&startDate=2025-01-01&endDate=2025-01-01")
	if response.Code != http.StatusOK {
		t.Fatalf("expected filtered delete to succeed, got %d: %s", response.Code, response.Body.String())
	}

	var remaining int64
	if err := testDB.Model(&filteredDeleteTestRecord{}).Count(&remaining).Error; err != nil {
		t.Fatalf("count remaining records: %v", err)
	}
	if remaining != 2 {
		t.Fatalf("expected only matching record to be deleted, found %d remaining records", remaining)
	}
}

func callFilteredDelete(handler *ResourceHandler[filteredDeleteTestRecord], url string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	request := httptest.NewRequest(http.MethodPost, url, strings.NewReader(`{"confirm":true}`))
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = request
	handler.BulkDeleteFiltered(ctx)
	return response
}
