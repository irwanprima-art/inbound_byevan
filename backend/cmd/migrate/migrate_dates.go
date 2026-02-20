package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// Supported input formats (same as FlexDate in models package)
var dateFormats = []string{
	"1/2/2006 15:04:05",
	"1/2/2006 15:04",
	"01/02/2006 15:04:05",
	"01/02/2006 15:04",
	"2006-01-02 15:04:05",
	"2006-01-02T15:04:05Z",
	"2006-01-02T15:04:05",
	"2/1/2006 15:04:05",
	"02/01/2006 15:04:05",
	"1/2/2006",
	"01/02/2006",
	"2006-01-02",
	"2/1/2006",
	"02/01/2006",
}

func parseDate(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	for _, fmt := range dateFormats {
		t, err := time.Parse(fmt, s)
		if err == nil {
			if t.Hour() == 0 && t.Minute() == 0 && t.Second() == 0 {
				return t.Format("2006-01-02")
			}
			return t.Format("2006-01-02 15:04:05")
		}
	}
	return "" // unparseable
}

type tableColumn struct {
	Table   string
	Columns []string
}

func main() {
	dbPath := "warehouse.db"
	if len(os.Args) > 1 {
		dbPath = os.Args[1]
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	tables := []tableColumn{
		{"arrivals", []string{"date", "arrival_time"}},
		{"transactions", []string{"date", "time_transaction"}},
		{"vas", []string{"date", "start_time", "end_time"}},
		{"dccs", []string{"date"}},
		{"damages", []string{"date"}},
		{"sohs", []string{"wh_arrival_date", "mfg_date", "exp_date", "update_date"}},
		{"qc_returns", []string{"qc_date", "return_date"}},
		{"attendances", []string{"date"}},
		{"project_productivities", []string{"date"}},
		{"unloadings", []string{"date"}},
	}

	totalUpdated := 0
	totalSkipped := 0

	for _, tc := range tables {
		for _, col := range tc.Columns {
			log.Printf("Processing %s.%s ...", tc.Table, col)

			var rows []struct {
				ID    uint
				Value string
			}

			query := fmt.Sprintf(
				`SELECT id, "%s" as value FROM "%s" WHERE "%s" IS NOT NULL AND "%s" != '' AND deleted_at IS NULL`,
				col, tc.Table, col, col,
			)
			if err := db.Raw(query).Scan(&rows).Error; err != nil {
				log.Printf("  ERROR reading %s.%s: %v", tc.Table, col, err)
				continue
			}

			updated := 0
			skipped := 0
			for _, row := range rows {
				normalized := parseDate(row.Value)
				if normalized == row.Value {
					continue // already normalized
				}
				if normalized == "" {
					log.Printf("  SKIP id=%d value=%q (unparseable)", row.ID, row.Value)
					skipped++
					continue
				}
				updateSQL := fmt.Sprintf(`UPDATE "%s" SET "%s" = ? WHERE id = ?`, tc.Table, col)
				if err := db.Exec(updateSQL, normalized, row.ID).Error; err != nil {
					log.Printf("  ERROR updating id=%d: %v", row.ID, err)
					skipped++
				} else {
					updated++
				}
			}
			log.Printf("  %s.%s: %d rows read, %d updated, %d skipped",
				tc.Table, col, len(rows), updated, skipped)
			totalUpdated += updated
			totalSkipped += skipped
		}
	}

	log.Printf("\n=== MIGRATION COMPLETE ===")
	log.Printf("Total updated: %d", totalUpdated)
	log.Printf("Total skipped: %d", totalSkipped)
}
