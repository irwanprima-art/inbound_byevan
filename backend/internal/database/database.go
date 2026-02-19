package database

import (
	"fmt"
	"log"
	"os"

	"warehouse-report-monitoring/internal/models"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	driver := getEnv("DB_DRIVER", "sqlite")

	var err error
	if driver == "postgres" {
		host := getEnv("DB_HOST", "localhost")
		port := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "postgres")
		pass := getEnv("DB_PASSWORD", "postgres")
		name := getEnv("DB_NAME", "warehouse_report")

		dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			host, port, user, pass, name)

		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err != nil {
			log.Fatalf("Failed to connect to PostgreSQL: %v", err)
		}
		log.Println("[DB] Connected to PostgreSQL")
	} else {
		dbPath := getEnv("DB_PATH", "./warehouse.db")
		DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err != nil {
			log.Fatalf("Failed to open SQLite: %v", err)
		}
		log.Println("[DB] Connected to SQLite:", dbPath)
	}
}

func AutoMigrate() {
	err := DB.AutoMigrate(
		&models.Arrival{},
		&models.Transaction{},
		&models.Vas{},
		&models.Dcc{},
		&models.Damage{},
		&models.Soh{},
		&models.QcReturn{},
		&models.Location{},
		&models.Attendance{},
		&models.Employee{},
		&models.ProjectProductivity{},
		&models.Unloading{},
		&models.User{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate: %v", err)
	}
	log.Println("[DB] Auto-migration complete")
}

// SeedDefaultUsers creates default accounts if none exist
func SeedDefaultUsers() {
	var count int64
	DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}

	defaults := []struct {
		Username string
		Password string
		Role     string
	}{
		{"supervisor", "super123", "supervisor"},
		{"leader", "leader123", "leader"},
		{"admin.inbound", "inbound123", "admin_inbound"},
		{"admin.inventory", "inventory123", "admin_inventory"},
	}

	for _, d := range defaults {
		hash, _ := bcrypt.GenerateFromPassword([]byte(d.Password), bcrypt.DefaultCost)
		DB.Create(&models.User{
			Username: d.Username,
			Password: string(hash),
			Role:     d.Role,
		})
	}
	log.Println("[DB] Default users seeded")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
